// Navigation Bar Component - Enhanced Design
// Modern navbar with gradient and improved styling

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  Avatar,
} from "@mui/material";
import {
  Dashboard,
  School,
  People,
  EventNote,
  Warning,
  Analytics,
  PsychologyAlt,
  Logout,
  Menu as MenuIcon,
  Assessment,
  Insights,
} from "@mui/icons-material";

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
    navigate("/login");
  };

  const menuItems = [
    { label: "Dashboard", path: "/admin", icon: <Dashboard /> },
    { label: "Courses", path: "/admin/courses", icon: <School /> },
    { label: "Course Stats", path: "/admin/course-stats", icon: <Insights /> },
    { label: "Students", path: "/admin/students", icon: <People /> },
    { label: "Reports", path: "/admin/reports", icon: <Assessment /> },
  ];

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderBottom: "none",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ py: 1.5, minHeight: "72px !important" }}>
          {/* Logo and Brand */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: 0,
              mr: 4,
              cursor: "pointer",
            }}
            onClick={() => navigate("/admin")}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: "rgba(255, 255, 255, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1.5,
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              }}
            >
              <School sx={{ color: "white", fontSize: 26 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 800,
                  fontSize: "1.125rem",
                  color: "white",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                }}
              >
                Attendance Admin
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255, 255, 255, 0.85)",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                }}
              >
                Management System
              </Typography>
            </Box>
          </Box>

          {/* Desktop Menu */}
          <Box
            sx={{
              flexGrow: 1,
              display: { xs: "none", md: "flex" },
              gap: 0.5,
              justifyContent: "center",
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.path}
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  color: "white",
                  px: 2.5,
                  py: 1,
                  fontSize: "0.875rem",
                  borderRadius: 2,
                  backgroundColor:
                    location.pathname === item.path
                      ? "rgba(255, 255, 255, 0.25)"
                      : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease",
                  fontWeight: location.pathname === item.path ? 700 : 600,
                  boxShadow:
                    location.pathname === item.path
                      ? "0 4px 12px rgba(0, 0, 0, 0.15)"
                      : "none",
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              onClick={handleMenu}
              sx={{ color: "white" }}
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
                    backgroundColor:
                      location.pathname === item.path
                        ? "rgba(102, 126, 234, 0.1)"
                        : "transparent",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {item.icon}
                    <Typography>{item.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* User Info and Logout */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                gap: 1.5,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 3,
                px: 2,
                py: 0.75,
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: "rgba(255, 255, 255, 0.3)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                }}
              >
                {currentUser?.email?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography
                variant="body2"
                sx={{
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                {currentUser?.email}
              </Typography>
            </Box>
            <Button
              sx={{
                color: "white",
                borderRadius: 2,
                px: 2.5,
                py: 1,
                fontSize: "0.875rem",
                fontWeight: 600,
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                "&:hover": {
                  backgroundColor: "rgba(239, 68, 68, 0.3)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                },
                transition: "all 0.2s ease",
              }}
              startIcon={<Logout sx={{ fontSize: 20 }} />}
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
