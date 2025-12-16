// Absence Prediction Page - Predictive Analytics
// Predict which students are likely to be absent next week

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
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Alert,
    LinearProgress,
    Avatar
} from '@mui/material';
import { PsychologyAlt, Calculate } from '@mui/icons-material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import { getAllCourses } from '../services/coursesService';
import {
    predictForCourse,
    savePredictions,
    getLatestPredictions
} from '../services/predictionService';

const AbsencePredictionPage = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

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

    const generatePredictions = async () => {
        if (!selectedCourse) {
            setError('Please select a course');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Generate predictions
            const data = await predictForCourse(selectedCourse);
            setPredictions(data);
            setLastUpdated(new Date());

            // Save to Firestore
            await savePredictions(data);
        } catch (err) {
            setError('Failed to generate predictions: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadExistingPredictions = async () => {
        if (!selectedCourse) return;

        setLoading(true);
        try {
            const data = await getLatestPredictions(selectedCourse);
            setPredictions(data);
            if (data.length > 0) {
                setLastUpdated(data[0].generatedAt);
            }
        } catch (err) {
            console.error('Failed to load existing predictions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCourse) {
            loadExistingPredictions();
        }
    }, [selectedCourse]);

    const getRiskColor = (riskLevel) => {
        switch (riskLevel) {
            case 'critical':
                return 'error';
            case 'high':
                return 'warning';
            case 'medium':
                return 'info';
            default:
                return 'success';
        }
    };

    const getBarColor = (probability) => {
        if (probability >= 0.7) return '#d32f2f';
        if (probability >= 0.5) return '#ff9800';
        if (probability >= 0.3) return '#2196f3';
        return '#4caf50';
    };

    // Prepare data for chart (top 10 at-risk students)
    const chartData = predictions
        .slice(0, 10)
        .map(p => ({
            name: p.studentName.split(' ')[0], // First name only for chart
            probability: (p.absenceProbability * 100).toFixed(1),
            probabilityValue: p.absenceProbability
        }));

    return (
        <Box>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Absence Risk Prediction
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    AI-based prediction of students likely to miss next week's classes
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Configuration Panel */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <FormControl sx={{ minWidth: 300 }}>
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

                        <Button
                            variant="contained"
                            startIcon={<Calculate />}
                            onClick={generatePredictions}
                            disabled={loading || !selectedCourse}
                        >
                            Generate Predictions
                        </Button>

                        {lastUpdated && (
                            <Typography variant="caption" color="textSecondary">
                                Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm')}
                            </Typography>
                        )}
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <strong>Prediction Model:</strong> Uses 4 weighted features:
                        </Typography>
                        <Typography variant="caption" component="div">
                            • Attendance Rate (40%) • Recent Trend (30%) • Late Frequency (20%) • Confidence Score (10%)
                        </Typography>
                    </Alert>
                </Paper>

                {loading && (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Results */}
                {predictions.length > 0 && !loading && (
                    <>
                        {/* Top 10 Chart */}
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Top 10 At-Risk Students
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis label={{ value: 'Absence Probability (%)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Bar dataKey="probability" name="Absence Probability (%)">
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(entry.probabilityValue)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>

                        {/* Full Table */}
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Student Name</strong></TableCell>
                                        <TableCell><strong>Email</strong></TableCell>
                                        <TableCell align="center"><strong>Absence Probability</strong></TableCell>
                                        <TableCell align="center"><strong>Risk Level</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {predictions.map((prediction) => (
                                        <TableRow
                                            key={prediction.studentId}
                                            hover
                                            sx={{
                                                backgroundColor:
                                                    prediction.absenceProbability >= 0.7
                                                        ? 'rgba(211, 47, 47, 0.05)'
                                                        : prediction.absenceProbability >= 0.5
                                                            ? 'rgba(255, 152, 0, 0.05)'
                                                            : 'transparent'
                                            }}
                                        >
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={2}>
                                                    <Avatar
                                                        src={prediction.studentPhotoUrl}
                                                        alt={prediction.studentName}
                                                        sx={{ width: 32, height: 32 }}
                                                    >
                                                        {prediction.studentName?.charAt(0)}
                                                    </Avatar>
                                                    {prediction.studentName}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{prediction.studentEmail}</TableCell>
                                            <TableCell align="center">
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {(prediction.absenceProbability * 100).toFixed(1)}%
                                                    </Typography>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={prediction.absenceProbability * 100}
                                                        sx={{
                                                            mt: 0.5,
                                                            height: 6,
                                                            borderRadius: 3,
                                                            backgroundColor: 'grey.300',
                                                            '& .MuiLinearProgress-bar': {
                                                                backgroundColor: getBarColor(prediction.absenceProbability)
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={prediction.riskLevel.toUpperCase()}
                                                    color={getRiskColor(prediction.riskLevel)}
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Box mt={2}>
                            <Typography variant="body2" color="textSecondary">
                                Showing {predictions.length} predictions •{' '}
                                {predictions.filter(p => p.absenceProbability >= 0.7).length} critical risk •{' '}
                                {predictions.filter(p => p.absenceProbability >= 0.5 && p.absenceProbability < 0.7).length} high risk
                            </Typography>
                        </Box>
                    </>
                )}

                {!predictions.length && !loading && (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <PsychologyAlt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography color="textSecondary">
                            Select a course and click "Generate Predictions" to see absence risk analysis
                        </Typography>
                    </Paper>
                )}
            </Container>
        </Box>
    );
};

export default AbsencePredictionPage;
