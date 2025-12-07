import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { CourseProvider, useCourse } from "./context/CourseContext";
import CourseLogin from "./pages/CourseLogin";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/Overview";
import StudentList from "./pages/StudentList";
import WeeklyStats from "./pages/WeeklyStats";
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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="students" element={<StudentList />} />
            <Route path="weekly" element={<WeeklyStats />} />
          </Route>
        </Routes>
      </Router>
    </CourseProvider>
  );
}

export default App;
