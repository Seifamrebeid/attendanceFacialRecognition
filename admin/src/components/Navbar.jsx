// Navigation Bar Component - Enhanced Design
// Modern navbar with gradient and improved styling

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Container,
    Avatar
} from '@mui/material';
import {
    Dashboard,
    School,
    People,
    EventNote,
    Warning,
    Analytics,
    PsychologyAlt,
    Logout,
    Menu as MenuIcon
} from '@mui/icons-material';

const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const menuItems = [
        { label: 'Dashboard', path: '/admin', icon: <Dashboard /> },
        { label: 'Courses', path: '/admin/courses', icon: <School /> },
        { label: 'Students', path: '/admin/students', icon: <People /> },
        { label: 'Attendance', path: '/admin/attendance', icon: <EventNote /> },
        { label: 'Warnings', path: '/admin/warnings', icon: <Warning /> },
        { label: 'Analytics', path: '/admin/analytics', icon: <Analytics /> },
        { label: 'Predictions', path: '/admin/predictions', icon: <PsychologyAlt /> }
    ];

    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            <Container maxWidth="xl">
                <Toolbar sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 0, mr: 4 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background: 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 2,
                            }}
                        >
                            <School sx={{ color: 'white' }} />
                        </Box>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                fontWeight: 700,
                                color: 'white',
                                letterSpacing: '-0.5px',
                            }}
                        >
                            Attendance Admin
                        </Typography>
                    </Box>

                    {/* Desktop Menu */}
                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
                        {menuItems.map((item) => (
                            <Button
                                key={item.path}
                                startIcon={item.icon}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    color: 'white',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    backgroundColor: location.pathname === item.path
                                        ? 'rgba(255, 255, 255, 0.2)'
                                        : 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    },
                                    fontWeight: location.pathname === item.path ? 600 : 500,
                                }}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </Box>

                    {/* Mobile Menu */}
                    <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                        <IconButton
                            size="large"
                            onClick={handleMenu}
                            sx={{ color: 'white' }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                            PaperProps={{
                                sx: {
                                    borderRadius: 2,
                                    mt: 1,
                                },
                            }}
                        >
                            {menuItems.map((item) => (
                                <MenuItem
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        handleClose();
                                    }}
                                    sx={{
                                        py: 1.5,
                                        px: 3,
                                        backgroundColor: location.pathname === item.path
                                            ? 'rgba(102, 126, 234, 0.1)'
                                            : 'transparent',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        {item.icon}
                                        <Typography>{item.label}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>

                    {/* User Info and Logout */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                                sx={{
                                    width: 36,
                                    height: 36,
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                }}
                            >
                                {currentUser?.email?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'white',
                                    fontWeight: 500,
                                }}
                            >
                                {currentUser?.email}
                            </Typography>
                        </Box>
                        <Button
                            sx={{
                                color: 'white',
                                borderRadius: 2,
                                px: 2,
                                py: 1,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                },
                            }}
                            startIcon={<Logout />}
                            onClick={handleLogout}
                        >
                            Logout
                        </Button>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Navbar;
