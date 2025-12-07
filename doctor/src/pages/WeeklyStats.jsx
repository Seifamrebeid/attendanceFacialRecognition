import { useState, useEffect } from 'react'
import { useCourse } from '../context/CourseContext'
import { onAttendanceByCourse } from '../services/attendanceService'
import { groupByWeek, calculateWeekStats, calculateOverallStats } from '../utils/attendanceUtils'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './WeeklyStats.css'

const WeeklyStats = () => {
  const { selectedCourse } = useCourse()
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [overallStats, setOverallStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCourse) return

    // Subscribe to real-time attendance updates
    const unsubscribe = onAttendanceByCourse(
      selectedCourse.id,
      (records) => {
        setAttendanceRecords(records)
        processWeeklyData(records)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [selectedCourse])

  const processWeeklyData = (records) => {
    const weekGroups = groupByWeek(records)
    const maxStudents = selectedCourse?.maxStudents || 100

    const weekData = []
    for (let week = 1; week <= 16; week++) {
      const weekRecords = weekGroups[week] || []
      const stats = calculateWeekStats(weekRecords, maxStudents)
      weekData.push({
        week: `Week ${week}`,
        weekNumber: week,
        ...stats
      })
    }

    setWeeklyData(weekData)
    setOverallStats(calculateOverallStats(records, maxStudents))
  }

  if (loading) {
    return <div className="loading">Loading statistics...</div>
  }

  return (
    <div className="weekly-stats-container">
      <div className="stats-header">
        <h2>Weekly Statistics</h2>
        <p className="subtitle">Attendance trends and analytics for {selectedCourse?.courseName}</p>
      </div>

      {/* Overall Stats Cards */}
      {overallStats && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{overallStats.totalStudents}</h3>
              <p>Total Students</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{overallStats.attendanceRate}%</h3>
              <p>Attendance Rate</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{overallStats.totalJoins}</h3>
              <p>Total Joins</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>{overallStats.avgSimilarity}%</h3>
              <p>Avg Similarity</p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Rate Trend */}
      <div className="chart-section">
        <h3>Attendance Rate Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="attendanceRate" 
              stroke="#667eea" 
              strokeWidth={2}
              name="Attendance Rate (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Actions Breakdown */}
      <div className="chart-section">
        <h3>Weekly Actions Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="joinCount" fill="#4caf50" name="Joins" />
            <Bar dataKey="leftCount" fill="#ff9800" name="Left" />
            <Bar dataKey="returnedCount" fill="#2196f3" name="Returned" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Data Table */}
      <div className="table-section">
        <h3>Detailed Weekly Breakdown</h3>
        <div className="table-container">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Unique Students</th>
                <th>Attendance Rate</th>
                <th>Joins</th>
                <th>Left</th>
                <th>Returned</th>
                <th>Avg Similarity</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData
                .filter(week => week.totalRecords > 0)
                .map(week => (
                  <tr key={week.weekNumber}>
                    <td>{week.week}</td>
                    <td>{week.uniqueStudents}</td>
                    <td>{week.attendanceRate}%</td>
                    <td>{week.joinCount}</td>
                    <td>{week.leftCount}</td>
                    <td>{week.returnedCount}</td>
                    <td>{week.avgSimilarity}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {weeklyData.filter(w => w.totalRecords > 0).length === 0 && (
          <p className="no-data">No attendance data recorded yet.</p>
        )}
      </div>
    </div>
  )
}

export default WeeklyStats
