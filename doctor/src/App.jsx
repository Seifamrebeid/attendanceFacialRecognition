import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { CourseProvider, useCourse } from "./context/CourseContext";
import CourseLogin from "./pages/CourseLogin";
import Dashboard from "./pages/Dashboard";
import OverviewNew from "./pages/OverviewNew";
import StudentList from "./pages/StudentList";
import WeeklyStats from "./pages/WeeklyStats";
import AttendancePage from "./pages/AttendancePage";
import ReportsPage from "./pages/ReportsPage";
import WarningsPage from "./pages/WarningsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DebugPage from "./pages/DebugPage";
import "./App.css";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useCourse();
  return isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  return (
    <CourseProvider>
      <Router>
        <Routes>
          <Route path="/" element={<CourseLogin />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewNew />} />
            <Route path="students" element={<StudentList />} />
            <Route path="weekly" element={<WeeklyStats />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="warnings" element={<WarningsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </Router>
    </CourseProvider>
  );
}

export default App;
