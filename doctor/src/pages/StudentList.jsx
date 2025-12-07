import { useState, useEffect } from 'react'
import { useCourse } from '../context/CourseContext'
import { onAttendanceByCourse } from '../services/attendanceService'
import { getAllStudents } from '../services/studentsService'
import { getCurrentStudentStatuses, getStudentJoinCounts } from '../utils/attendanceUtils'
import StudentPhoto from '../components/StudentPhoto'
import './StudentList.css'

const StudentList = () => {
  const { selectedCourse } = useCourse()
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [studentStatuses, setStudentStatuses] = useState({})
  const [joinCounts, setJoinCounts] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  useEffect(() => {
    if (!selectedCourse) return

    // Subscribe to real-time attendance updates
    const unsubscribe = onAttendanceByCourse(
      selectedCourse.id,
      (records) => {
        setAttendanceRecords(records)
        setStudentStatuses(getCurrentStudentStatuses(records))
        setJoinCounts(getStudentJoinCounts(records))
      }
    )

    return () => unsubscribe()
  }, [selectedCourse])

  const loadStudents = async () => {
    try {
      const studentsData = await getAllStudents()
      setStudents(studentsData)
    } catch (err) {
      console.error('Error loading students:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (studentName) => {
    const status = studentStatuses[studentName]
    if (!status) return <span className="badge badge-absent">Absent</span>

    switch (status.currentStatus) {
      case 'JOIN':
        return <span className="badge badge-present">Present</span>
      case 'LEFT':
        return <span className="badge badge-left">Left</span>
      case 'RETURNED':
        return <span className="badge badge-returned">Returned</span>
      default:
        return <span className="badge badge-absent">Absent</span>
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="loading">Loading students...</div>
  }

  return (
    <div className="student-list-container">
      <div className="list-header">
        <h2>Student Attendance</h2>
        <p className="subtitle">Real-time attendance tracking for {selectedCourse?.courseName}</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name or student number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="students-grid">
        {filteredStudents.map(student => {
          // Try to match student by name or ID in attendance records
          const matchingKey = Object.keys(studentStatuses).find(key => 
            key.includes(student.name) || key.includes(student.studentNumber)
          )
          const status = matchingKey ? studentStatuses[matchingKey] : null
          const joinCount = matchingKey ? (joinCounts[matchingKey] || 0) : 0

          return (
            <div key={student.studentNumber} className="student-card">
              <div className="student-photo">
                <StudentPhoto photoUrl={student.photoUrl} name={student.name} />
              </div>
              <div className="student-info">
                <h3>{student.name}</h3>
                <p className="student-number">{student.studentNumber}</p>
                <div className="status-row">
                  {getStatusBadge(matchingKey || student.name)}
                </div>
                {status && (
                  <p className="last-seen">Last seen: {status.lastSeen}</p>
                )}
                <div className="attendance-count">
                  <span className="count-label">Attendance:</span>
                  <span className="count-value">{joinCount} {joinCount === 1 ? 'week' : 'weeks'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="no-results">
          {searchTerm ? 'No students found matching your search.' : 'No students enrolled.'}
        </div>
      )}
    </div>
  )
}

export default StudentList
