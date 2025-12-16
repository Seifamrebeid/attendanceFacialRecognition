// Warnings Page - High Risk Students
// Displays students with 3+ absences and allows issuing warnings

import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Button,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Snackbar,
    Chip
} from '@mui/material';
import { Warning, Send, Refresh, History } from '@mui/icons-material';
import Navbar from '../components/Navbar';
import StudentPhotoAvatar from '../components/StudentPhotoAvatar';
import { getHighRiskStudents } from '../services/attendanceService';
import { createWarning } from '../services/warningsService';
import { getAllCourses } from '../services/coursesService';

const WarningsPage = () => {
    const [atRiskStudents, setAtRiskStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [courses, setCourses] = useState([]);

    // Warning System State
    const [warningDialogOpen, setWarningDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [warningType, setWarningType] = useState('Low Attendance');
    const [warningMessage, setWarningMessage] = useState('');
    const [sendingWarning, setSendingWarning] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [studentsData, coursesData] = await Promise.all([
                getHighRiskStudents(3), // Threshold of 3 absences
                getAllCourses()
            ]);
            setAtRiskStudents(studentsData);
            setCourses(coursesData);
        } catch (err) {
            console.error(err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenWarning = (student) => {
        setSelectedStudent(student);
        // Find a course they are enrolled in or just pick the first one for context if needed
        // For now, we'll let the user specify or just use a generic message
        setWarningMessage(`Dear ${student.name}, you have accumulated ${student.absenceCount} absences. Please contact the administration.`);
        setWarningDialogOpen(true);
    };

    const handleSendWarning = async () => {
        if (!selectedStudent) return;

        setSendingWarning(true);
        try {
            // We need a course ID. If we don't have one specific to the absence, 
            // we might need to ask the user to select one in the dialog.
            // For now, we'll try to find a course or use a placeholder.
            const defaultCourse = courses[0];

            await createWarning({
                courseId: defaultCourse?.id || 'general',
                courseName: defaultCourse?.name || 'General Warning',
                studentId: selectedStudent.id,
                studentName: selectedStudent.name,
                studentEmail: selectedStudent.email,
                warningType,
                message: warningMessage,
                createdBy: 'Admin'
            });

            setSnackbar({
                open: true,
                message: `Warning sent to ${selectedStudent.name}`,
                severity: 'success'
            });
            setWarningDialogOpen(false);
        } catch (error) {
            console.error('Failed to send warning:', error);
            setSnackbar({
                open: true,
                message: 'Failed to send warning. Please try again.',
                severity: 'error'
            });
        } finally {
            setSendingWarning(false);
        }
    };

    return (
        <Box>
            <Navbar />
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h4" gutterBottom fontWeight="bold">
                            At-Risk Students
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Students with 3 or more absences
                        </Typography>
                    </Box>
                    <Button
                        startIcon={<Refresh />}
                        onClick={loadData}
                        variant="outlined"
                    >
                        Refresh
                    </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {atRiskStudents.length === 0 ? (
                            <Grid item xs={12}>
                                <Alert severity="success">
                                    No students currently meet the high-risk threshold (3+ absences).
                                </Alert>
                            </Grid>
                        ) : (
                            atRiskStudents.map((student) => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={student.id}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            border: '1px solid #ff9800', // Warning color border
                                            boxShadow: 3
                                        }}
                                    >
                                        <Tooltip title="Issue Warning">
                                            <IconButton
                                                color="warning"
                                                sx={{ position: 'absolute', top: 8, right: 8 }}
                                                onClick={() => handleOpenWarning(student)}
                                            >
                                                <Warning />
                                            </IconButton>
                                        </Tooltip>

                                        <CardContent sx={{ flex: 1, textAlign: 'center', pt: 4 }}>
                                            <Box display="flex" justifyContent="center" mb={2}>
                                                <StudentPhotoAvatar
                                                    photoUrl={student.photoUrl}
                                                    name={student.name}
                                                    sx={{ width: 100, height: 100 }}
                                                />
                                            </Box>

                                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                                {student.name}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                                {student.studentNumber}
                                            </Typography>

                                            <Box mt={2}>
                                                <Chip
                                                    label={`${student.absenceCount} Absences`}
                                                    color="error"
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </Box>
                                        </CardContent>

                                        <Box p={2} pt={0}>
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                fullWidth
                                                startIcon={<Send />}
                                                onClick={() => handleOpenWarning(student)}
                                            >
                                                Issue Warning
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>
                            ))
                        )}
                    </Grid>
                )}
            </Container>

            {/* Warning Dialog */}
            <Dialog open={warningDialogOpen} onClose={() => setWarningDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" />
                    Issue Warning
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Student: <strong>{selectedStudent?.name}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Total Absences: {selectedStudent?.absenceCount}
                        </Typography>

                        <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                            <InputLabel>Warning Type</InputLabel>
                            <Select
                                value={warningType}
                                label="Warning Type"
                                onChange={(e) => setWarningType(e.target.value)}
                            >
                                <MenuItem value="Low Attendance">Low Attendance</MenuItem>
                                <MenuItem value="Misconduct">Misconduct</MenuItem>
                                <MenuItem value="Late Submission">Late Submission</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Course Selection (Optional but good) */}
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Course Context</InputLabel>
                            <Select
                                value={courses.length > 0 ? courses[0].id : ''} // Defaulting for now
                                label="Course Context"
                                disabled
                            >
                                {courses.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Warning Message"
                            value={warningMessage}
                            onChange={(e) => setWarningMessage(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWarningDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSendWarning}
                        variant="contained"
                        color="warning"
                        startIcon={sendingWarning ? <CircularProgress size={20} /> : <Send />}
                        disabled={sendingWarning}
                    >
                        Send Warning
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default WarningsPage;
