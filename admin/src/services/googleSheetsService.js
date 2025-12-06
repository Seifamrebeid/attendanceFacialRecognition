// Google Sheets Service
// Fetches student data from Google Sheets

import { google } from 'googleapis';

// Initialize Google Sheets API
const getGoogleSheetsClient = () => {
    // For development: using service account credentials
    const auth = new google.auth.GoogleAuth({
        keyFile: './google-credentials.json', // Path to your credentials file
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
};

/**
 * Fetch students from Google Sheet
 * @param {string} spreadsheetId - Google Sheet ID
 * @returns {Promise<Array>} Array of student objects
 */
export const getStudentsFromSheet = async (spreadsheetId) => {
    try {
        const sheets = getGoogleSheetsClient();

        // Fetch data from the sheet
        // Assuming data is in Sheet1, starting from A1
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A2:F', // Skip header row, columns A-F
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            console.log('No data found in sheet');
            return [];
        }

        // Map rows to student objects
        // Expected columns: Student ID | Name | Email | Enrolled Courses | Photo Drive ID
        const students = rows.map((row, index) => {
            const [studentNumber, name, email, enrolledCoursesStr, photoDriveId] = row;

            // Parse enrolled courses (comma-separated)
            const enrolledCourses = enrolledCoursesStr
                ? enrolledCoursesStr.split(',').map(c => c.trim())
                : [];

            return {
                id: `sheet_${index}`, // Generate ID from row index
                studentNumber: studentNumber || '',
                name: name || '',
                email: email || '',
                enrolledCourses,
                photoDriveId: photoDriveId || null,
                source: 'google_sheets'
            };
        });

        return students;
    } catch (error) {
        console.error('Error fetching students from Google Sheets:', error);
        throw error;
    }
};

/**
 * Get student by ID from sheet
 * @param {string} spreadsheetId - Google Sheet ID
 * @param {string} studentNumber - Student number to find
 * @returns {Promise<Object|null>} Student object or null
 */
export const getStudentFromSheet = async (spreadsheetId, studentNumber) => {
    try {
        const students = await getStudentsFromSheet(spreadsheetId);
        return students.find(s => s.studentNumber === studentNumber) || null;
    } catch (error) {
        console.error('Error fetching student from sheet:', error);
        throw error;
    }
};

/**
 * Get students enrolled in a course from sheet
 * @param {string} spreadsheetId - Google Sheet ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of students
 */
export const getStudentsByCourseFromSheet = async (spreadsheetId, courseId) => {
    try {
        const students = await getStudentsFromSheet(spreadsheetId);
        return students.filter(s => s.enrolledCourses.includes(courseId));
    } catch (error) {
        console.error('Error fetching students by course from sheet:', error);
        throw error;
    }
};
