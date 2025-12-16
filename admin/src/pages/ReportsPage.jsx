// Reports Page - Student Attendance Summary
// Square block view showing each student's attendance across all weeks

import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Grid,
    Card,
    CardContent,
    TextField,
    InputAdornment,
    Chip,
    LinearProgress,
    Button,
    Divider
} from '@mui/material';
import { Search, CheckCircle, Cancel, Schedule, DownloadForOffline, Assessment } from '@mui/icons-material';
import Navbar from '../components/Navbar';
import StudentPhotoAvatar from '../components/StudentPhotoAvatar';
import { getAllCourses } from '../services/coursesService';
import { getAllStudents } from '../services/studentsService';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ReportsPage = () => {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('all'); // 'all' or week number
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const TOTAL_WEEKS = 16;

    useEffect(() => {
        loadCourses();
        loadStudents();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            loadCourseAttendance();
        }
    }, [selectedCourse]);

    const loadCourses = async () => {
        try {
            const data = await getAllCourses();
            setCourses(data);
            if (data.length > 0) {
                setSelectedCourse(data[0].id);
            }
        } catch (err) {
            setError('Failed to load courses');
        }
    };

    const loadStudents = async () => {
        try {
            const data = await getAllStudents();
            console.log(`✅ Loaded ${data.length} students`);
            setStudents(data);
        } catch (err) {
            console.error('Failed to load students:', err);
        }
    };

    const loadCourseAttendance = async () => {
        if (!selectedCourse) return;

        setLoading(true);
        setError('');

        try {
            // Get all attendance records for this course
            const attendanceRef = collection(db, 'attendance');
            const q = query(
                attendanceRef,
                where('courseId', '==', selectedCourse)
            );

            const querySnapshot = await getDocs(q);
            const allRecords = [];

            querySnapshot.forEach((doc) => {
                allRecords.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Found ${allRecords.length} total attendance records`);

            // Group records by student
            const studentAttendanceMap = {};

            students.forEach(student => {
                studentAttendanceMap[student.id] = {
                    student,
                    weeklyAttendance: {},
                    stats: {
                        present: 0,
                        late: 0,
                        absent: 0,
                        total: 0
                    }
                };
            });

            // Process each record
            allRecords.forEach(record => {
                const recordName = record.studentName || record.name || '';
                const parts = recordName.split('_');
                const studentId = parts[parts.length - 1];

                // Find student
                const student = students.find(s =>
                    s.studentNumber === studentId || s.id === studentId
                );

                if (student && studentAttendanceMap[student.id]) {
                    const weekNum = record.weekNumber || 1;
                    const status = record.action?.toLowerCase() || record.status || 'present';

                    studentAttendanceMap[student.id].weeklyAttendance[weekNum] = {
                        status,
                        time: record.time || record.arrivalTime,
                        confidence: record.similarity || record.confidenceScore
                    };

                    // Update stats
                    if (status === 'join') {
                        studentAttendanceMap[student.id].stats.present++;
                    } else if (status === 'late') {
                        studentAttendanceMap[student.id].stats.late++;
                    } else {
                        studentAttendanceMap[student.id].stats.absent++;
                    }
                    studentAttendanceMap[student.id].stats.total++;
                }
            });

            setAttendanceData(Object.values(studentAttendanceMap));
        } catch (err) {
            console.error('Error loading attendance:', err);
            setError(`Failed to load attendance: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const exportWeeklyReport = () => {
        if (selectedWeek === 'all') {
            alert('Please select a specific week to export weekly report');
            return;
        }

        const course = courses.find(c => c.id === selectedCourse);
        const weekNum = parseInt(selectedWeek);

        // Create CSV content
        let csv = `Weekly Attendance Report - Week ${weekNum}\n`;
        csv += `Course: ${course?.courseCode} - ${course?.name}\n`;
        csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
        csv += `Student Name,Student ID,Status,Time,Confidence\n`;

        attendanceData.forEach(({ student, weeklyAttendance }) => {
            const weekData = weeklyAttendance[weekNum];
            const status = weekData?.status || 'Not Marked';
            const time = weekData?.time || '-';
            const confidence = weekData?.confidence ? `${(weekData.confidence * 100).toFixed(1)}%` : '-';

            csv += `"${student.name}",${student.studentNumber},${status},${time},${confidence}\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Week${weekNum}_${course?.courseCode}_Report.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const exportFullCourseReport = () => {
        const course = courses.find(c => c.id === selectedCourse);

        // Create CSV content
        let csv = `Full Course Attendance Report\n`;
        csv += `Course: ${course?.courseCode} - ${course?.name}\n`;
        csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
        csv += `Student Name,Student ID,Total Present,Total Absent,Attendance %,`;

        // Add week columns
        for (let i = 1; i <= TOTAL_WEEKS; i++) {
            csv += `Week ${i},`;
        }
        csv += `\n`;

        attendanceData.forEach(({ student, weeklyAttendance, stats }) => {
            const attendancePercentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : '0';
            csv += `"${student.name}",${student.studentNumber},${stats.present},${stats.absent},${attendancePercentage}%,`;

            // Add status for each week
            for (let i = 1; i <= TOTAL_WEEKS; i++) {
                const status = weeklyAttendance[i]?.status || '-';
                csv += `${status},`;
            }
            csv += `\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course?.courseCode}_Full_Report.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getAttendancePercentage = (stats) => {
        if (stats.total === 0) return 0;
        return (stats.present / stats.total) * 100;
    };

    const getWeekStatus = (weekData) => {
        if (!weekData) return null;
        return weekData.status;
    };

    const getWeekColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'present':
            case 'join':
                return '#4caf50';
            case 'late':
                return '#ff9800';
            case 'absent':
            case 'left':
                return '#f44336';
            default:
                return '#e0e0e0';
        }
    };

    const filteredData = attendanceData.filter(({ student }) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            student.name?.toLowerCase().includes(search) ||
            student.studentNumber?.toLowerCase().includes(search)
        );
    });

    return (
        <Box>
            <Navbar />
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                {/* Header */}
                <Box mb={3}>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Attendance Reports
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Comprehensive attendance overview for all students
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Filters */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Course</InputLabel>
                                <Select
                                    value={selectedCourse}
                                    label="Course"
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                >
                                    {courses.map(course => (
                                        <MenuItem key={course.id} value={course.id}>
                                            {course.courseCode} - {course.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Week for Report</InputLabel>
                                <Select
                                    value={selectedWeek}
                                    label="Week for Report"
                                    onChange={(e) => setSelectedWeek(e.target.value)}
                                >
                                    <MenuItem value="all">Select Week...</MenuItem>
                                    {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => (
                                        <MenuItem key={week} value={week}>Week {week}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <TextField
                                fullWidth
                                placeholder="Search by name or student number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Box display="flex" gap={2} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<DownloadForOffline />}
                            onClick={exportWeeklyReport}
                            disabled={selectedWeek === 'all'}
                        >
                            Export Weekly Report
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Assessment />}
                            onClick={exportFullCourseReport}
                        >
                            Export Full Course Report
                        </Button>
                    </Box>

                    {/* Legend */}
                    <Box mt={3} display="flex" gap={3} flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 24, height: 24, bgcolor: '#4caf50', borderRadius: 1 }} />
                            <Typography variant="body2">Present</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 24, height: 24, bgcolor: '#ff9800', borderRadius: 1 }} />
                            <Typography variant="body2">Late</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 24, height: 24, bgcolor: '#f44336', borderRadius: 1 }} />
                            <Typography variant="body2">Absent</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 24, height: 24, bgcolor: '#e0e0e0', borderRadius: 1 }} />
                            <Typography variant="body2">No Record</Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* Student Cards */}
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3} justifyContent="center">
                        {filteredData.map(({ student, weeklyAttendance, stats }) => {
                            const attendancePercentage = getAttendancePercentage(stats);

                            return (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={student.id}>
                                    <Card
                                        sx={{
                                            height: 480,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 4
                                            }
                                        }}
                                    >
                                        <CardContent>
                                            {/* Student Info */}
                                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                                <StudentPhotoAvatar
                                                    photoUrl={student.photoUrl}
                                                    name={student.name}
                                                    sx={{ width: 60, height: 60 }}
                                                />
                                                <Box flex={1}>
                                                    <Typography variant="subtitle1" fontWeight="600">
                                                        {student.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {student.studentNumber}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Attendance Percentage */}
                                            <Box mb={2}>
                                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Attendance Rate
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight="bold"
                                                        color={attendancePercentage >= 75 ? 'success.main' : 'error.main'}>
                                                        {attendancePercentage.toFixed(0)}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={attendancePercentage}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        bgcolor: 'grey.200',
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: attendancePercentage >= 75 ? 'success.main' : 'error.main'
                                                        }
                                                    }}
                                                />
                                            </Box>

                                            {/* Stats Row */}
                                            <Box display="flex" gap={1} mb={2} justifyContent="space-between">
                                                <Box textAlign="center">
                                                    <Typography variant="h6" color="success.main">{stats.present}</Typography>
                                                    <Typography variant="caption" color="textSecondary">Present</Typography>
                                                </Box>
                                                <Box textAlign="center">
                                                    <Typography variant="h6" color="warning.main">{stats.late}</Typography>
                                                    <Typography variant="caption" color="textSecondary">Late</Typography>
                                                </Box>
                                                <Box textAlign="center">
                                                    <Typography variant="h6" color="error.main">{stats.absent}</Typography>
                                                    <Typography variant="caption" color="textSecondary">Absent</Typography>
                                                </Box>
                                            </Box>

                                            {/* Week Blocks */}
                                            <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                                                Weekly Attendance (16 weeks)
                                            </Typography>
                                            <Box
                                                display="grid"
                                                gridTemplateColumns="repeat(8, 1fr)"
                                                gap={0.5}
                                            >
                                                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(weekNum => {
                                                    const weekData = weeklyAttendance[weekNum];
                                                    const status = getWeekStatus(weekData);
                                                    const color = getWeekColor(status);

                                                    return (
                                                        <Box
                                                            key={weekNum}
                                                            sx={{
                                                                aspectRatio: '1',
                                                                bgcolor: color,
                                                                borderRadius: 0.5,
                                                                cursor: 'pointer',
                                                                position: 'relative',
                                                                '&:hover': {
                                                                    opacity: 0.8,
                                                                    '&::after': {
                                                                        content: `"W${weekNum}"`,
                                                                        position: 'absolute',
                                                                        top: '50%',
                                                                        left: '50%',
                                                                        transform: 'translate(-50%, -50%)',
                                                                        color: 'white',
                                                                        fontSize: '0.6rem',
                                                                        fontWeight: 'bold',
                                                                        textShadow: '0 0 2px rgba(0,0,0,0.5)'
                                                                    }
                                                                }
                                                            }}
                                                            title={`Week ${weekNum}: ${status || 'No record'}`}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}

                        {filteredData.length === 0 && (
                            <Grid item xs={12}>
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <Typography color="textSecondary">
                                        No students found. Try adjusting your search or filters.
                                    </Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Container>
        </Box >
    );
};

export default ReportsPage;
