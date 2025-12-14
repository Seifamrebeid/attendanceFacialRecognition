import React, { useState, useEffect } from "react";
import { useCourse } from "../context/CourseContext";
import { onAttendanceByCourse } from "../services/attendanceService";
import {
  analyzeStudent, calculateCourseHealth, analyzeTrends, analyzeDailyDistribution,
  analyzeHourlyDistribution, analyzeActionBreakdown, generateInsightsSummary
} from "../services/statisticsService";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Box, Container, Grid, Paper, Typography, Chip, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Divider, Alert, LinearProgress, CircularProgress
} from '@mui/material';
import {
  TrendingUp, Warning, Schedule, HowToReg,
  CheckCircle, Cancel, Person, Groups, AccessTime,
  Timeline, DonutLarge, Bolt
} from '@mui/icons-material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Overview = () => {
  const { selectedCourse } = useCourse();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [courseHealth, setCourseHealth] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Advanced Stats State
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [actionStats, setActionStats] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);

  useEffect(() => {
    if (!selectedCourse) return;

    console.log('📊 Loading attendance for course:', selectedCourse.id, selectedCourse.courseCode);

    const unsubscribe = onAttendanceByCourse(selectedCourse.id, (records) => {
      console.log('📥 Received', records.length, 'attendance records');
      
      setAttendanceRecords(records);

      if (records.length === 0) {
        console.warn('⚠️  No attendance records found for this course');
        setCourseHealth({
          healthScore: 0,
          avgAttendance: 0,
          avgEarlyLeave: 0,
          avgSimilarity: 0,
          highRiskCount: 0
        });
        return;
      }

      // 1. Process Data
      const maxWeek = records.length > 0 ? Math.max(...records.map(r => r.weekNumber || 1)) : 1;

      const studentMap = new Map();
      records.forEach(r => {
        const { name } = formatStudentName(r.studentName);
        const dept = r.department || "General";
        if (!studentMap.has(name)) {
          studentMap.set(name, { id: r.studentName, name, department: dept });
        }
      });
      const uniqueStudents = Array.from(studentMap.values());

      // 2. Run AI Analysis (Student Level)
      const studentStats = uniqueStudents.map(s =>
        analyzeStudent(s.id, s.name, records, maxWeek)
      );

      // 3. Compute Aggregates
      const health = calculateCourseHealth(studentStats);
      setCourseHealth(health);

      const risky = studentStats
        .filter(s => s.riskLevel === 'High' || s.riskLevel === 'Medium')
        .sort((a, b) => a.aqi - b.aqi)
        .slice(0, 5);
      setAtRiskStudents(risky);

      // 4. Compute Advanced Visualizations
      const trends = analyzeTrends(records);
      setWeeklyTrends(trends);

      setDailyStats(analyzeDailyDistribution(records));
      setHourlyStats(analyzeHourlyDistribution(records));
      setActionStats(analyzeActionBreakdown(records));

      setAiInsights(generateInsightsSummary(trends, health));

      setRecentActivity(records.slice(0, 10));
    });

    return () => unsubscribe();
  }, [selectedCourse]);

  const formatStudentName = (fullName) => {
    if (!fullName) return { name: "Unknown", id: "" };
    const lastUnderscoreIndex = fullName.lastIndexOf("_");
    if (lastUnderscoreIndex === -1) return { name: fullName, id: "" };
    const name = fullName.substring(0, lastUnderscoreIndex).replace(/_/g, " ");
    const id = fullName.substring(lastUnderscoreIndex + 1);
    return { name, id };
  };

  const getRiskIcon = (level) => {
    if (level === 'High') return <Warning color="error" />;
    if (level === 'Medium') return <Warning color="warning" />;
    return <CheckCircle color="success" />;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
      {/* Loading State */}
      {!courseHealth && attendanceRecords.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>Loading dashboard data...</Typography>
        </Box>
      )}

      {/* Header */}
      {(courseHealth || attendanceRecords.length > 0) && (
        <>
          <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Dashboard Overview
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time monitoring for <Box component="span" fontWeight="bold" color="primary.main">{selectedCourse?.courseName || 'Selected Course'}</Box>
          </Typography>
        </Box>
        {courseHealth && (
          <Paper sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f8f9fa' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Course Health Score</Typography>
              <Typography variant="h4" fontWeight="bold" color={courseHealth.healthScore >= 80 ? 'success.main' : 'error.main'}>
                {courseHealth.healthScore}
              </Typography>
            </Box>
            <CircularProgress
              variant="determinate"
              value={courseHealth.healthScore}
              color={courseHealth.healthScore >= 80 ? 'success' : 'error'}
              thickness={4}
              size={50}
            />
          </Paper>
        )}
      </Box>

      {/* AI Insights Banner */}
      {aiInsights.length > 0 && (
        <Alert icon={<Bolt fontSize="inherit" />} severity="info" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">AI Insights Detected:</Typography>
          <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
            {aiInsights.map((insight, i) => <li key={i}><Typography variant="body2">{insight}</Typography></li>)}
            {courseHealth && <li><Typography variant="body2">Prediction: {courseHealth.healthScore > 75 ? 'Attendance expected to remain stable.' : 'Intervention recommended to prevent dropout.'}</Typography></li>}
          </ul>
        </Alert>
      )}

      {/* KPI Cards */}
      {courseHealth && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', width: 56, height: 56 }}>
                <TrendingUp />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{courseHealth.avgAttendance}%</Typography>
                <Typography variant="caption" color="text.secondary">Avg Attendance</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#fff1f2', color: '#be123c', width: 56, height: 56 }}>
                <Cancel />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{courseHealth.avgEarlyLeave}%</Typography>
                <Typography variant="caption" color="text.secondary">Early Leave Rate</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#f0fdf4', color: '#15803d', width: 56, height: 56 }}>
                <HowToReg />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{(courseHealth.avgSimilarity * 100).toFixed(1)}%</Typography>
                <Typography variant="caption" color="text.secondary">Biometric Trust</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#fff7ed', color: '#c2410c', width: 56, height: 56 }}>
                <Warning />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{courseHealth.highRiskCount}</Typography>
                <Typography variant="caption" color="text.secondary">High Risk Students</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Charts Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 350 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
              <Timeline /> Weekly Attendance Trend
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrends}>
                <defs>
                  <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Area type="monotone" dataKey="Attendance" stroke="#8884d8" fillOpacity={1} fill="url(#colorAtt)" />
                <Area type="monotone" dataKey="EarlyLeaves" stroke="#FF8042" fill="#FF8042" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 350 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
              <Schedule /> Activity by Day
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]} name="Attendance Volume" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 350 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
              <AccessTime /> Peak Arrival Times
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="#ffc658" fill="#ffc658" name="Students Arriving" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 350 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
              <DonutLarge /> Action Breakdown
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={actionStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {actionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Bottom Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box p={3} bgcolor="#fff1f2">
              <Typography variant="h6" fontWeight="bold" color="#be123c" display="flex" alignItems="center" gap={1}>
                <Warning /> At-Risk Students Monitor
              </Typography>
            </Box>
            <List>
              {atRiskStudents.length > 0 ? atRiskStudents.map((s, idx) => (
                <React.Fragment key={idx}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#ffe4e6', color: '#be123c' }}>{s.name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography fontWeight="bold">{s.name}</Typography>}
                      secondary={
                        <React.Fragment>
                          <Typography component="span" variant="body2" color="text.primary" display="block">
                            {s.riskReason}
                          </Typography>
                          <Typography component="span" variant="caption" color="error">
                            Prediction: {(s.nextAbsenceProbability * 100).toFixed(0)}% Drop Risk
                          </Typography>
                        </React.Fragment>
                      }
                    />
                    <Chip
                      label={s.riskLevel}
                      size="small"
                      color={s.riskLevel === 'High' ? 'error' : 'warning'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </ListItem>
                  {idx < atRiskStudents.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              )) : (
                <Box p={3} textAlign="center">
                  <Typography color="text.secondary">No high-risk students detected (Good Standing).</Typography>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
            <Box p={3} bgcolor="#f0f9ff">
              <Typography variant="h6" fontWeight="bold" color="#0369a1" display="flex" alignItems="center" gap={1}>
                <AccessTime /> Live Feed
              </Typography>
            </Box>
            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {recentActivity.length > 0 ? recentActivity.map((record, index) => {
                const { name } = formatStudentName(record.studentName);
                return (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight="bold">{name}</Typography>}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="caption">{record.time?.substring(0, 5)}</Typography>
                          <Chip
                            label={record.action}
                            size="small"
                            color={
                              record.action === 'JOIN' ? 'success' :
                                record.action === 'LEFT' ? 'warning' : 'default'
                            }
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                );
              }) : (
                <Box p={3} textAlign="center">
                  <Typography color="text.secondary">Waiting for real-time data...</Typography>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
        </>
      )}

    </Container>
  );
};

// SVG Icon wrapper workaround for 'DirectionsRun' if not imported
const DirectionsRunIconWrapper = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
    <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7.7 1.6z" />
  </svg>
);

export default Overview;
