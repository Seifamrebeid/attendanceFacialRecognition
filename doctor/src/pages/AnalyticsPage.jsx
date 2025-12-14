import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    TextField,
    Card,
    CardContent,
    Grid,
    Avatar,
    Divider,
    Autocomplete,
    LinearProgress,
    Chip
} from '@mui/material';
import {
    People,
    Person,
    Timeline,
    CheckCircle,
    Cancel,
    Warning,
    HelpOutline,
    AccessTime,
    EventAvailable,
    Fingerprint
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    ReferenceLine
} from 'recharts';
import { analyticsService } from '../services/analyticsService';

// --- Components ---

const StatCard = ({ title, value, subtext, icon, color }) => (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
        <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: color }}>
                        {value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        {title}
                    </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48 }}>
                    {icon}
                </Avatar>
            </Box>
            {subtext && (
                <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                    {subtext}
                </Typography>
            )}
        </CardContent>
    </Card>
);

const StudentAvatar = ({ name, sx }) => {
    // Generate base filename: "Abdullah Nagy" -> "Abdullah_Nagy"
    const baseName = name.replace(/ /g, '_');
    const [imgSrc, setImgSrc] = useState(`/student_photos/${baseName}.jpg`);
    const [extensions] = useState(['.jpg', '.jpeg', '.png', '.webp']);
    const [tryIndex, setTryIndex] = useState(0);

    const handleError = () => {
        const nextIndex = tryIndex + 1;
        if (nextIndex < extensions.length) {
            setTryIndex(nextIndex);
            setImgSrc(`/student_photos/${baseName}${extensions[nextIndex]}`);
        } else {
            setImgSrc(null); // Give up, show initial
        }
    };

    if (!imgSrc) {
        return (
            <Avatar sx={{ ...sx, bgcolor: 'primary.main', fontSize: 32 }}>
                {name.charAt(0).toUpperCase()}
            </Avatar>
        );
    }

    return (
        <Avatar
            src={imgSrc}
            sx={{ ...sx, bgcolor: 'transparent' }}
            imgProps={{ onError: handleError }}
        >
            {name.charAt(0).toUpperCase()}
        </Avatar>
    );
};

const StudentProfile = ({ data }) => {
    const { name, id, stats, timeline } = data;

    // Prepare chart data: Cumulative Attendance Rate over time
    // Prepare chart data: Cumulative Attendance Rate over time
    let cumulativeTracked = 0;
    let cumulativePresent = 0;

    const chartData = timeline.map((t, index) => {
        // Only verify against known statuses to accumulate
        if (t.status !== 'No Data' && t.status !== 'Not Tracked') {
            cumulativeTracked++;
            if (t.status === 'Present') cumulativePresent++;
        }

        // Calculate rate based on cumulative tracked weeks
        const rate = cumulativeTracked > 0
            ? Math.round((cumulativePresent / cumulativeTracked) * 100)
            : null;

        return {
            name: t.week,
            rate: rate,
            status: t.status
        };
    });

    return (
        <Box mt={4} className="student-profile-container">
            {/* Header Section */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                <StudentAvatar name={name} sx={{ width: 100, height: 100 }} />
                <Box flex={1}>
                    <Typography variant="h4" fontWeight="bold" textTransform="capitalize">
                        {name}
                    </Typography>
                    <Box display="flex" gap={2} mt={1}>
                        <Chip icon={<Fingerprint />} label={`ID: ${id}`} variant="outlined" />
                        <Chip
                            icon={stats.attendanceRate >= 90 ? <CheckCircle /> : stats.attendanceRate >= 75 ? <Warning /> : <Cancel />}
                            label={stats.attendanceRate >= 90 ? 'Great' : stats.attendanceRate >= 75 ? 'At Risk' : 'Warning'}
                            color={stats.attendanceRate >= 90 ? 'success' : stats.attendanceRate >= 75 ? 'warning' : 'error'}
                        />
                    </Box>
                </Box>
            </Paper>

            {/* Stats Cards Row (Like the screenshot) */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Attendance Rate"
                        value={`${stats.attendanceRate}%`}
                        icon={<Timeline />}
                        color="#673ab7" // Purple
                        subtext={`${stats.weeksPresent} weeks present out of ${stats.totalWeeks}`}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Total Joins"
                        value={stats.totalJoins}
                        icon={<EventAvailable />}
                        color="#2e7d32" // Green
                        subtext="Total recognition events triggered"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Avg Similarity"
                        value={`${(stats.avgSimilarity * 100).toFixed(1)}%`}
                        icon={<Fingerprint />}
                        color="#e91e63" // Pink
                        subtext="Facial recognition confidence score"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Total Weeks"
                        value={stats.totalWeeks}
                        icon={<AccessTime />}
                        color="#1976d2" // Blue
                        subtext="Course duration tracked so far"
                    />
                </Grid>
            </Grid>

            {/* Weekly Breakdown - Grid Layout (Now on Top) */}
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Weekly Breakdown
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {timeline.map((week, idx) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={idx}>
                        <Paper
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                textAlign: 'center',
                                border: `1px solid ${week.status === 'Present' ? '#e8f5e9' : week.status === 'Absent' ? '#ffebee' : '#f5f5f5'}`,
                                bgcolor: week.status === 'Present' ? '#f1f8e9' : week.status === 'Absent' ? '#fff5f5' : '#fafafa',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'translateY(-4px)', boxShadow: 2 }
                            }}
                        >
                            <Typography variant="overline" color="textSecondary" display="block">
                                {week.week}
                            </Typography>

                            <Box my={1} display="flex" justifyContent="center">
                                {week.status === 'Present' ? (
                                    <CheckCircle sx={{ fontSize: 40, color: '#2e7d32' }} />
                                ) : week.status === 'Absent' ? (
                                    <Cancel sx={{ fontSize: 40, color: '#e57373' }} />
                                ) : (
                                    <HelpOutline sx={{ fontSize: 40, color: '#bdbdbd' }} />
                                )}
                            </Box>

                            <Chip
                                label={week.status === 'No Data' ? 'Not Tracked' : week.status}
                                size="small"
                                color={week.status === 'Present' ? 'success' : week.status === 'Absent' ? 'error' : 'default'}
                                variant={week.status === 'No Data' ? 'outlined' : 'filled'}
                                sx={{ fontWeight: 'bold' }}
                            />
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Performance Timeline - Upgraded to Area Chart */}
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Performance Timeline
            </Typography>
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2, height: 450 }}>
                <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" color="textSecondary">
                        Cumulative Attendance Analysis
                    </Typography>
                    <Box display="flex" gap={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 12, height: 12, bgcolor: '#673ab7', borderRadius: '50%' }} />
                            <Typography variant="caption">Student Rate</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 12, height: 2, bgcolor: '#00c853' }} />
                            <Typography variant="caption">Target (90%)</Typography>
                        </Box>
                    </Box>
                </Box>

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#673ab7" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#673ab7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            unit="%"
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666' }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}
                            labelStyle={{ color: '#333', fontWeight: 'bold', marginBottom: 5 }}
                        />
                        <ReferenceLine y={90} stroke="#00c853" strokeDasharray="5 5" strokeWidth={2} />
                        <Area
                            type="monotone"
                            dataKey="rate"
                            stroke="#673ab7"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorRate)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Paper>
        </Box>
    );
};

const AnalyticsPage = () => {
    const [totalStudentsInput, setTotalStudentsInput] = useState(''); // The bar user asked for
    const [loading, setLoading] = useState(false);
    const [rawData, setRawData] = useState(null);
    const [searchOptions, setSearchOptions] = useState([]); // List of student names
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentStats, setStudentStats] = useState(null);

    // Load baseline data on mount
    useEffect(() => {
        loadGlobalData();
    }, []);

    const loadGlobalData = async () => {
        setLoading(true);
        const data = await analyticsService.getAttendanceData();
        setRawData(data);

        // Populate search options
        // data.detectedStudents is an array of names
        setSearchOptions(data.detectedStudents.sort());
        setLoading(false);
    };

    // When a student is selected, calculate their specific stats
    useEffect(() => {
        if (selectedStudent && rawData) {
            const stats = analyticsService.getStudentStats(selectedStudent, rawData.records, rawData.totalWeeks);
            setStudentStats(stats);
        } else {
            setStudentStats(null);
        }
    }, [selectedStudent, rawData]);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
            {/* Top Configuration Bar */}
            <Box mb={4} display="flex" gap={3} alignItems="center" flexWrap="wrap">
                <Typography variant="h4" fontWeight="bold">Student Performance</Typography>
            </Box>

            {/* Clean Layout: Large Search Bar + Total Student Badge */}
            <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
                <Box display="flex" flexDirection="column" gap={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" color="textSecondary">
                            Find Student Profile
                        </Typography>
                        <Chip
                            icon={<People />}
                            label="Total Class Size: 71"
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

                    <Autocomplete
                        options={searchOptions}
                        value={selectedStudent}
                        onChange={(event, newValue) => setSelectedStudent(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Search Student Name..."
                                variant="outlined"
                                fullWidth
                                placeholder="Type name (e.g. Omar...)"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '1.2rem',
                                        padding: '8px'
                                    }
                                }}
                            />
                        )}
                    />
                </Box>
            </Paper>

            {/* Content Area */}
            {studentStats ? (
                <StudentProfile data={studentStats} />
            ) : (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    height={300}
                    color="text.secondary"
                >
                    <People sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">Select a student to view detailed analytics</Typography>
                    <Typography variant="body2">Use the search bar above to find a profile.</Typography>
                </Box>
            )}

        </Container>
    );
};

export default AnalyticsPage;
