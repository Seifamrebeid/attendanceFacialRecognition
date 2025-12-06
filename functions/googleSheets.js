/**
 * Firebase Cloud Functions for Google Sheets Integration
 * This handles server-side operations for Google Sheets and Drive
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
    admin.initializeApp();
}

// Google Sheets configuration
const SHEET_ID = functions.config().google?.sheet_id || process.env.GOOGLE_SHEET_ID;

/**
 * Initialize Google Sheets API with service account
 */
function getGoogleSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: functions.config().google?.client_email,
            private_key: functions.config().google?.private_key?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
}

/**
 * Get photo URL from Google Drive
 */
function getPhotoUrl(fileId) {
    if (!fileId) return null;
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Cloud Function: Get all students from Google Sheets
 * HTTP endpoint: /getStudents
 */
exports.getStudents = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }

    try {
        const sheets = getGoogleSheetsClient();

        // Fetch data from Google Sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A2:E', // Adjust range as needed
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            res.json([]);
            return;
        }

        // Map rows to student objects
        const students = rows.map((row, index) => {
            const [studentNumber, name, email, enrolledCoursesStr, photoDriveId] = row;

            const enrolledCourses = enrolledCoursesStr
                ? enrolledCoursesStr.split(',').map(c => c.trim())
                : [];

            return {
                id: `student_${index}`,
                studentNumber: studentNumber || '',
                name: name || '',
                email: email || '',
                enrolledCourses,
                photoDriveId: photoDriveId || null,
                photoUrl: getPhotoUrl(photoDriveId),
            };
        });

        res.json(students);
    } catch (error) {
        console.error('Error fetching students from Google Sheets:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Configure Google credentials using Firebase Functions config
 * 
 * Run these commands to set up:
 * 
 * firebase functions:config:set google.sheet_id="YOUR_SHEET_ID"
 * firebase functions:config:set google.client_email="YOUR_SERVICE_ACCOUNT_EMAIL"
 * firebase functions:config:set google.private_key="YOUR_PRIVATE_KEY"
 * 
 * Then deploy: firebase deploy --only functions
 */

/**
 * Cloud Function: Proxy Google Drive images
 * HTTP endpoint: /proxyImage?id=FILE_ID
 * This function downloads the image from Google Drive and serves it with proper headers
 */
exports.proxyImage = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const fileId = req.query.id;

        if (!fileId) {
            res.status(400).json({ error: 'Missing file ID parameter' });
            return;
        }

        // Construct the direct Google Drive download URL
        const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        // Fetch the image from Google Drive
        const https = require('https');
        const http = require('http');

        const protocol = imageUrl.startsWith('https') ? https : http;

        protocol.get(imageUrl, (driveResponse) => {
            // Check if the response is successful
            if (driveResponse.statusCode !== 200) {
                res.status(driveResponse.statusCode).json({ error: 'Failed to fetch image from Google Drive' });
                return;
            }

            // Set proper headers for image response
            res.set('Content-Type', driveResponse.headers['content-type'] || 'image/jpeg');
            res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            res.set('Access-Control-Allow-Origin', '*');

            // Pipe the image directly to the response
            driveResponse.pipe(res);
        }).on('error', (error) => {
            console.error('Error proxying image from Google Drive:', error);
            res.status(500).json({ error: 'Failed to proxy image' });
        });
    } catch (error) {
        console.error('Error in proxyImage function:', error);
        res.status(500).json({ error: error.message });
    }
});
