import React, { useState, useEffect } from "react";
import { useCourse } from "../context/CourseContext";
import { getAttendanceByCourse } from "../services/attendanceService";
import {
  analyzeStudent,
  calculateCourseHealth,
  analyzeTrends,
} from "../services/statisticsService";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  LinearProgress,
  Divider,
} from "@mui/material";
import {
  TrendingUp,
  Warning,
  CheckCircle,
  People,
  BarChart as BarChartIcon,
  Whatshot,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

const OverviewNew = () => {
  const { selectedCourse } = useCourse();
  const [loading, setLoading] = useState(true);
  const [courseHealth, setCourseHealth] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedCourse?.id) return;

    loadData();
  }, [selectedCourse]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Loading attendance for course:", selectedCourse.id);
      const records = await getAttendanceByCourse(selectedCourse.id);

      console.log("Got records:", records.length);
      setAttendanceRecords(records);

      if (records.length === 0) {
        setCourseHealth({
          healthScore: 0,
          avgAttendance: 0,
          avgEarlyLeave: 0,
          avgSimilarity: 0,
          highRiskCount: 0,
        });
        setStudents([]);
        return;
      }

      // Calculate max week
      const maxWeek = Math.max(...records.map((r) => r.weekNumber || 1));

      // Get unique students
      const studentMap = new Map();
      records.forEach((r) => {
        if (!studentMap.has(r.studentName)) {
          studentMap.set(r.studentName, {
            id: r.studentName,
            name: formatName(r.studentName),
          });
        }
      });

      // Analyze each student
      const studentStats = Array.from(studentMap.values()).map((s) =>
        analyzeStudent(s.id, s.name, records, maxWeek)
      );

      // Calculate health
      const health = calculateCourseHealth(studentStats);
      setCourseHealth(health);
      setStudents(studentStats);

      console.log("Analysis complete:", health);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load attendance data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatName = (fullName) => {
    if (!fullName) return "Unknown";
    const parts = fullName.split("_");
    if (parts.length > 1) {
      return parts.slice(0, -1).join(" ");
    }
    return fullName;
  };

  const atRiskStudents = students
    .filter((s) => (s.riskLevel === "High" || s.riskLevel === "Medium") && s.name !== "Unknown")
    .sort((a, b) => a.aqi - b.aqi)
    .slice(0, 5);

  const sortedByRate = [...students].sort((a, b) => b.attendanceRate - a.attendanceRate);
  const bestStudent = sortedByRate[0];
  const worstStudent = sortedByRate[sortedByRate.length - 1];

  // Logic for Class Intelligence
  const trends = analyzeTrends(attendanceRecords);
  // Filter out weeks with 0 attendance (likely future or malformed data)
  const activeWeeks = trends.filter(t => t.Attendance > 0);
  const sortedWeeks = [...activeWeeks].sort((a, b) => b.Attendance - a.Attendance);
  const bestWeek = sortedWeeks[0];
  const worstWeek = sortedWeeks[sortedWeeks.length - 1];

  // Sort by attendance rate for the chart (Best Performers)
  const chartData = [...students]
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 10)
    .map((s) => ({
      name: s.name.split(" ")[0],
      attendance: s.attendanceRate,
    }));

  const categoryData = [
    {
      name: "Excellent",
      value: students.filter((s) => s.attendanceRate >= 90).length,
    },
    {
      name: "Good",
      value: students.filter(
        (s) => s.attendanceRate >= 75 && s.attendanceRate < 90
      ).length,
    },
    {
      name: "At Risk",
      value: students.filter((s) => s.attendanceRate < 75).length,
    },
  ];

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Background Watermark */}
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.05,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <img src="/aast_logo.png" alt="" style={{ width: '400px', maxWidth: '50vw' }} />
      </Box>

      {/* Header */}
      <Box mb={4} display="flex" alignItems="center" gap={3} sx={{ position: 'relative', zIndex: 1 }}>
        <img
          src="/aast_logo.png"
          alt="AAST"
          style={{ height: 60, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
        />
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Dashboard Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {selectedCourse?.courseName || "Course"} ({selectedCourse?.courseCode || "N/A"})
          </Typography>
        </Box>
      </Box>

      {/* KPI Cards */}
      {courseHealth && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.3)", width: 50, height: 50 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {Math.round(courseHealth.avgAttendance)}%
                  </Typography>
                  <Typography variant="caption">Avg Attendance</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>



          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.3)", width: 50, height: 50 }}>
                  <People />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {students.length}
                  </Typography>
                  <Typography variant="caption">Total Students</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                color: "white",
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.3)", width: 50, height: 50 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {Math.round(courseHealth.avgSimilarity * 100)}%
                  </Typography>
                  <Typography variant="caption">Biometric Trust</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Performance Highlights (New Section) */}
      {students.length > 0 && (
        <Grid container spacing={3} mb={4}>
          {/* Best Student */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #10b981' }}>
              <Avatar sx={{ bgcolor: '#d1fae5', color: '#10b981' }}><TrendingUp /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">Best Attendance</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {bestStudent?.name || 'N/A'}
                </Typography>
                <Typography variant="body2" color="success.main" fontWeight="bold">
                  {bestStudent?.attendanceRate}% Rate
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Worst Student */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #ef4444' }}>
              <Avatar sx={{ bgcolor: '#fee2e2', color: '#ef4444' }}><Warning /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">Needs Attention</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {worstStudent?.name || 'N/A'}
                </Typography>
                <Typography variant="body2" color="error.main" fontWeight="bold">
                  {worstStudent?.attendanceRate}% Rate
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Course Rate */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #3b82f6' }}>
              <Avatar sx={{ bgcolor: '#dbeafe', color: '#3b82f6' }}><People /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">Whole Course Rate</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {Math.round(courseHealth?.avgAttendance || 0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Class Average
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Class Intelligence */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '6px solid #8b5cf6' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="#7c3aed">
              🟣 Class-Level Intelligence (Doctor View)
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={6} md={3}>
                <Typography variant="overline" color="text.secondary">Highest Presence</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {bestWeek?.name || 'N/A'}
                </Typography>
                <Typography variant="body2">{bestWeek?.Attendance || 0} Students</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="overline" color="text.secondary">Lowest Presence</Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {worstWeek?.name || 'N/A'}
                </Typography>
                <Typography variant="body2">{worstWeek?.Attendance || 0} Students</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box bgcolor="#f5f3ff" p={2} borderRadius={2}>
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    💡 Insight: Correlate these peaks with exam dates or difficult topics.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        {/* Attendance Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
              <BarChartIcon /> Student Performance (Top 10)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance" fill="#10b981" name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
              <Whatshot /> Student Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* At Risk Students */}
      {atRiskStudents.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
            <Warning color="error" /> Students Requiring Attention
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {atRiskStudents.map((student, idx) => (
            <Box key={idx} mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {student.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: student.riskLevel === "High" ? "#fee2e2" : "#fef3c7",
                    color: student.riskLevel === "High" ? "#991b1b" : "#92400e",
                  }}
                >
                  {student.riskLevel} Risk
                </Typography>
              </Box>
              <Box display="flex" flexDirection="column" mb={1}>
                <Typography variant="caption">
                  Attendance: {student.attendanceRate}% | AQI: {student.aqi}
                </Typography>
                <Typography variant="caption" color="error.main" fontWeight="bold">
                  Reason: {student.riskReason}
                  {student.absentStreak >= 3 && (
                    <span style={{ display: 'block', marginTop: '4px', color: '#dc2626' }}>
                      ⚠️ Absent for {student.absentStreak} consecutive weeks!
                    </span>
                  )}
                </Typography>

                <Box mt={1} p={1} bgcolor="#fffbeb" borderRadius={1} border="1px border #fcd34d">
                  <Typography variant="caption" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
                    🟡 Prediction Analytics (AI)
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mt={0.5}>
                    <Typography variant="caption" color="text.secondary">Absence Probability</Typography>
                    <Typography variant="caption" fontWeight="bold" color={student.predictionScore > 50 ? 'error.main' : 'warning.main'}>
                      {student.predictionScore}% ({student.predictionLabel})
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={student.attendanceRate}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#e5e7eb",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    backgroundColor:
                      student.attendanceRate >= 80
                        ? "#10b981"
                        : student.attendanceRate >= 60
                          ? "#f59e0b"
                          : "#ef4444",
                  },
                }}
              />
            </Box>
          ))}
        </Paper>
      )}

      {students.length === 0 && !error && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="textSecondary">
            No attendance records found for this course yet.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default OverviewNew;
