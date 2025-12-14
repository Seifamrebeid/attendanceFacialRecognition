// Course Statistics Page
// Displays comprehensive statistics for all courses from Firebase

import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Button,
  Tooltip,
} from "@mui/material";
import {
  TrendingUp,
  School,
  People,
  EventNote,
  Warning,
  CheckCircle,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Refresh,
  Download,
} from "@mui/icons-material";
import Navbar from "../components/Navbar";
import {
  getAllCoursesStatistics,
  getCourseAttendanceTrends,
  formatCourseReport,
} from "../services/courseStatsService";

const CourseStatsPage = () => {
  const [coursesWithStats, setCoursesWithStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedCourse, setExpandedCourse] = useState(null);
  const [trends, setTrends] = useState({});

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAllCoursesStatistics();
      setCoursesWithStats(data);
      console.log("Loaded course statistics:", data);
    } catch (err) {
      console.error("Error loading course statistics:", err);
      setError("Failed to load course statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStatistics();
  };

  const handleExpandCourse = async (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);

      // Load trends if not already loaded
      if (!trends[courseId]) {
        try {
          const courseTrends = await getCourseAttendanceTrends(courseId);
          setTrends((prev) => ({ ...prev, [courseId]: courseTrends }));
        } catch (err) {
          console.error("Error loading trends:", err);
        }
      }
    }
  };

  const handleExportReport = (course) => {
    const report = formatCourseReport(course.statistics, course);
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${course.code || course.id}_report_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return "success";
    if (rate >= 70) return "warning";
    return "error";
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
          >
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          pt: 4,
          pb: 8,
          mb: -6,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "white",
            }}
          >
            <Box>
              <Typography
                variant="h4"
                fontWeight="700"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                📊 Course Statistics Dashboard
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Comprehensive attendance and performance metrics from Firebase
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.9)",
                  },
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, md: 4 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Overall Summary Cards */}
        <Grid
          container
          spacing={2}
          sx={{ mb: 4, mt: -8, justifyContent: "center" }}
        >
          <Grid item xs={12} sm={6} md={2.4}>
            <Card
              sx={{
                boxShadow: 3,
                borderRadius: 3,
                height: "100%",
                minHeight: 160,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  textAlign="center"
                >
                  <School sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    fontWeight="500"
                  >
                    Total Courses
                  </Typography>
                  <Typography variant="h3" fontWeight="700" color="primary">
                    {coursesWithStats.length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card
              sx={{
                boxShadow: 3,
                borderRadius: 3,
                height: "100%",
                minHeight: 160,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  textAlign="center"
                >
                  <People sx={{ fontSize: 48, color: "success.main", mb: 1 }} />
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    fontWeight="500"
                  >
                    Total Students
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight="700"
                    color="success.main"
                  >
                    {coursesWithStats.reduce(
                      (sum, c) => sum + (c.statistics?.totalStudents || 0),
                      0
                    )}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card
              sx={{
                boxShadow: 3,
                borderRadius: 3,
                height: "100%",
                minHeight: 160,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  textAlign="center"
                >
                  <TrendingUp
                    sx={{ fontSize: 48, color: "info.main", mb: 1 }}
                  />
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    fontWeight="500"
                  >
                    Avg Attendance
                  </Typography>
                  <Typography variant="h3" fontWeight="700" color="info.main">
                    {coursesWithStats.length > 0
                      ? (
                          coursesWithStats.reduce(
                            (sum, c) =>
                              sum + (c.statistics?.attendanceRate || 0),
                            0
                          ) / coursesWithStats.length
                        ).toFixed(1)
                      : 0}
                    %
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card
              sx={{
                boxShadow: 3,
                borderRadius: 3,
                height: "100%",
                minHeight: 160,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  textAlign="center"
                >
                  <Warning
                    sx={{ fontSize: 48, color: "warning.main", mb: 1 }}
                  />
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    fontWeight="500"
                  >
                    Students at Risk
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight="700"
                    color="warning.main"
                  >
                    {coursesWithStats.reduce(
                      (sum, c) => sum + (c.statistics?.studentsAtRisk || 0),
                      0
                    )}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card
              sx={{
                boxShadow: 3,
                borderRadius: 3,
                height: "100%",
                minHeight: 160,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  textAlign="center"
                >
                  <EventNote
                    sx={{ fontSize: 48, color: "secondary.main", mb: 1 }}
                  />
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    fontWeight="500"
                  >
                    Avg Stay Time
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight="700"
                    color="secondary.main"
                  >
                    {coursesWithStats.length > 0
                      ? (
                          coursesWithStats.reduce(
                            (sum, c) =>
                              sum +
                              (c.statistics?.averageLectureStayMinutes || 0),
                            0
                          ) / coursesWithStats.length
                        ).toFixed(0)
                      : 0}
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ ml: 0.5, fontWeight: 400 }}
                    >
                      min
                    </Typography>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Courses Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Course Details
            </Typography>

            {coursesWithStats.length === 0 ? (
              <Alert severity="info">
                No courses found. Create courses from the Courses page to see
                statistics here.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>
                        <strong>Course</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Code</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Instructor</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Students</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Sessions</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Attendance Rate</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>At Risk</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Late Arrivals</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Avg Stay (min)</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Actions</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {coursesWithStats.map((course) => {
                      const stats = course.statistics || {};
                      return (
                        <React.Fragment key={course.id}>
                          <TableRow hover>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => handleExpandCourse(course.id)}
                              >
                                {expandedCourse === course.id ? (
                                  <KeyboardArrowUp />
                                ) : (
                                  <KeyboardArrowDown />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              {course.name || course.courseName || "N/A"}
                            </TableCell>
                            <TableCell>
                              {course.code || course.courseCode || "N/A"}
                            </TableCell>
                            <TableCell>
                              {course.instructorName ||
                                course.lecturerName ||
                                "N/A"}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={stats.totalStudents || 0}
                                size="small"
                                color="primary"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={stats.totalSessions || 0}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {stats.attendanceRate || 0}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(
                                    stats.attendanceRate || 0,
                                    100
                                  )}
                                  color={getAttendanceColor(
                                    stats.attendanceRate || 0
                                  )}
                                  sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              {stats.studentsAtRisk > 0 ? (
                                <Chip
                                  icon={<Warning />}
                                  label={stats.studentsAtRisk}
                                  color="warning"
                                  size="small"
                                />
                              ) : (
                                <CheckCircle color="success" />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {stats.lateArrivals || 0}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={
                                  stats.averageLectureStayMinutes
                                    ? `${stats.averageLectureStayMinutes} min`
                                    : "N/A"
                                }
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Export Report">
                                <IconButton
                                  size="small"
                                  onClick={() => handleExportReport(course)}
                                >
                                  <Download />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Details */}
                          <TableRow>
                            <TableCell
                              style={{ paddingBottom: 0, paddingTop: 0 }}
                              colSpan={11}
                            >
                              <Collapse
                                in={expandedCourse === course.id}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box sx={{ margin: 3 }}>
                                  <Typography variant="h6" gutterBottom>
                                    Detailed Statistics
                                  </Typography>

                                  {/* Additional Stats Summary */}
                                  <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Paper sx={{ p: 2, textAlign: "center" }}>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Avg Stay Time
                                        </Typography>
                                        <Typography
                                          variant="h5"
                                          color="secondary.main"
                                        >
                                          {stats.averageLectureStayMinutes || 0}{" "}
                                          min
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {stats.averageLectureStayMinutes >= 60
                                            ? "✅ Excellent engagement"
                                            : stats.averageLectureStayMinutes >=
                                              0
                                            ? "⚠️ Moderate engagement"
                                            : "❌ Low engagement"}
                                        </Typography>
                                      </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Paper sx={{ p: 2, textAlign: "center" }}>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Late Arrivals
                                        </Typography>
                                        <Typography
                                          variant="h5"
                                          color="warning.main"
                                        >
                                          {stats.lateArrivals || 0}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Students joining late
                                        </Typography>
                                      </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Paper sx={{ p: 2, textAlign: "center" }}>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Avg per Session
                                        </Typography>
                                        <Typography
                                          variant="h5"
                                          color="info.main"
                                        >
                                          {stats.averageSessionAttendance || 0}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Students per session
                                        </Typography>
                                      </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Paper sx={{ p: 2, textAlign: "center" }}>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Total Records
                                        </Typography>
                                        <Typography variant="h5">
                                          {stats.totalAttendanceRecords || 0}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          All attendance logs
                                        </Typography>
                                      </Paper>
                                    </Grid>
                                  </Grid>

                                  {/* Student Performance Table */}
                                  {stats.studentsWithStats &&
                                    stats.studentsWithStats.length > 0 && (
                                      <>
                                        <Typography
                                          variant="subtitle2"
                                          gutterBottom
                                          sx={{ mt: 2 }}
                                        >
                                          Student Performance
                                        </Typography>
                                        <TableContainer
                                          component={Paper}
                                          variant="outlined"
                                          sx={{ mb: 2 }}
                                        >
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>Student</TableCell>
                                                <TableCell>Email</TableCell>
                                                <TableCell align="center">
                                                  Attended
                                                </TableCell>
                                                <TableCell align="center">
                                                  Absences
                                                </TableCell>
                                                <TableCell align="center">
                                                  Rate
                                                </TableCell>
                                                <TableCell align="center">
                                                  Status
                                                </TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {stats.studentsWithStats.map(
                                                (student, idx) => (
                                                  <TableRow key={idx}>
                                                    <TableCell>
                                                      {student.fullName ||
                                                        student.studentId}
                                                    </TableCell>
                                                    <TableCell>
                                                      {student.email || "N/A"}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {student.attendedSessions}
                                                      /{student.totalSessions}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      <Chip
                                                        label={student.absences}
                                                        size="small"
                                                        color={
                                                          student.absences > 3
                                                            ? "error"
                                                            : "default"
                                                        }
                                                      />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {student.attendanceRate}%
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {student.isAtRisk ? (
                                                        <Chip
                                                          label="At Risk"
                                                          color="error"
                                                          size="small"
                                                        />
                                                      ) : (
                                                        <Chip
                                                          label="Good"
                                                          color="success"
                                                          size="small"
                                                        />
                                                      )}
                                                    </TableCell>
                                                  </TableRow>
                                                )
                                              )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </>
                                    )}

                                  {/* Attendance Trends */}
                                  {trends[course.id] &&
                                    trends[course.id].length > 0 && (
                                      <>
                                        <Typography
                                          variant="subtitle2"
                                          gutterBottom
                                          sx={{ mt: 2 }}
                                        >
                                          Attendance Trends
                                        </Typography>
                                        <TableContainer
                                          component={Paper}
                                          variant="outlined"
                                        >
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>Date</TableCell>
                                                <TableCell align="center">
                                                  Students
                                                </TableCell>
                                                <TableCell align="center">
                                                  Joins
                                                </TableCell>
                                                <TableCell align="center">
                                                  Leaves
                                                </TableCell>
                                                <TableCell align="center">
                                                  Absences
                                                </TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {trends[course.id].map(
                                                (trend, idx) => (
                                                  <TableRow key={idx}>
                                                    <TableCell>
                                                      {new Date(
                                                        trend.date
                                                      ).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {trend.uniqueStudents}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {trend.joins}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {trend.leaves}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {trend.absences}
                                                    </TableCell>
                                                  </TableRow>
                                                )
                                              )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </>
                                    )}

                                  {/* Session Dates */}
                                  {stats.sessionDates &&
                                    stats.sessionDates.length > 0 && (
                                      <Box sx={{ mt: 2 }}>
                                        <Typography
                                          variant="subtitle2"
                                          gutterBottom
                                        >
                                          Session Dates
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 1,
                                          }}
                                        >
                                          {stats.sessionDates.map(
                                            (date, idx) => (
                                              <Chip
                                                key={idx}
                                                icon={<EventNote />}
                                                label={new Date(
                                                  date
                                                ).toLocaleDateString()}
                                                size="small"
                                                variant="outlined"
                                              />
                                            )
                                          )}
                                        </Box>
                                      </Box>
                                    )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default CourseStatsPage;
