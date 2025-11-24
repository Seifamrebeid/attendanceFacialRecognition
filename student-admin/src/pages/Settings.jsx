import { useState } from 'react'

function Settings() {
  const [settings, setSettings] = useState({
    schoolName: 'Attendance Facial Recognition System',
    adminEmail: 'admin@school.edu',
    timezone: 'UTC+2',
    attendanceThreshold: '08:30',
    lateThreshold: '09:00',
    notificationsEnabled: true,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const handleSave = () => {
    alert('Settings saved successfully!')
  }

  return (
    <div>
      <div className="page-header">
        <h2>System Settings</h2>
        <p>Configure system preferences and administration settings</p>
      </div>

      <div className="card">
        <h3>General Settings</h3>

        <div className="form-group">
          <label>School Name</label>
          <input
            type="text"
            name="schoolName"
            value={settings.schoolName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Admin Email</label>
          <input
            type="email"
            name="adminEmail"
            value={settings.adminEmail}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Timezone</label>
          <select name="timezone" value={settings.timezone} onChange={handleChange}>
            <option>UTC+0</option>
            <option>UTC+1</option>
            <option>UTC+2</option>
            <option>UTC+3</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Attendance Settings</h3>

        <div className="form-group">
          <label>Attendance Marking Time</label>
          <input
            type="time"
            name="attendanceThreshold"
            value={settings.attendanceThreshold}
            onChange={handleChange}
          />
          <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
            Students marking attendance after this time will be marked as late
          </small>
        </div>

        <div className="form-group">
          <label>Late Marking Threshold</label>
          <input
            type="time"
            name="lateThreshold"
            value={settings.lateThreshold}
            onChange={handleChange}
          />
          <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
            Students arriving after this time will be marked absent
          </small>
        </div>
      </div>

      <div className="card">
        <h3>Notification Settings</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            name="notificationsEnabled"
            checked={settings.notificationsEnabled}
            onChange={handleChange}
            id="notifications"
          />
          <label htmlFor="notifications" style={{ margin: 0 }}>
            Enable email notifications for attendance alerts
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary">Reset</button>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  )
}

export default Settings
