// Courses Page - CRUD Operations
// Create, Read, Update, Delete courses

import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    School
} from '@mui/icons-material';
import Navbar from '../components/Navbar';
import {
    getAllCourses,
    createCourse,
    updateCourse,
    deleteCourse
} from '../services/coursesService';

const CoursesPage = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentCourse, setCurrentCourse] = useState(null);
    const [formData, setFormData] = useState({
        courseName: '',
        courseCode: '',
        description: '',
        credits: '',
        lecturerName: '',
        lecturerUsername: '',
        lecturerPassword: '',
        department: '',
        semester: '',
        schedule: '',
        maxStudents: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const data = await getAllCourses();
            setCourses(data);
        } catch (err) {
            setError('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (course = null) => {
        if (course) {
            setEditMode(true);
            setCurrentCourse(course);
            setFormData({
                courseName: course.courseName || '',
                courseCode: course.courseCode || '',
                description: course.description || '',
                credits: course.credits || '',
                lecturerName: course.lecturerName || '',
                lecturerUsername: course.lecturerUsername || '',
                lecturerPassword: course.lecturerPassword || '',
                department: course.department || '',
                semester: course.semester || '',
                schedule: course.schedule || '',
                maxStudents: course.maxStudents || ''
            });
        } else {
            setEditMode(false);
            setCurrentCourse(null);
            setFormData({
                courseName: '',
                courseCode: '',
                description: '',
                credits: '',
                lecturerName: '',
                lecturerUsername: '',
                lecturerPassword: '',
                department: '',
                semester: '',
                schedule: '',
                maxStudents: ''
            });
        }
        setOpenDialog(true);
        setError('');
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({
            courseName: '',
            courseCode: '',
            description: '',
            credits: '',
            lecturerName: '',
            lecturerUsername: '',
            lecturerPassword: '',
            department: '',
            semester: '',
            schedule: '',
            maxStudents: ''
        });
        setError('');
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.courseName || !formData.courseCode || !formData.lecturerName || !formData.lecturerUsername || !formData.lecturerPassword) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            if (editMode) {
                await updateCourse(currentCourse.id, formData);
                setSuccess('Course updated successfully');
            } else {
                await createCourse(formData);
                setSuccess('Course created successfully');
            }

            handleCloseDialog();
            loadCourses();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to save course');
        }
    };

    const handleDelete = async (courseId) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await deleteCourse(courseId);
                setSuccess('Course deleted successfully');
                loadCourses();
                setTimeout(() => setSuccess(''), 3000);
            } catch (err) {
                setError('Failed to delete course');
            }
        }
    };

    return (
        <Box>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Courses Management
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Create, edit, and manage courses
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add Course
                    </Button>
                </Box>

                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Course Code</strong></TableCell>
                                    <TableCell><strong>Course Name</strong></TableCell>
                                    <TableCell><strong>Lecturer</strong></TableCell>
                                    <TableCell><strong>Department</strong></TableCell>
                                    <TableCell><strong>Semester</strong></TableCell>
                                    <TableCell><strong>Schedule</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {courses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Box py={4}>
                                                <School sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                                <Typography color="textSecondary">
                                                    No courses found. Click "Add Course" to create one.
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    courses.map((course) => (
                                        <TableRow key={course.id} hover>
                                            <TableCell>{course.courseCode}</TableCell>
                                            <TableCell>{course.courseName}</TableCell>
                                            <TableCell>{course.lecturerName}</TableCell>
                                            <TableCell>{course.department}</TableCell>
                                            <TableCell>{course.semester}</TableCell>
                                            <TableCell>{course.schedule}</TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => handleOpenDialog(course)}
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDelete(course.id)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Add/Edit Dialog */}
                <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        {editMode ? 'Edit Course' : 'Add New Course'}
                    </DialogTitle>
                    <DialogContent>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Course Information</Typography>
                        
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Course Name"
                            name="courseName"
                            value={formData.courseName}
                            onChange={handleInputChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Course Code"
                            name="courseCode"
                            value={formData.courseCode}
                            onChange={handleInputChange}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Description"
                            name="description"
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={handleInputChange}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Credits"
                            name="credits"
                            type="number"
                            value={formData.credits}
                            onChange={handleInputChange}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Department"
                            name="department"
                            value={formData.department}
                            onChange={handleInputChange}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Semester"
                            name="semester"
                            value={formData.semester}
                            onChange={handleInputChange}
                            placeholder="e.g., Fall 2025"
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Schedule"
                            name="schedule"
                            value={formData.schedule}
                            onChange={handleInputChange}
                            placeholder="e.g., Sunday 10:30"
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Max Students"
                            name="maxStudents"
                            type="number"
                            value={formData.maxStudents}
                            onChange={handleInputChange}
                        />

                        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Lecturer Information</Typography>
                        
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Lecturer Name"
                            name="lecturerName"
                            value={formData.lecturerName}
                            onChange={handleInputChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Lecturer Username"
                            name="lecturerUsername"
                            value={formData.lecturerUsername}
                            onChange={handleInputChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Lecturer Password"
                            name="lecturerPassword"
                            type="password"
                            value={formData.lecturerPassword}
                            onChange={handleInputChange}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained">
                            {editMode ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default CoursesPage;
