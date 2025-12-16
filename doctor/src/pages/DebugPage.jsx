import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Paper, Button, Alert, Grid, Card, CardContent } from '@mui/material';
import { getAllCourses } from '../services/coursesService';
import { getAttendanceByCourse } from '../services/attendanceService';

const DebugPage = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await getAllCourses();
      console.log('Courses loaded:', data);
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err) {
      setError('Failed to load courses: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!selectedCourseId) {
      setError('Please select a course');
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('Loading attendance for course:', selectedCourseId);
      const data = await getAttendanceByCourse(selectedCourseId);
      console.log('Attendance data loaded:', data);
      setAttendanceData(data);
    } catch (err) {
      setError('Failed to load attendance: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Debug Page</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Courses</Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">Total courses: {courses.length}</Typography>
          {courses.length > 0 && (
            <>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{ padding: '8px', marginRight: '8px', marginTop: '8px' }}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} - {c.courseName} (ID: {c.id})
                  </option>
                ))}
              </select>
              <Button
                variant="contained"
                onClick={loadAttendance}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                Load Attendance
              </Button>
            </>
          )}
        </Box>

        <Box sx={{ maxHeight: 300, overflowY: 'auto', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
          <Typography variant="caption" component="pre" sx={{ fontSize: '10px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(courses, null, 2)}
          </Typography>
        </Box>
      </Paper>

      {attendanceData.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Attendance Records ({attendanceData.length})</Typography>
          
          <Grid container spacing={2}>
            {attendanceData.slice(0, 5).map((record, idx) => (
              <Grid item xs={12} key={idx}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2">{record.studentName}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Week: {record.weekNumber} | Course: {record.courseCode} | Action: {record.action}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                      ID: {record.id}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ maxHeight: 300, overflowY: 'auto', bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography variant="caption" component="pre" sx={{ fontSize: '9px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(attendanceData.slice(0, 3), null, 2)}
            </Typography>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default DebugPage;
