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
    ToggleButton,
    ToggleButtonGroup,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Snackbar,
    Tooltip,
    IconButton,
    Divider
} from '@mui/material';
import { Search, CheckCircle, Cancel, Warning, Send } from '@mui/icons-material';
import Navbar from '../components/Navbar';
import StudentPhotoAvatar from '../components/StudentPhotoAvatar';
import { getAllCourses } from '../services/coursesService';
import { getAllStudents } from '../services/studentsService';
import { createWarning } from '../services/warningsService';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';

const AttendancePage = () => {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [savingStudents, setSavingStudents] = useState(new Set());

    // Warning System State
    const [warningDialogOpen, setWarningDialogOpen] = useState(false);
    const [selectedStudentForWarning, setSelectedStudentForWarning] = useState(null);
    const [warningType, setWarningType] = useState('Low Attendance');
    const [warningMessage, setWarningMessage] = useState('');
    const [sendingWarning, setSendingWarning] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        loadCourses();
        loadStudents();
    }, []);

    useEffect(() => {
        if (selectedCourse && selectedWeek) {
            loadWeeklyAttendance();
        }
    }, [selectedCourse, selectedWeek]);

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

    const loadWeeklyAttendance = async () => {
        if (!selectedCourse || !selectedWeek) return;

        setLoading(true);
        setError('');

        try {
            const attendanceRef = collection(db, 'attendance');
            const q = query(
                attendanceRef,
                where('courseId', '==', selectedCourse),
                where('weekNumber', '==', selectedWeek)
            );

            const querySnapshot = await getDocs(q);
            const records = [];

            querySnapshot.forEach((docSnap) => {
                records.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            console.log(`Found ${records.length} attendance records for week ${selectedWeek}`);

            const attendanceData = students.map(student => {
                const record = records.find(r => {
                    const recordName = r.studentName || r.name || '';
                    const parts = recordName.split('_');
                    const studentId = parts[parts.length - 1];
                    return studentId === student.studentNumber || studentId === student.id;
                });

                return {
                    student,
                    record: record || null,
                    status: record ? (record.status || record.action?.toLowerCase() || 'present') : null, // null = not marked
                    arrivalTime: record?.time || record?.arrivalTime || null,
                    confidence: record?.similarity || record?.confidenceScore || null,
                    weekCount: 0 // TODO: Calculate total weeks present
                };
            });

            setAttendanceRecords(attendanceData);
        } catch (err) {
            console.error('Error loading attendance:', err);
            setError(`Failed to load attendance: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (studentId, newStatus) => {
        // Optimistically update UI
        const updatedRecords = attendanceRecords.map(record => {
            if (record.student.id === studentId) {
                return { ...record, status: newStatus };
            }
            return record;
        });
        setAttendanceRecords(updatedRecords);

        // Mark as saving
        setSavingStudents(prev => new Set(prev).add(studentId));

        try {
            const course = courses.find(c => c.id === selectedCourse);
            const attendanceData = attendanceRecords.find(a => a.student.id === studentId);
            const { student, record } = attendanceData;

            // If status is null, delete the record (clear/unmark)
            if (newStatus === null) {
                if (record) {
                    const recordRef = doc(db, 'attendance', record.id);
                    await deleteDoc(recordRef);
                    console.log(`✅ Cleared attendance for ${student.name}`);

                    // Update local state to remove record
                    const updatedWithoutRecord = attendanceRecords.map(r => {
                        if (r.student.id === studentId) {
                            return {
                                ...r,
                                record: null,
                                status: null
                            };
                        }
                        return r;
                    });
                    setAttendanceRecords(updatedWithoutRecord);
                }
                return; // Exit early
            }

            if (record) {
                // Update existing record
                const recordRef = doc(db, 'attendance', record.id);
                await updateDoc(recordRef, {
                    action: newStatus === 'present' ? 'JOIN' : newStatus === 'late' ? 'LATE' : 'LEFT',
                    updatedAt: new Date().toISOString(),
                    manuallyEdited: true
                });
                console.log(`✅ Updated ${student.name} to ${newStatus}`);
            } else {
                // Create new record matching Python facial recognition format
                const now = new Date();
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const timestampStr = now.toISOString();

                const newDoc = await addDoc(collection(db, 'attendance'), {
                    // Core fields
                    studentName: `${student.name.replace(/\s+/g, '_')}_${student.studentNumber}`,
                    courseId: selectedCourse,
                    courseCode: course?.courseCode || '',
                    courseName: course?.name || course?.courseName || '',
                    weekNumber: selectedWeek,

                    // Status/Action mapping
                    action: newStatus === 'present' ? 'JOIN' : newStatus === 'late' ? 'LATE' : 'LEFT',

                    // Date/Time fields
                    date: format(now, 'yyyy-MM-dd'),
                    time: format(now, 'HH:mm:ss'),
                    timestamp: timestampStr,
                    createdAt: timestampStr,
                    dayOfWeek: dayNames[now.getDay()],

                    // Additional course fields (defaults if not available)
                    department: course?.department || 'N/A',
                    lecturerName: course?.lecturerName || course?.instructor || 'N/A',
                    semester: course?.semester || 'Fall 2025',

                    // Confidence/Similarity (default for manual entries)
                    similarity: 1.0, // 100% confidence for manual entry

                    // Metadata
                    manualEntry: true
                });
                console.log(`✅ Created attendance for ${student.name}: ${newStatus}`);

                // Update local record with new doc ID
                const updatedWithId = attendanceRecords.map(r => {
                    if (r.student.id === studentId) {
                        return {
                            ...r,
                            record: { id: newDoc.id, status: newStatus },
                            status: newStatus
                        };
                    }
                    return r;
                });
                setAttendanceRecords(updatedWithId);
            }
        } catch (err) {
            console.error('Error saving attendance:', err);
            const studentData = attendanceRecords.find(a => a.student.id === studentId);
            setError(`Failed to save ${studentData?.student.name || 'student'}: ${err.message}`);
            // Revert on error
            await loadWeeklyAttendance();
        } finally {
            setSavingStudents(prev => {
                const newSet = new Set(prev);
                newSet.delete(studentId);
                return newSet;
            });
        }
    };

    // Warning System Handlers
    const handleOpenWarning = (student) => {
        setSelectedStudentForWarning(student);
        setWarningMessage(`Dear ${student.name}, your attendance in ${courses.find(c => c.id === selectedCourse)?.name} is concerning. Please contact me.`);
        setWarningDialogOpen(true);
    };

    const handleSendWarning = async () => {
        if (!selectedStudentForWarning) return;

        setSendingWarning(true);
        try {
            const course = courses.find(c => c.id === selectedCourse);
            await createWarning({
                courseId: selectedCourse,
                courseName: course?.name || 'Unknown Course',
                studentId: selectedStudentForWarning.id,
                studentName: selectedStudentForWarning.name,
                studentEmail: selectedStudentForWarning.email,
                warningType,
                message: warningMessage,
                createdBy: 'Admin' // You could get this from auth context
            });

            setSnackbar({
                open: true,
                message: `Warning sent to ${selectedStudentForWarning.name}`,
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

    const filteredRecords = attendanceRecords.filter(({ student }) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            student.name?.toLowerCase().includes(search) ||
            student.studentNumber?.toLowerCase().includes(search)
        );
    });

    const stats = {
        total: attendanceRecords.length,
        present: attendanceRecords.filter(a => a.status === 'present' || a.status === 'join').length,
        late: attendanceRecords.filter(a => a.status === 'late').length,
        absent: attendanceRecords.filter(a => a.status === 'absent' || a.status === 'left').length,
        captured: attendanceRecords.filter(a => a.record).length
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'present':
            case 'join':
                return 'success';
            case 'late': return 'warning';
            case 'absent':
            case 'left':
                return 'error';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Navbar />
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                {/* Header */}
                <Box mb={3}>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Student Attendance
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Real-time attendance tracking for {courses.find(c => c.id === selectedCourse)?.name || 'course'}
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
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth>
                                <InputLabel>Week</InputLabel>
                                <Select
                                    value={selectedWeek}
                                    label="Week"
                                    onChange={(e) => setSelectedWeek(e.target.value)}
                                >
                                    {Array.from({ length: 16 }, (_, i) => i + 1).map(week => (
                                        <MenuItem key={week} value={week}>Week {week}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
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

                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                                <Typography variant="body2" color="textSecondary">Total</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" fontWeight="bold" color="success.main">{stats.present}</Typography>
                                <Typography variant="body2" color="textSecondary">Present</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" fontWeight="bold" color="error.main">{stats.absent}</Typography>
                                <Typography variant="body2" color="textSecondary">Absent</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" fontWeight="bold" color="primary.main">{stats.captured}</Typography>
                                <Typography variant="body2" color="textSecondary">Camera</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Student Cards */}
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3} justifyContent="center">
                        {filteredRecords.map(({ student, status, arrivalTime, confidence, record }) => (
                            <Grid item xs={12} sm={6} md={4} lg={2.4} key={student.id} sx={{ maxWidth: { lg: '20%' }, flexBasis: { lg: '20%' } }}>
                                <Card
                                    sx={{
                                        height: 500,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.3s',
                                        border: (status === 'present' || status === 'join') ? '2px solid #4caf50' :
                                            (status === 'absent' || status === 'left') ? '2px solid #f44336' : '1px solid transparent',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4
                                        },
                                        position: 'relative'
                                    }}
                                >
                                    {/* Warning Button */}
                                    <Tooltip title="Issue Warning">
                                        <IconButton
                                            size="small"
                                            color="warning"
                                            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                                            onClick={() => handleOpenWarning(student)}
                                        >
                                            <Warning fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    <CardContent sx={{
                                        textAlign: 'center',
                                        p: 3,
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            {/* Student Photo */}
                                            <Box display="flex" justifyContent="center" mb={2}>
                                                <StudentPhotoAvatar
                                                    photoUrl={student.photoUrl}
                                                    name={student.name}
                                                    sx={{ width: 80, height: 80 }}
                                                />
                                            </Box>

                                            {/* Student Name */}
                                            <Typography variant="h6" fontWeight="600" gutterBottom>
                                                {student.name}
                                            </Typography>

                                            {/* Student ID */}
                                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                                {student.studentNumber}
                                            </Typography>

                                            {/* Status Badge */}
                                            <Box my={2}>
                                                <Chip
                                                    label={status ? status.toUpperCase() : 'NOT MARKED'}
                                                    color={status ? getStatusColor(status) : 'default'}
                                                    size="medium"
                                                    sx={{ fontWeight: 'bold', minWidth: 100 }}
                                                />
                                            </Box>

                                            {/* Arrival Time (if captured) */}
                                            {arrivalTime && (
                                                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                                                    Last seen: {arrivalTime}
                                                </Typography>
                                            )}

                                            {/* Confidence (if captured) */}
                                            {confidence && (
                                                <Typography variant="caption" color="primary" display="block" mb={1}>
                                                    Confidence: {(confidence * 100).toFixed(1)}%
                                                </Typography>
                                            )}

                                            {/* Source Indicator */}
                                            {record && (
                                                <Chip
                                                    label="Camera"
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ mb: 2 }}
                                                />
                                            )}
                                        </Box>

                                        {/* Status Toggle */}
                                        <Box mt={2}>
                                            <ToggleButtonGroup
                                                value={status === 'join' ? 'present' : status} // Normalize join to present for toggle
                                                exclusive
                                                onChange={(e, newStatus) => {
                                                    // Allow null to clear selection
                                                    handleStatusChange(student.id, newStatus);
                                                }}
                                                fullWidth
                                                size="small"
                                                disabled={savingStudents.has(student.id)}
                                            >
                                                <ToggleButton value="present" color="success">
                                                    {savingStudents.has(student.id) && (status === 'present' || status === 'join') ? <CircularProgress size={16} sx={{ mr: 0.5 }} /> : <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />}
                                                    Present
                                                </ToggleButton>
                                                <ToggleButton value="absent" color="error">
                                                    {savingStudents.has(student.id) && (status === 'absent' || status === 'left') ? <CircularProgress size={16} sx={{ mr: 0.5 }} /> : <Cancel fontSize="small" sx={{ mr: 0.5 }} />}
                                                    Absent
                                                </ToggleButton>
                                            </ToggleButtonGroup>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}

                        {filteredRecords.length === 0 && (
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

            {/* Warning Dialog */}
            <Dialog open={warningDialogOpen} onClose={() => setWarningDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" />
                    Issue Warning
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Student: <strong>{selectedStudentForWarning?.name}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            ID: {selectedStudentForWarning?.studentNumber}
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
                            placeholder="Enter the reason for this warning..."
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

            {/* Snackbar for feedback */}
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

export default AttendancePage;
