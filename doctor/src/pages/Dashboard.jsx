import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useCourse } from "../context/CourseContext";
import "./Dashboard.css";

const Dashboard = () => {
  const { selectedCourse, lecturerName, logout } = useCourse();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img
            src="/aast_logo.png"
            alt="AAST"
            style={{ height: 45, marginRight: 15, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          />
          <h1>Attendance Dashboard</h1>
          <div className="course-info">
            <span className="course-code">{selectedCourse?.courseCode}</span>
            <span className="course-name">{selectedCourse?.courseName}</span>
          </div>
        </div>
        <div className="header-right">
          <span className="lecturer-name">👤 {lecturerName}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <Link
          to="/dashboard"
          className={isActive("/dashboard") ? "nav-link active" : "nav-link"}
        >
          Overview
        </Link>
        <Link
          to="/dashboard/students"
          className={
            isActive("/dashboard/students") ? "nav-link active" : "nav-link"
          }
        >
          Students
        </Link>
        <Link
          to="/dashboard/weekly"
          className={
            isActive("/dashboard/weekly") ? "nav-link active" : "nav-link"
          }
        >
          Weekly Stats
        </Link>
        <Link
          to="/dashboard/attendance"
          className={
            isActive("/dashboard/attendance") ? "nav-link active" : "nav-link"
          }
        >
          Attendance
        </Link>
        <Link
          to="/dashboard/reports"
          className={
            isActive("/dashboard/reports") ? "nav-link active" : "nav-link"
          }
        >
          Reports
        </Link>
        <Link
          to="/dashboard/warnings"
          className={
            isActive("/dashboard/warnings") ? "nav-link active" : "nav-link"
          }
        >
          Warnings
        </Link>
        <Link
          to="/dashboard/analytics"
          className={
            isActive("/dashboard/analytics") ? "nav-link active" : "nav-link"
          }
        >
          📈 Student Performance
        </Link>
      </nav>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;
