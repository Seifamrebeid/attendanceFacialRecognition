// Admin Dashboard - Landing Page
// Shows overview statistics and quick links

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    CircularProgress
} from '@mui/material';
import {
    School,
    People,
    Warning,
    TrendingUp
} from '@mui/icons-material';
import Navbar from '../components/Navbar';
import { getAllCourses } from '../services/coursesService';
import { getAllStudents } from '../services/studentsService';
import { getAllWarnings } from '../services/warningsService';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalStudents: 0,
        totalWarnings: 0,
        highRiskStudents: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [courses, students, warnings] = await Promise.all([
                getAllCourses(),
                getAllStudents(),
                getAllWarnings()
            ]);

            setStats({
                totalCourses: courses.length,
                totalStudents: students.length,
                totalWarnings: warnings.length,
                highRiskStudents: warnings.filter(w => w.absenceCount >= 5).length
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon, color, onClick }) => (
        <Card
            sx={{
                height: '100%',
                cursor: onClick ? 'pointer' : 'default',
                '&:hover': onClick ? { boxShadow: 6 } : {}
            }}
            onClick={onClick}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                            {title}
                        </Typography>
                        <Typography variant="h3" component="div">
                            {loading ? <CircularProgress size={30} /> : value}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            backgroundColor: `${color}.light`,
                            borderRadius: 2,
                            p: 2
                        }}
                    >
                        {React.cloneElement(icon, {
                            sx: { fontSize: 40, color: `${color}.main` }
                        })}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Admin Dashboard
                </Typography>
                <Typography variant="body1" color="textSecondary" paragraph>
                    Overview of the attendance management system
                </Typography>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Courses"
                            value={stats.totalCourses}
                            icon={<School />}
                            color="primary"
                            onClick={() => navigate('/admin/courses')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Students"
                            value={stats.totalStudents}
                            icon={<People />}
                            color="success"
                            onClick={() => navigate('/admin/students')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Active Warnings"
                            value={stats.totalWarnings}
                            icon={<Warning />}
                            color="warning"
                            onClick={() => navigate('/admin/warnings')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="High Risk Students"
                            value={stats.highRiskStudents}
                            icon={<TrendingUp />}
                            color="error"
                            onClick={() => navigate('/admin/predictions')}
                        />
                    </Grid>
                </Grid>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Quick Actions
                                </Typography>
                                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        onClick={() => navigate('/admin/attendance')}
                                    >
                                        View Attendance Records
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={() => navigate('/admin/analytics')}
                                    >
                                        Late Analytics
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={() => navigate('/admin/predictions')}
                                    >
                                        Absence Risk Predictions
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    System Information
                                </Typography>
                                <Box mt={2}>
                                    <Typography variant="body2" color="textSecondary" paragraph>
                                        <strong>Attendance Tracking:</strong> Automatic facial recognition system
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" paragraph>
                                        <strong>Warning System:</strong> Automatic emails after 3 absences
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" paragraph>
                                        <strong>Smart Analytics:</strong> Dynamic late threshold detection
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        <strong>Predictions:</strong> AI-based absence probability model
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default AdminDashboard;
