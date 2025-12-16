// Protected Route Component
// Redirects to login if user is not authenticated

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();

    // Show loading spinner while checking auth state
    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    // Redirect to login if not authenticated
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Render children if authenticated
    return children;
};

export default ProtectedRoute;
