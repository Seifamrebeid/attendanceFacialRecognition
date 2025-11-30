import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '../config/firebase'
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore'

// API base URL - change this to your R API server
const API_BASE_URL = 'http://localhost:8000'

function LiveAttendance() {
  // Course selection state
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(1)
  
  // Auth state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  
  // Attendance state
  const [currentAttendance, setCurrentAttendance] = useState([])
  const [recentlyRecognized, setRecentlyRecognized] = useState(null)
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0 })
  
  // Camera state
  const [isRecording, setIsRecording] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  
  // Loading state
  const [loading, setLoading] = useState(true)
  const [recognizing, setRecognizing] = useState(false)

  // Fetch courses from Firestore
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesRef = collection(db, 'courses')
        const querySnapshot = await getDocs(coursesRef)
        const coursesData = []
        querySnapshot.forEach((doc) => {
          coursesData.push({ id: doc.id, ...doc.data() })
        })
        setCourses(coursesData)
      } catch (err) {
        console.error('Error fetching courses:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [])

  // Real-time attendance listener
  useEffect(() => {
    if (!selectedCourse || !isAuthenticated) return

    const attendanceRef = collection(db, 'attendance')
    const q = query(
      attendanceRef,
      where('courseCode', '==', selectedCourse.courseCode),
      where('weekNumber', '==', selectedWeek),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = []
      let presentCount = 0
      let lateCount = 0
      const seenStudents = new Set()

      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.action === 'JOIN' && !seenStudents.has(data.studentName)) {
          presentCount++
          seenStudents.add(data.studentName)
        }
        if (data.action === 'LATE') lateCount++
        
        records.push({
          id: doc.id,
          studentName: data.studentName || data.name || 'Unknown',
          action: data.action,
          time: data.time,
          timestamp: data.timestamp,
          similarity: data.similarity || 0,
        })
      })

      setCurrentAttendance(records)
      setStats({
        total: seenStudents.size,
        present: presentCount,
        late: lateCount,
      })
    }, (err) => {
      console.error('Error in attendance listener:', err)
    })

    return () => unsubscribe()
  }, [selectedCourse, selectedWeek, isAuthenticated])

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    
    if (!selectedCourse) {
      setAuthError('Please select a course first')
      return
    }

    // Validate against course credentials
    if (
      username === selectedCourse.lecturerUsername &&
      password === selectedCourse.lecturerPassword
    ) {
      setIsAuthenticated(true)
    } else {
      setAuthError('Invalid username or password')
    }
  }

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsRecording(true)
        setCameraError('')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Unable to access camera. Please check permissions.')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsRecording(false)
  }

  // Capture frame and send for recognition
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || recognizing) return

    setRecognizing(true)
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      // Set canvas size to video size
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0)
      
      // Get base64 image
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      
      // Send to R API for recognition
      const response = await fetch(`${API_BASE_URL}/api/recognition/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      })
      
      const result = await response.json()
      
      if (result.success && result.data?.faces?.length > 0) {
        const face = result.data.faces[0]
        
        if (face.recognized && face.name !== 'Unknown') {
          // Show recognized person
          setRecentlyRecognized({
            name: face.name,
            similarity: face.similarity,
            timestamp: new Date().toLocaleTimeString()
          })
          
          // Record attendance
          await fetch(`${API_BASE_URL}/api/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentName: face.name,
              courseId: selectedCourse.id,
              courseCode: selectedCourse.courseCode,
              courseName: selectedCourse.courseName,
              weekNumber: selectedWeek,
              action: 'JOIN',
              similarity: face.similarity
            })
          })
          
          // Clear recently recognized after 3 seconds
          setTimeout(() => setRecentlyRecognized(null), 3000)
        }
      }
    } catch (err) {
      console.error('Recognition error:', err)
    } finally {
      setRecognizing(false)
    }
  }, [recognizing, selectedCourse, selectedWeek])

  // Auto-capture when recording
  useEffect(() => {
    if (!isRecording) return
    
    const interval = setInterval(() => {
      captureAndRecognize()
    }, 2000) // Capture every 2 seconds
    
    return () => clearInterval(interval)
  }, [isRecording, captureAndRecognize])

  // Course selection screen
  if (!isAuthenticated) {
    return (
      <div>
        <div className="page-header">
          <h2>Live Attendance</h2>
          <p>Face recognition attendance system</p>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Start Attendance Session</h3>
          
          {loading ? (
            <p>Loading courses...</p>
          ) : (
            <form onSubmit={handleLogin}>
              {/* Course Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select Course
                </label>
                <select
                  value={selectedCourse?.id || ''}
                  onChange={(e) => {
                    const course = courses.find(c => c.id === e.target.value)
                    setSelectedCourse(course)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                  }}
                  required
                >
                  <option value="">-- Select a course --</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.courseCode} - {course.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Week Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Week Number
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                  }}
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>

              {/* Username */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Lecturer Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                  }}
                  placeholder="Enter username"
                  required
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                  }}
                  placeholder="Enter password"
                  required
                />
              </div>

              {authError && (
                <div style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                Start Attendance Session
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Main attendance interface
  return (
    <div>
      <div className="page-header">
        <h2>Live Attendance - {selectedCourse?.courseCode}</h2>
        <p>{selectedCourse?.courseName} | Week {selectedWeek} | Lecturer: {selectedCourse?.lecturerName}</p>
      </div>

      {/* Stats cards */}
      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card attendance">
          <h4>Total Present</h4>
          <div className="value" style={{ color: '#28a745' }}>{stats.present}</div>
        </div>
        <div className="stat-card">
          <h4>Late Arrivals</h4>
          <div className="value" style={{ color: '#ffc107' }}>{stats.late}</div>
        </div>
        <div className="stat-card">
          <h4>Recording Status</h4>
          <div className="value" style={{ color: isRecording ? '#28a745' : '#dc3545' }}>
            {isRecording ? '● LIVE' : '○ STOPPED'}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Camera section */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Camera Feed</h3>
          
          {cameraError && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}>
              {cameraError}
            </div>
          )}

          <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '1rem',
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: 'auto',
                display: isRecording ? 'block' : 'none',
              }}
            />
            {!isRecording && (
              <div style={{
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
              }}>
                Camera is off
              </div>
            )}
            
            {/* Recognition indicator */}
            {recognizing && (
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 0, 0.9)',
                color: '#000',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}>
                🔍 Recognizing...
              </div>
            )}
            
            {/* Recently recognized */}
            {recentlyRecognized && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                right: '10px',
                backgroundColor: 'rgba(40, 167, 69, 0.95)',
                color: 'white',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  ✓ {recentlyRecognized.name}
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  Recorded at {recentlyRecognized.timestamp} | {(recentlyRecognized.similarity * 100).toFixed(1)}% match
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Camera controls */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {!isRecording ? (
              <button
                onClick={startCamera}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                ▶ Start Camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                ■ Stop Camera
              </button>
            )}
            
            <button
              onClick={() => {
                stopCamera()
                setIsAuthenticated(false)
                setUsername('')
                setPassword('')
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              End Session
            </button>
          </div>
        </div>

        {/* Attendance list section */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>
            Current Attendance ({currentAttendance.length} records)
          </h3>
          
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {currentAttendance.length > 0 ? (
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAttendance.map((record) => (
                    <tr key={record.id} style={{
                      backgroundColor: record.action === 'JOIN' ? '#d4edda' : 
                                      record.action === 'LEFT' ? '#f8d7da' : 'transparent'
                    }}>
                      <td style={{ padding: '0.5rem' }}>
                        {record.studentName}
                        {record.action === 'LEFT' && <span style={{ color: '#dc3545' }}> (Left)</span>}
                      </td>
                      <td style={{ padding: '0.5rem' }}>{record.time}</td>
                      <td style={{ padding: '0.5rem' }}>
                        {(record.similarity * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666',
              }}>
                No attendance records yet. Start the camera to begin scanning.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveAttendance
