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
import { Warning, Send, Refresh } from '@mui/icons-material';
import StudentPhoto from '../components/StudentPhoto';
import { getHighRiskStudents } from '../services/attendanceService';
import { createWarning } from '../services/warningsService';
import { useCourse } from '../context/CourseContext';

const WarningsPage = () => {
    const { selectedCourse } = useCourse();
    const [atRiskStudents, setAtRiskStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Warning System State
    const [warningDialogOpen, setWarningDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [warningType, setWarningType] = useState('Low Attendance');
    const [warningMessage, setWarningMessage] = useState('');
    const [sendingWarning, setSendingWarning] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCourse]);

    const loadData = async () => {
        if (!selectedCourse) return;

        setLoading(true);
        try {
            const studentsData = await getHighRiskStudents(3, selectedCourse.id);
            setAtRiskStudents(studentsData);
        } catch (err) {
            console.error(err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenWarning = (student) => {
        setSelectedStudent(student);
        setWarningMessage(`Dear ${student.name}, you have accumulated ${student.absenceCount} absences. Please contact the administration.`);
        setWarningDialogOpen(true);
    };

    const handleSendWarning = async () => {
        if (!selectedStudent || !selectedCourse) return;

        setSendingWarning(true);
        try {
            await createWarning({
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
                studentId: selectedStudent.id,
                studentName: selectedStudent.name,
                studentEmail: selectedStudent.email,
                warningType,
                message: warningMessage,
                createdBy: 'Doctor'
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
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h4" gutterBottom fontWeight="bold">
                            At-Risk Students
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Students with 3 or more absences in {selectedCourse?.name}
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
                                            border: '1px solid #ff9800',
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
                                                <Box sx={{
                                                    width: 100,
                                                    height: 100,
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    border: '3px solid #e0e0e0',
                                                    '& img': { width: '100%', height: '100%', objectFit: 'cover' },
                                                    '& .photo-placeholder': {
                                                        width: '100%',
                                                        height: '100%',
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '32px',
                                                        fontWeight: 'bold'
                                                    }
                                                }}>
                                                    <StudentPhoto
                                                        photoUrl={student.photoUrl}
                                                        name={student.name}
                                                    />
                                                </Box>
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
