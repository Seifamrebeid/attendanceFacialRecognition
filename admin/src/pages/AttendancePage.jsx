// Attendance Page - View Attendance Records
// Display attendance with date range and course filtering

import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import { EventNote, Refresh } from '@mui/icons-material';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import StudentPhotoAvatar from '../components/StudentPhotoAvatar';
import { getAttendanceByDateRange } from '../services/attendanceService';
import { getAllCourses } from '../services/coursesService';
import { getAllStudents } from '../services/studentsService';

const AttendancePage = () => {
    const [attendance, setAttendance] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadCourses();
        loadStudents();

        // Set default dates (last 30 days)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    }, []);

    const loadCourses = async () => {
        try {
            const data = await getAllCourses();
            setCourses(data);
        } catch (err) {
            setError('Failed to load courses');
        }
    };

    const loadStudents = async () => {
        try {
            const data = await getAllStudents();
            console.log(`✅ Loaded ${data.length} students`);
            console.log('Student fields:', data[0]); // Log first student's structure
            setStudents(data);
        } catch (err) {
            console.error('Failed to load students:', err);
        }
    };

    const loadAttendance = async () => {
        if (!startDate || !endDate) {
            setError('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59); // Include the entire end date

            console.log(`Loading attendance from ${start.toISOString()} to ${end.toISOString()}`);
            console.log(`Course filter: ${selectedCourse || 'All courses'}`);

            const data = await getAttendanceByDateRange(selectedCourse, start, end);
            console.log(`Loaded ${data.length} attendance records`);
            console.log('Sample record:', data[0]);
            setAttendance(data);
        } catch (err) {
            console.error('Error loading attendance:', err);
            setError(`Failed to load attendance records: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId || s.studentNumber === studentId);
        return student ? student.name : studentId;
    };

    const getStudentInfo = (record) => {
        // If record has a name, use it directly
        if (record.name && record.name.trim()) {
            console.log(`Using record name: ${record.name}`);
            
            // Try to find matching student for photo
            let student = null;
            
            // Try to match by name
            student = students.find(s => 
                s.name && s.name.toLowerCase().trim() === record.name.toLowerCase().trim()
            );
            
            if (student) {
                console.log(`✅ Found matching student: ${student.name} (photo: ${!!student.photoUrl})`);
                return {
                    student,
                    name: record.name,
                    photoUrl: student.photoUrl
                };
            } else {
                console.log(`ℹ️ No student photo found for: ${record.name} (using name from record)`);
                return {
                    student: null,
                    name: record.name,
                    photoUrl: null  // Will show initials
                };
            }
        }
        
        // Fallback: try to find by ID if no name
        let student = null;
        
        if (record.studentId) {
            student = students.find(s => s.id === record.studentId || s.studentNumber === record.studentId);
        }
        
        if (!student && record.session_id) {
            student = students.find(s => s.studentNumber === record.session_id.toString());
        }
        
        if (student) {
            console.log(`✅ Found student by ID: ${student.name}`);
            return {
                student,
                name: student.name || 'Unknown',
                photoUrl: student.photoUrl
            };
        }
        
        console.warn(`❌ Could not find student for:`, record);
        return {
            student: null,
            name: 'Unknown',
            photoUrl: null
        };
    };

    const getCourseName = (courseId) => {
        const course = courses.find(c => c.id === courseId || c.courseCode === courseId);
        return course ? (course.courseName || course.name) : courseId;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present':
                return 'success';
            case 'late':
                return 'warning';
            case 'absent':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Attendance Records
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    View attendance records by course and date range
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Filters */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                        <FormControl sx={{ minWidth: 250 }}>
                            <InputLabel>Course</InputLabel>
                            <Select
                                value={selectedCourse}
                                label="Course"
                                onChange={(e) => setSelectedCourse(e.target.value)}
                            >
                                <MenuItem value="">All Courses</MenuItem>
                                {courses.map(course => (
                                    <MenuItem key={course.id} value={course.id}>
                                        {course.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Start Date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />

                        <TextField
                            label="End Date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />

                        <Button
                            variant="contained"
                            startIcon={<Refresh />}
                            onClick={loadAttendance}
                            disabled={loading}
                        >
                            Load Records
                        </Button>
                    </Box>
                </Paper>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Student Name</strong></TableCell>
                                    <TableCell><strong>Course</strong></TableCell>
                                    <TableCell><strong>Date</strong></TableCell>
                                    <TableCell><strong>Arrival Time</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Confidence</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attendance.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Box py={4}>
                                                <EventNote sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                                <Typography color="textSecondary">
                                                    No attendance records found. Select filters and click "Load Records".
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    attendance.map((record) => {
                                        const studentInfo = getStudentInfo(record);
                                        const status = record.status || (record.action === 'JOIN' ? 'present' : record.action === 'LATE' ? 'late' : 'absent');
                                        
                                        return (
                                            <TableRow key={record.id} hover>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={2}>
                                                        <StudentPhotoAvatar 
                                                            photoUrl={studentInfo.photoUrl}
                                                            name={studentInfo.name}
                                                            sx={{ width: 40, height: 40 }}
                                                        />
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {studentInfo.name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{getCourseName(record.courseId)}</TableCell>
                                                <TableCell>
                                                    {record.date ? format(new Date(record.date), 'MMM dd, yyyy') : record.created_at ? format(new Date(record.created_at), 'MMM dd, yyyy') : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {record.arrivalTime ? format(new Date(record.arrivalTime), 'HH:mm') : record.time ? record.time : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={status?.toUpperCase()}
                                                        color={getStatusColor(status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {record.confidenceScore
                                                        ? `${(record.confidenceScore * 100).toFixed(1)}%`
                                                        : record.similarity
                                                        ? `${(record.similarity * 100).toFixed(1)}%`
                                                        : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {attendance.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="body2" color="textSecondary">
                            Showing {attendance.length} attendance records
                        </Typography>
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default AttendancePage;
