// Warnings Page - Display Student Warnings
// Shows students with 3+ absences and email status

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
    Chip,
    CircularProgress,
    Alert,
    Button,
    Avatar
} from '@mui/material';
import { Warning, Refresh, Email, EmailOutlined } from '@mui/icons-material';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import { getAllWarnings, getWarningsByCourse } from '../services/warningsService';
import { getAllCourses } from '../services/coursesService';
import { getAllStudents } from '../services/studentsService';

const WarningsPage = () => {
    const [warnings, setWarnings] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadWarnings();
    }, [selectedCourse]);

    const loadData = async () => {
        try {
            const [coursesData, studentsData] = await Promise.all([
                getAllCourses(),
                getAllStudents()
            ]);
            setCourses(coursesData);
            setStudents(studentsData);
        } catch (err) {
            setError('Failed to load data');
        }
    };

    const loadWarnings = async () => {
        setLoading(true);
        try {
            let data;
            if (selectedCourse === 'all') {
                data = await getAllWarnings();
            } else {
                data = await getWarningsByCourse(selectedCourse);
            }
            setWarnings(data);
        } catch (err) {
            setError('Failed to load warnings');
        } finally {
            setLoading(false);
        }
    };

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId);
        return student ? student.name : studentId;
    };

    const getCourseName = (courseId) => {
        const course = courses.find(c => c.id === courseId);
        return course ? course.name : courseId;
    };

    const getSeverityColor = (absenceCount) => {
        if (absenceCount >= 5) return 'error';
        if (absenceCount >= 4) return 'warning';
        return 'default';
    };

    return (
        <Box>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Student Warnings
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Students with 3 or more absences
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Filters */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box display="flex" gap={2} alignItems="center">
                        <FormControl sx={{ minWidth: 250 }}>
                            <InputLabel>Filter by Course</InputLabel>
                            <Select
                                value={selectedCourse}
                                label="Filter by Course"
                                onChange={(e) => setSelectedCourse(e.target.value)}
                            >
                                <MenuItem value="all">All Courses</MenuItem>
                                {courses.map(course => (
                                    <MenuItem key={course.id} value={course.id}>
                                        {course.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={loadWarnings}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Paper>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {warnings.length > 0 && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <strong>{warnings.length} student(s)</strong> have reached the warning threshold
                            </Alert>
                        )}

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Student Name</strong></TableCell>
                                        <TableCell><strong>Course</strong></TableCell>
                                        <TableCell align="center"><strong>Total Absences</strong></TableCell>
                                        <TableCell><strong>Last Absence Date</strong></TableCell>
                                        <TableCell align="center"><strong>Email Sent</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {warnings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Box py={4}>
                                                    <Warning sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                                    <Typography color="textSecondary">
                                                        No warnings found. This is good news!
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        warnings.map((warning) => (
                                            <TableRow
                                                key={warning.id}
                                                hover
                                                sx={{
                                                    backgroundColor: warning.absenceCount >= 5
                                                        ? 'rgba(211, 47, 47, 0.05)'
                                                        : 'transparent'
                                                }}
                                            >
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={2}>
                                                        <Avatar
                                                            src={students.find(s => s.id === warning.studentId)?.photoUrl}
                                                            alt={getStudentName(warning.studentId)}
                                                            sx={{ width: 32, height: 32 }}
                                                        >
                                                            {getStudentName(warning.studentId)?.charAt(0)}
                                                        </Avatar>
                                                        {getStudentName(warning.studentId)}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{getCourseName(warning.courseId)}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={warning.absenceCount}
                                                        color={getSeverityColor(warning.absenceCount)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {warning.lastAbsenceDate
                                                        ? format(new Date(warning.lastAbsenceDate), 'MMM dd, yyyy')
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {warning.emailSent ? (
                                                        <Chip
                                                            icon={<Email />}
                                                            label="Yes"
                                                            color="success"
                                                            size="small"
                                                        />
                                                    ) : (
                                                        <Chip
                                                            icon={<EmailOutlined />}
                                                            label="No"
                                                            color="default"
                                                            size="small"
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}

                {warnings.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="body2" color="textSecondary">
                            Showing {warnings.length} warning(s)
                        </Typography>
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default WarningsPage;
