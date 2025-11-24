import { useState, useEffect } from 'react'
import { db } from '../config/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

function Attendance() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [attendanceData, setAttendanceData] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch attendance data from Firebase
  useEffect(() => {
    const fetchAttendanceData = async () => {
      setLoading(true)
      setError(null)
      try {
        const attendanceRef = collection(db, 'attendance')
        const q = query(attendanceRef, where('date', '==', selectedDate))
        const querySnapshot = await getDocs(q)

        const records = []
        let presentCount = 0
        let absentCount = 0
        let lateCount = 0

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const time = data.time || '-'
          let status = 'Absent'

          // Determine status based on action field
          if (data.action === 'JOIN') {
            status = 'Present'
            presentCount++
          } else if (data.action === 'LATE') {
            status = 'Late'
            lateCount++
          } else {
            absentCount++
          }

          records.push({
            id: doc.id,
            name: data.name || 'Unknown',
            enrollmentId: data.session_id || '-',
            class: '-',
            status: status,
            time: time,
            similarity: data.similarity || 0,
            timestamp: data.timestamp || data.created_at,
          })
        })

        // Sort by time
        records.sort((a, b) => {
          if (a.time === '-') return 1
          if (b.time === '-') return -1
          return a.time.localeCompare(b.time)
        })

        setAttendanceData(records)
        setStats({
          total: records.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
        })
      } catch (err) {
        console.error('Error fetching attendance:', err)
        setError('Failed to load attendance data. Please check your Firebase connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchAttendanceData()
  }, [selectedDate])

  return (
    <div>
      <div className="page-header">
        <h2>Attendance Records</h2>
        <p>View and manage daily attendance</p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          border: '1px solid #f5c6cb',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className="grid">
        <div className="stat-card attendance">
          <h4>Present</h4>
          <div className="value" style={{ color: '#28a745' }}>{stats.present}</div>
        </div>
        <div className="stat-card">
          <h4>Absent</h4>
          <div className="value" style={{ color: '#dc3545' }}>{stats.absent}</div>
        </div>
        <div className="stat-card">
          <h4>Late</h4>
          <div className="value" style={{ color: '#ffc107' }}>{stats.late}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '0.9rem',
              maxWidth: '200px',
            }}
            disabled={loading}
          />
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#666',
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Loading attendance records...</p>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Session ID</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Similarity Score</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.length > 0 ? (
                  attendanceData.map((record) => (
                    <tr key={record.id}>
                      <td>{record.name}</td>
                      <td>{record.enrollmentId}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.3rem 0.8rem',
                            borderRadius: '4px',
                            backgroundColor:
                              record.status === 'Present'
                                ? '#d4edda'
                                : record.status === 'Absent'
                                  ? '#f8d7da'
                                  : '#fff3cd',
                            color:
                              record.status === 'Present'
                                ? '#155724'
                                : record.status === 'Absent'
                                  ? '#721c24'
                                  : '#856404',
                            fontWeight: '500',
                          }}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td>{record.time}</td>
                      <td>{(record.similarity * 100).toFixed(2)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                      No attendance records found for {selectedDate}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Attendance
