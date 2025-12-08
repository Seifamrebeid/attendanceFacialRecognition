// Main App Component
// Sets up routing and authentication

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import CoursesPage from './pages/CoursesPage';
import StudentsPage from './pages/StudentsPage';
import AttendancePage from './pages/AttendancePage';
import WarningsPage from './pages/WarningsPage';
import LateAnalyticsPage from './pages/LateAnalyticsPage';
import AbsencePredictionPage from './pages/AbsencePredictionPage';
import ReportsPage from './pages/ReportsPage';

// Create Material-UI theme with modern design
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2563eb',
            light: '#60a5fa',
            dark: '#1e40af',
        },
        secondary: {
            main: '#8b5cf6',
            light: '#a78bfa',
            dark: '#7c3aed',
        },
        success: {
            main: '#10b981',
        },
        warning: {
            main: '#f59e0b',
        },
        error: {
            main: '#ef4444',
        },
        background: {
            default: '#f8fafc',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: [
            'Inter',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            'sans-serif',
        ].join(','),
        h4: {
            fontWeight: 700,
        },
        h6: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 20px',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
        },
    },
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
                <Router>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<LoginPage />} />

                        {/* Protected Admin Routes */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/courses"
                            element={
                                <ProtectedRoute>
                                    <CoursesPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/students"
                            element={
                                <ProtectedRoute>
                                    <StudentsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/attendance"
                            element={
                                <ProtectedRoute>
                                    <AttendancePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/warnings"
                            element={
                                <ProtectedRoute>
                                    <WarningsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/analytics"
                            element={
                                <ProtectedRoute>
                                    <LateAnalyticsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/reports"
                            element={
                                <ProtectedRoute>
                                    <ReportsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/predictions"
                            element={
                                <ProtectedRoute>
                                    <AbsencePredictionPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to="/admin" replace />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
