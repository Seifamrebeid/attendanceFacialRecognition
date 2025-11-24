import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Admin Portal</h2>
      </div>

      <nav className="sidebar-nav">
        <Link
          to="/"
          className={`nav-link ${isActive('/') ? 'active' : ''}`}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Dashboard</span>
        </Link>

        <Link
          to="/students"
          className={`nav-link ${isActive('/students') ? 'active' : ''}`}
        >
          <span className="nav-icon">👥</span>
          <span className="nav-label">Students</span>
        </Link>

        <Link
          to="/attendance"
          className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}
        >
          <span className="nav-icon">✓</span>
          <span className="nav-label">Attendance</span>
        </Link>

        <Link
          to="/reports"
          className={`nav-link ${isActive('/reports') ? 'active' : ''}`}
        >
          <span className="nav-icon">📈</span>
          <span className="nav-label">Reports</span>
        </Link>

        <Link
          to="/settings"
          className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <p>© 2025 Attendance System</p>
      </div>
    </aside>
  )
}

export default Sidebar
