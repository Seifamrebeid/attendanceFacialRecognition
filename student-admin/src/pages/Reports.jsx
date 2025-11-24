function Reports() {
  const reportsList = [
    {
      id: 1,
      name: 'Monthly Attendance Report',
      date: 'Nov 24, 2025',
      type: 'PDF',
      status: 'Ready',
    },
    {
      id: 2,
      name: 'Class Performance Summary',
      date: 'Nov 23, 2025',
      type: 'Excel',
      status: 'Ready',
    },
    {
      id: 3,
      name: 'Student Attendance Analysis',
      date: 'Nov 22, 2025',
      type: 'PDF',
      status: 'Ready',
    },
    {
      id: 4,
      name: 'Facial Recognition Accuracy Report',
      date: 'Nov 20, 2025',
      type: 'Excel',
      status: 'Ready',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h2>Reports</h2>
        <p>Generate and download attendance reports</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Generate New Report</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label>Report Type</label>
            <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #dee2e6', borderRadius: '4px' }}>
              <option>Monthly Attendance</option>
              <option>Class Performance</option>
              <option>Student Analysis</option>
              <option>System Statistics</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date Range</label>
            <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #dee2e6', borderRadius: '4px' }}>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This month</option>
              <option>Custom range</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Reports</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Type</th>
                <th>Generated Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportsList.map((report) => (
                <tr key={report.id}>
                  <td>{report.name}</td>
                  <td>{report.type}</td>
                  <td>{report.date}</td>
                  <td>
                    <span style={{ color: '#28a745', fontWeight: '500' }}>
                      ✓ {report.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm" style={{ marginRight: '0.5rem' }}>
                      Download
                    </button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports
