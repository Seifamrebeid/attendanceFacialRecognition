import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
    LinearProgress,
    Button,
    Divider
} from '@mui/material';
import { Search, DownloadForOffline, Assessment } from '@mui/icons-material';
import { useCourse } from '../context/CourseContext';
import StudentPhoto from '../components/StudentPhoto';
import { getAllStudents } from '../services/studentsService';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ReportsPage = () => {
    const { selectedCourse } = useCourse();
    const [students, setStudents] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const TOTAL_WEEKS = 16;

    useEffect(() => {
        loadStudents();
    }, []);

    useEffect(() => {
        if (selectedCourse && students.length > 0) {
            loadCourseAttendance();
        }
    }, [selectedCourse, students]);

    const loadStudents = async () => {
        try {
            const data = await getAllStudents();
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
            const attendanceRef = collection(db, 'attendance');
            const q = query(
                attendanceRef,
                where('courseId', '==', selectedCourse.id)
            );

            const querySnapshot = await getDocs(q);
            const allRecords = [];

            querySnapshot.forEach((doc) => {
                allRecords.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

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

            allRecords.forEach(record => {
                const recordName = record.studentName || record.name || '';
                const parts = recordName.split('_');
                const studentId = parts[parts.length - 1];

                const student = students.find(s =>
                    String(s.studentNumber) === String(studentId) || String(s.id) === String(studentId)
                );

                if (student && studentAttendanceMap[student.id]) {
                    const weekNum = record.weekNumber || 1;
                    const status = record.action?.toLowerCase() || record.status || 'present';

                    studentAttendanceMap[student.id].weeklyAttendance[weekNum] = {
                        status,
                        time: record.time || record.arrivalTime,
                        confidence: record.similarity || record.confidenceScore
                    };

                    if (status === 'join' || status === 'present') {
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

        const weekNum = parseInt(selectedWeek);
        const sortedData = [...attendanceData].sort((a, b) =>
            (a.student?.name || '').localeCompare(b.student?.name || '')
        );

        // Prepare data for Excel
        const excelData = sortedData.map(({ student, weeklyAttendance }) => {
            const weekData = weeklyAttendance[weekNum];
            let status = 'No Record';

            if (weekData?.status) {
                const s = weekData.status.toLowerCase();
                if (s === 'present' || s === 'join') status = 'Present';
                else if (s === 'late') status = 'Late';
                else if (s === 'absent' || s === 'left') status = 'Absent';
                else status = s.charAt(0).toUpperCase() + s.slice(1);
            }

            return {
                'Student Name': student.name,
                'Student ID': student.studentNumber,
                'Attendance Status': status,
                'Time': weekData?.time || '-',
                'Confidence Score': weekData?.confidence ? `${(weekData.confidence * 100).toFixed(1)}%` : '-'
            };
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const wscols = [
            { wch: 30 }, // Name
            { wch: 20 }, // ID
            { wch: 20 }, // Status
            { wch: 15 }, // Time
            { wch: 15 }  // Confidence
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, `Week ${weekNum} Report`);

        // Generate filename
        const dateStr = new Date().toISOString().split('T')[0];
        const safeCourseName = (selectedCourse?.courseName || selectedCourse?.name || 'course').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeCourseName}_week_${weekNum}_report_${dateStr}.xlsx`;

        // Save file
        XLSX.writeFile(wb, fileName);
    };

    const exportFullCourseReport = () => {
        const sortedData = [...attendanceData].sort((a, b) =>
            (a.student?.name || '').localeCompare(b.student?.name || '')
        );

        // Prepare data for Excel
        const excelData = sortedData.map(({ student, weeklyAttendance, stats }) => {
            const attendancePercentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) + '%' : '0%';

            const row = {
                'Student Name': student.name,
                'Student ID': student.studentNumber,
                'Attended': stats.present,
                'Late': stats.late,
                'Absent': stats.absent,
                'Rate': attendancePercentage
            };

            for (let i = 1; i <= TOTAL_WEEKS; i++) {
                const weekData = weeklyAttendance[i];
                let displayStatus = '-';

                if (weekData?.status) {
                    const s = weekData.status.toLowerCase();
                    if (s === 'present' || s === 'join') displayStatus = 'Present';
                    else if (s === 'late') displayStatus = 'Late';
                    else if (s === 'absent' || s === 'left') displayStatus = 'Absent';
                    else displayStatus = s.charAt(0).toUpperCase() + s.slice(1);
                }

                row[`Week ${i}`] = displayStatus;
            }

            return row;
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const wscols = [
            { wch: 30 }, // Name
            { wch: 20 }, // ID
            { wch: 10 }, // Attended
            { wch: 10 }, // Late
            { wch: 10 }, // Absent
            { wch: 10 }, // Rate
        ];
        // Add width for week columns
        for (let i = 1; i <= TOTAL_WEEKS; i++) {
            wscols.push({ wch: 12 });
        }
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, 'Full Report');

        // Generate filename
        const dateStr = new Date().toISOString().split('T')[0];
        const safeCourseName = (selectedCourse?.courseName || selectedCourse?.name || 'course').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeCourseName}_full_report_${dateStr}.xlsx`;

        // Save file
        XLSX.writeFile(wb, fileName);
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
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box mb={3}>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Attendance Reports
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Comprehensive attendance overview for {selectedCourse?.name}
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
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

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3} justifyContent="center">
                        {filteredData.map(({ student, weeklyAttendance, stats }) => {
                            const attendancePercentage = getAttendancePercentage(stats);

                            return (
                                <Grid item xs={12} sm={6} md={3} lg={3} xl={3} key={student.id}>
                                    <Card
                                        sx={{
                                            height: 520,
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
                                            <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                                                <Box sx={{
                                                    width: 100,
                                                    height: 100,
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    border: '3px solid #e0e0e0',
                                                    mb: 2,
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
                                                <Typography variant="subtitle1" fontWeight="600" align="center" gutterBottom>
                                                    {student.name}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {student.studentNumber}
                                                </Typography>
                                            </Box>

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
        </Box>
    );
};

export default ReportsPage;
