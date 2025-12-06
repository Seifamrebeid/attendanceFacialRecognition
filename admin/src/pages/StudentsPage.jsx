// Students Page - View and Search Students
// Display all students with filtering capabilities

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
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import { People, Search } from '@mui/icons-material';
import Navbar from '../components/Navbar';
import StudentPhotoAvatar from '../components/StudentPhotoAvatar';
import { getAllStudents, searchStudents, getStudentsByCourse } from '../services/studentsService';
import { getAllCourses } from '../services/coursesService';

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterStudents();
    }, [searchTerm, selectedCourse, students]);

    const loadData = async () => {
        try {
            const [studentsData, coursesData] = await Promise.all([
                getAllStudents(),
                getAllCourses()
            ]);
            setStudents(studentsData);
            setFilteredStudents(studentsData);
            setCourses(coursesData);
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const filterStudents = async () => {
        let filtered = [...students];

        // Filter by search term
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(student =>
                student.name?.toLowerCase().includes(searchLower) ||
                student.email?.toLowerCase().includes(searchLower) ||
                student.studentNumber?.toLowerCase().includes(searchLower)
            );
        }

        // Filter by course
        if (selectedCourse && selectedCourse !== 'all') {
            filtered = filtered.filter(student =>
                student.enrolledCourses?.includes(selectedCourse)
            );
        }

        setFilteredStudents(filtered);
    };

    const getCourseNames = (courseIds) => {
        if (!courseIds || courseIds.length === 0) return [];
        return courseIds.map(id => {
            const course = courses.find(c => c.id === id);
            return course ? course.name : id;
        });
    };
    console.log(students);
    return (
        <Box>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Students Management
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    View and search students
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Filters */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search"
                            placeholder="Name, email, or student number"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ flexGrow: 1, minWidth: 250 }}
                            InputProps={{
                                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                        />
                        <FormControl sx={{ minWidth: 200 }}>
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
                                    <TableCell><strong>Photo</strong></TableCell>
                                    <TableCell><strong>Student Number</strong></TableCell>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Enrolled Courses</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Box py={4}>
                                                <People sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                                <Typography color="textSecondary">
                                                    {searchTerm || selectedCourse !== 'all'
                                                        ? 'No students match your search criteria'
                                                        : 'No students found'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <TableRow key={student.id} hover>
                                            <TableCell>
                                                <StudentPhotoAvatar 
                                                    photoUrl={student.photoUrl} 
                                                    name={student.name}
                                                    sx={{ width: 50, height: 50 }}
                                                />
                                            </TableCell>
                                            <TableCell>{student.studentNumber}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>{student.email}</TableCell>
                                            <TableCell>
                                                <Box display="flex" gap={0.5} flexWrap="wrap">
                                                    {getCourseNames(student.enrolledCourses).map((courseName, idx) => (
                                                        <Chip
                                                            key={idx}
                                                            label={courseName}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                <Box mt={2}>
                    <Typography variant="body2" color="textSecondary">
                        Showing {filteredStudents.length} of {students.length} students
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default StudentsPage;
