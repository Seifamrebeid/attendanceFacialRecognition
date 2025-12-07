import { useState, useEffect } from 'react'
import { getAllCourses, validateLecturerCredentials } from '../services/coursesService'
import { useNavigate } from 'react-router-dom'
import { useCourse } from '../context/CourseContext'
import './CourseLogin.css'

const CourseLogin = () => {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useCourse()

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const coursesData = await getAllCourses()
      setCourses(coursesData)
      if (coursesData.length > 0) {
        setSelectedCourseId(coursesData[0].id)
      }
    } catch (err) {
      setError('Failed to load courses')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')

    const course = courses.find(c => c.id === selectedCourseId)
    if (!course) {
      setError('Please select a course')
      return
    }

    if (!validateLecturerCredentials(course, username, password)) {
      setError('Invalid username or password for this course')
      return
    }

    login(course, course.lecturerName)
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="login-container">
        <div className="loading">Loading courses...</div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>📊 Attendance Dashboard</h1>
          <p>Lecturer Login</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="course">Select Course</label>
            <select
              id="course"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              required
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.courseCode} - {course.courseName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter lecturer username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            Login
          </button>
        </form>

        {courses.length === 0 && (
          <div className="info-message">
            No courses found. Please add courses in Firestore.
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseLogin
