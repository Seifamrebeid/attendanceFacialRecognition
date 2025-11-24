function Dashboard() {
  const stats = [
    {
      title: 'Total Students',
      value: '1,245',
      change: '+5.2%',
      className: 'students',
    },
    {
      title: 'Present Today',
      value: '987',
      change: '+12.5%',
      className: 'attendance',
    },
    {
      title: 'Absent Today',
      value: '258',
      change: '-8.3%',
      className: 'reports',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome to the Attendance Facial Recognition System Admin Portal</p>
      </div>

      <div className="grid">
        {stats.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.className}`}>
            <h4>{stat.title}</h4>
            <div className="value">{stat.value}</div>
            <div className="change">{stat.change} from last week</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Recent Activity</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Nov 24, 2025</td>
                <td>System Startup</td>
                <td><span style={{ color: '#28a745' }}>✓ Active</span></td>
              </tr>
              <tr>
                <td>Nov 23, 2025</td>
                <td>Daily Attendance Sync</td>
                <td><span style={{ color: '#28a745' }}>✓ Completed</span></td>
              </tr>
              <tr>
                <td>Nov 22, 2025</td>
                <td>Database Backup</td>
                <td><span style={{ color: '#28a745' }}>✓ Completed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Quick Stats</h3>
          <p>Average Attendance Rate</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#667eea', marginTop: '1rem' }}>
            79.2%
          </div>
        </div>
        <div className="card">
          <h3>System Status</h3>
          <p>All systems operational</p>
          <div style={{ fontSize: '1.2rem', color: '#28a745', marginTop: '1rem' }}>
            🟢 Running Smoothly
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
