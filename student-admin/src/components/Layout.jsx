import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './Layout.css'

function Layout() {
  return (
    <div className="admin-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
