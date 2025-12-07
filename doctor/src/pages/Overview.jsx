import { useCourse } from '../context/CourseContext'
import { useState, useEffect } from 'react'
import { onAttendanceByCourse } from '../services/attendanceService'
import { calculateOverallStats } from '../utils/attendanceUtils'
import './Overview.css'

const Overview = () => {
  const { selectedCourse } = useCourse()
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [overallStats, setOverallStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    if (!selectedCourse) return

    const unsubscribe = onAttendanceByCourse(
      selectedCourse.id,
      (records) => {
        setAttendanceRecords(records)
        const maxStudents = selectedCourse?.maxStudents || 100
        setOverallStats(calculateOverallStats(records, maxStudents))
        setRecentActivity(records.slice(0, 10))
      }
    )

    return () => unsubscribe()
  }, [selectedCourse])

  const getActionBadge = (action) => {
    const badges = {
      JOIN: <span className="action-badge join">JOIN</span>,
      LEFT: <span className="action-badge left">LEFT</span>,
      RETURNED: <span className="action-badge returned">RETURNED</span>
    }
    return badges[action] || <span className="action-badge">{action}</span>
  }

  const formatStudentName = (fullName) => {
    // Split name at the last underscore to separate name from ID
    const lastUnderscoreIndex = fullName.lastIndexOf('_')
    if (lastUnderscoreIndex === -1) return { name: fullName, id: '' }
    
    const name = fullName.substring(0, lastUnderscoreIndex).replace(/_/g, ' ')
    const id = fullName.substring(lastUnderscoreIndex + 1)
    
    return { name, id }
  }

  return (
    <div className="overview-container">
      <div className="overview-header">
        <h2>Course Overview</h2>
        <p className="subtitle">Real-time monitoring dashboard</p>
      </div>

      {/* Course Info */}
      <div className="course-details-card">
        <h3>📚 Course Information</h3>
        <div className="course-details">
          <div className="detail-row">
            <span className="label">Course Code:</span>
            <span className="value">{selectedCourse?.courseCode}</span>
          </div>
          <div className="detail-row">
            <span className="label">Course Name:</span>
            <span className="value">{selectedCourse?.courseName}</span>
          </div>
          <div className="detail-row">
            <span className="label">Lecturer:</span>
            <span className="value">{selectedCourse?.lecturerName}</span>
          </div>
          <div className="detail-row">
            <span className="label">Department:</span>
            <span className="value">{selectedCourse?.department || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Semester:</span>
            <span className="value">{selectedCourse?.semester || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Schedule:</span>
            <span className="value">{selectedCourse?.schedule || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      {overallStats && (
        <div className="overview-stats">
          <div className="overview-stat-card">
            <div className="stat-icon">👥</div>
            <div>
              <h3>{overallStats.totalStudents}</h3>
              <p>Unique Students</p>
            </div>
          </div>
          <div className="overview-stat-card">
            <div className="stat-icon">📊</div>
            <div>
              <h3>{overallStats.attendanceRate}%</h3>
              <p>Attendance Rate</p>
            </div>
          </div>
          <div className="overview-stat-card">
            <div className="stat-icon">📝</div>
            <div>
              <h3>{overallStats.totalRecords}</h3>
              <p>Total Records</p>
            </div>
          </div>
          <div className="overview-stat-card">
            <div className="stat-icon">✅</div>
            <div>
              <h3>{overallStats.totalJoins}</h3>
              <p>Total Joins</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="recent-activity-card">
        <h3>🕒 Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.map((record, index) => {
              const { name, id } = formatStudentName(record.studentName)
              return (
                <div key={index} className="activity-item">
                  <div className="activity-left">
                    <div className="student-info-activity">
                      <span className="student-name">{name}</span>
                      <span className="student-id">{id}</span>
                    </div>
                    {getActionBadge(record.action)}
                  </div>
                  <div className="activity-right">
                    <span className="activity-time">
                      {new Date(record.timestamp || record.createdAt).toLocaleString()}
                    </span>
                    <span className="activity-week">Week {record.weekNumber}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="no-activity">No activity recorded yet.</p>
        )}
      </div>
    </div>
  )
}

export default Overview
