// Admin Dashboard - Landing Page
// Shows overview statistics and quick links

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  School,
  People,
  Warning,
  TrendingUp,
  CheckCircle,
  EventNote,
  Person,
  DateRange,
  Assignment,
  Timer,
  ShowChart,
} from "@mui/icons-material";
import Navbar from "../components/Navbar";
import { getAllCourses } from "../services/coursesService";
import { getAllStudents } from "../services/studentsService";
import { getAllWarnings } from "../services/warningsService";
import { getAllCoursesStatistics } from "../services/courseStatsService";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalWarnings: 0,
    highRiskStudents: 0,
    averageAttendance: 0,
    totalSessions: 0,
    recentActivity: [],
  });
  const [courseStats, setCourseStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [courses, students, warnings, allCourseStats] = await Promise.all([
        getAllCourses(),
        getAllStudents(),
        getAllWarnings(),
        getAllCoursesStatistics(),
      ]);

      const uniqueStudentsWithWarnings = new Set(
        warnings.map((w) => w.studentId)
      ).size;

      // Calculate average attendance across all courses
      const avgAttendance =
        allCourseStats.length > 0
          ? (
              allCourseStats.reduce(
                (sum, c) => sum + (c.statistics?.attendanceRate || 0),
                0
              ) / allCourseStats.length
            ).toFixed(1)
          : 0;

      // Calculate total sessions
      const totalSessions = allCourseStats.reduce(
        (sum, c) => sum + (c.statistics?.totalSessions || 0),
        0
      );

      // Get recent activity (top 5 courses by students)
      const recentActivity = allCourseStats
        .sort(
          (a, b) =>
            (b.statistics?.totalStudents || 0) -
            (a.statistics?.totalStudents || 0)
        )
        .slice(0, 5);

      setStats({
        totalCourses: courses.length,
        totalStudents: students.length,
        totalWarnings: warnings.length,
        highRiskStudents: uniqueStudentsWithWarnings,
        averageAttendance: parseFloat(avgAttendance),
        totalSessions: totalSessions,
        recentActivity: recentActivity,
      });
      setCourseStats(allCourseStats);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <Card
      sx={{
        height: "100%",
        minHeight: 150,
        cursor: onClick ? "pointer" : "default",
        borderRadius: 3,
        boxShadow: 3,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": onClick
          ? {
              transform: "translateY(-4px)",
              boxShadow: 6,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography
              color="textSecondary"
              gutterBottom
              variant="body2"
              fontWeight={500}
            >
              {title}
            </Typography>
            <Typography
              variant="h2"
              component="div"
              fontWeight={700}
              color={`${color}.main`}
            >
              {loading ? <CircularProgress size={40} /> : value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: 3,
              p: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {React.cloneElement(icon, {
              sx: { fontSize: 56, color: `${color}.main` },
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Navbar />
      <Box
        sx={{
          mt: 4,
          mb: 4,
          px: { xs: 2, md: 4 },
          maxWidth: "1400px",
          mx: "auto",
        }}
      >
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Overview of the attendance management system
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4, justifyContent: "center" }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total Courses"
              value={stats.totalCourses}
              icon={<School />}
              color="primary"
              onClick={() => navigate("/admin/courses")}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={<People />}
              color="success"
              onClick={() => navigate("/admin/students")}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Active Warnings"
              value={stats.totalWarnings}
              icon={<Warning />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Students at Risk"
              value={stats.highRiskStudents}
              icon={<TrendingUp />}
              color="error"
            />
          </Grid>
        </Grid>

        {/* Additional Stats Row */}
        <Grid container spacing={3} sx={{ mb: 4, justifyContent: "center" }}>
          <Grid item xs={12} sm={6} lg={4}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                height: "100%",
                minHeight: 150,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box
                    sx={{
                      backgroundColor: "info.light",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                    }}
                  >
                    <ShowChart sx={{ fontSize: 32, color: "info.main" }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      fontWeight={500}
                    >
                      Average Attendance
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      {loading ? (
                        <CircularProgress size={24} />
                      ) : (
                        `${stats.averageAttendance}%`
                      )}
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.averageAttendance}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: "info.light",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "info.main",
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                height: "100%",
                minHeight: 150,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      backgroundColor: "secondary.light",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                    }}
                  >
                    <EventNote sx={{ fontSize: 32, color: "secondary.main" }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      fontWeight={500}
                    >
                      Total Sessions
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      color="secondary.main"
                    >
                      {loading ? (
                        <CircularProgress size={24} />
                      ) : (
                        stats.totalSessions
                      )}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                height: "100%",
                minHeight: 150,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      backgroundColor: "success.light",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 32, color: "success.main" }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      fontWeight={500}
                    >
                      System Status
                    </Typography>
                    <Chip
                      label="Active"
                      color="success"
                      size="small"
                      sx={{ mt: 0.5, fontWeight: 600 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ justifyContent: "center" }}>
          {/* Quick Actions */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: "100%", borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Quick Actions
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate("/admin/reports")}
                    color="primary"
                    size="large"
                    startIcon={<Assignment />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    View Attendance Reports
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate("/admin/course-stats")}
                    color="secondary"
                    size="large"
                    startIcon={<ShowChart />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Course Statistics
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate("/admin/students")}
                    size="large"
                    startIcon={<People />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Manage Students
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate("/admin/courses")}
                    size="large"
                    startIcon={<School />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Manage Courses
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Courses */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: "100%", borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Top Courses by Enrollment
                </Typography>
                <Divider sx={{ my: 2 }} />
                {loading ? (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {stats.recentActivity.map((course, index) => (
                      <ListItem
                        key={course.id}
                        sx={{
                          px: 0,
                          py: 1.5,
                          borderBottom:
                            index < stats.recentActivity.length - 1
                              ? "1px solid"
                              : "none",
                          borderColor: "divider",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1.5,
                              backgroundColor: "primary.light",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "primary.main",
                              fontWeight: 700,
                              fontSize: "0.875rem",
                            }}
                          >
                            {index + 1}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600}>
                              {course.name || course.code || "Unknown Course"}
                            </Typography>
                          }
                          secondary={
                            <Box
                              display="flex"
                              alignItems="center"
                              gap={1}
                              mt={0.5}
                            >
                              <Person
                                sx={{ fontSize: 16, color: "text.secondary" }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {course.statistics?.totalStudents || 0} students
                              </Typography>
                              <Chip
                                label={`${(
                                  course.statistics?.attendanceRate || 0
                                ).toFixed(0)}%`}
                                size="small"
                                color={
                                  course.statistics?.attendanceRate >= 80
                                    ? "success"
                                    : "warning"
                                }
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* System Information */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: "100%", borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  System Information
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Box display="flex" alignItems="flex-start" gap={2} mb={3}>
                    <CheckCircle sx={{ color: "success.main", fontSize: 24 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Attendance Tracking
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ lineHeight: 1.6 }}
                      >
                        Automatic facial recognition system for real-time
                        attendance monitoring
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="flex-start" gap={2} mb={3}>
                    <Warning sx={{ color: "warning.main", fontSize: 24 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Warning System
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ lineHeight: 1.6 }}
                      >
                        Automatic email notifications sent after 3 absences
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="flex-start" gap={2} mb={3}>
                    <ShowChart sx={{ color: "info.main", fontSize: 24 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Smart Analytics
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ lineHeight: 1.6 }}
                      >
                        Dynamic late threshold detection and attendance trends
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Timer sx={{ color: "secondary.main", fontSize: 24 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Last Updated
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ lineHeight: 1.6 }}
                      >
                        {new Date().toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
