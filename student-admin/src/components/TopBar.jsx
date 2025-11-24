function TopBar() {
  const handleLogout = () => {
    // Handle logout
    console.log('Logged out')
  }

  return (
    <div className="top-bar">
      <h1>Attendance Facial Recognition System</h1>
      <div className="user-menu">
        <span>Admin User</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  )
}

export default TopBar
