// Late Analytics Page - Smart Late Threshold Detection
// Dynamic threshold calculation with visualizations

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
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    Button,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert
} from '@mui/material';
import { Analytics, Calculate } from '@mui/icons-material';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import Navbar from '../components/Navbar';
import { getAllCourses } from '../services/coursesService';
import {
    calculateLateThreshold,
    getArrivalTimeDistribution,
    getWeeklyLateTrend
} from '../services/analyticsService';

const LateAnalyticsPage = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [method, setMethod] = useState('meanPlusSD');
    const [fixedMinutes, setFixedMinutes] = useState(10);
    const [percentileValue, setPercentileValue] = useState(75);
    const [thresholdInfo, setThresholdInfo] = useState(null);
    const [distribution, setDistribution] = useState([]);
    const [weeklyTrend, setWeeklyTrend] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const data = await getAllCourses();
            setCourses(data);
        } catch (err) {
            setError('Failed to load courses');
        }
    };

    const calculateThreshold = async () => {
        if (!selectedCourse) {
            setError('Please select a course');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Calculate threshold
            const threshold = await calculateLateThreshold(
                selectedCourse,
                method,
                fixedMinutes,
                percentileValue
            );
            setThresholdInfo(threshold);

            // Get distribution data
            const dist = await getArrivalTimeDistribution(selectedCourse);
            setDistribution(dist);

            // Get weekly trend
            const trend = await getWeeklyLateTrend(selectedCourse);
            setWeeklyTrend(trend);
        } catch (err) {
            setError('Failed to calculate threshold: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Late Threshold Analytics
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Smart, data-driven late detection system
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Configuration Panel */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Threshold Configuration
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Select Course</InputLabel>
                                <Select
                                    value={selectedCourse}
                                    label="Select Course"
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                >
                                    {courses.map(course => (
                                        <MenuItem key={course.id} value={course.id}>
                                            {course.name} ({course.code})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Calculation Method
                            </Typography>
                            <RadioGroup
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                            >
                                <FormControlLabel
                                    value="fixed"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant="body2">
                                                <strong>Fixed</strong> - Set a fixed number of minutes after start time
                                            </Typography>
                                            {method === 'fixed' && (
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label="Minutes"
                                                    value={fixedMinutes}
                                                    onChange={(e) => setFixedMinutes(Number(e.target.value))}
                                                    sx={{ mt: 1, width: 150 }}
                                                />
                                            )}
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="meanPlusSD"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant="body2">
                                                <strong>Mean + Standard Deviation</strong> - Average arrival time + 1 SD
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Recommended: Adapts to class patterns, accounts for variability
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="percentile"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant="body2">
                                                <strong>Percentile-Based</strong> - Use a specific percentile of arrival times
                                            </Typography>
                                            {method === 'percentile' && (
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label="Percentile"
                                                    value={percentileValue}
                                                    onChange={(e) => setPercentileValue(Number(e.target.value))}
                                                    sx={{ mt: 1, width: 150 }}
                                                    inputProps={{ min: 0, max: 100 }}
                                                />
                                            )}
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                startIcon={<Calculate />}
                                onClick={calculateThreshold}
                                disabled={loading || !selectedCourse}
                            >
                                Calculate Threshold
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {loading && (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Results */}
                {thresholdInfo && !loading && (
                    <>
                        {/* Threshold Info Cards */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Class Start Time
                                        </Typography>
                                        <Typography variant="h4">
                                            {thresholdInfo.startTime}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ backgroundColor: 'warning.light' }}>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Late Threshold
                                        </Typography>
                                        <Typography variant="h4">
                                            {thresholdInfo.thresholdTime}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Method Used
                                        </Typography>
                                        <Typography variant="h6">
                                            {method === 'fixed' && 'Fixed'}
                                            {method === 'meanPlusSD' && 'Mean + SD'}
                                            {method === 'percentile' && `${percentileValue}th Percentile`}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Arrival Time Distribution Chart */}
                        {distribution.length > 0 && (
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Arrival Time Distribution
                                </Typography>
                                <Typography variant="body2" color="textSecondary" paragraph>
                                    Histogram showing when students typically arrive. The red line indicates the late threshold.
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={distribution}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="present" stackId="a" fill="#4caf50" name="On Time" />
                                        <Bar dataKey="late" stackId="a" fill="#ff9800" name="Late" />
                                        <ReferenceLine
                                            x={thresholdInfo.thresholdTime}
                                            stroke="red"
                                            strokeWidth={2}
                                            label="Late Threshold"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        )}

                        {/* Weekly Late Trend */}
                        {weeklyTrend.length > 0 && (
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Weekly Late Arrival Trend
                                </Typography>
                                <Typography variant="body2" color="textSecondary" paragraph>
                                    Number of late arrivals per week over the last 8 weeks
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={weeklyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="week" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="late"
                                            stroke="#ff9800"
                                            strokeWidth={2}
                                            name="Late Arrivals"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="present"
                                            stroke="#4caf50"
                                            strokeWidth={2}
                                            name="On Time"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Paper>
                        )}
                    </>
                )}

                {!thresholdInfo && !loading && (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Analytics sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography color="textSecondary">
                            Select a course and calculation method, then click "Calculate Threshold"
                        </Typography>
                    </Paper>
                )}
            </Container>
        </Box>
    );
};

export default LateAnalyticsPage;
