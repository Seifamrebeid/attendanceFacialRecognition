// Google Sheets Service
// Fetches student data from Google Sheets using REST API (client-side compatible)

// Get API key from environment variables
// Add VITE_GOOGLE_SHEETS_API_KEY to your .env file
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || "";

/**
 * Fetch students from Google Sheet using REST API
 * Note: The Google Sheet must be publicly accessible or shared with "Anyone with the link"
 * @param {string} spreadsheetId - Google Sheet ID
 * @param {string} apiKey - Google Sheets API key (optional, uses env var if not provided)
 * @returns {Promise<Array>} Array of student objects
 */
export const getStudentsFromSheet = async (spreadsheetId, apiKey = API_KEY) => {
  try {
    // If no API key is provided, return empty array
    if (!apiKey) {
      console.warn(
        "No Google Sheets API key provided. Skipping Google Sheets integration."
      );
      return [];
    }

    const range = "Sheet1!A2:F"; // Skip header row, columns A-F
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Google Sheets API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length === 0) {
      console.log("No data found in sheet");
      return [];
    }

    // Map rows to student objects
    // Expected columns: Student ID | Name | Email | Enrolled Courses | Photo Drive ID
    const students = rows.map((row, index) => {
      const [studentNumber, name, email, enrolledCoursesStr, photoDriveId] =
        row;

      // Parse enrolled courses (comma-separated)
      const enrolledCourses = enrolledCoursesStr
        ? enrolledCoursesStr.split(",").map((c) => c.trim())
        : [];

      return {
        id: `sheet_${index}`, // Generate ID from row index
        studentNumber: studentNumber || "",
        name: name || "",
        email: email || "",
        enrolledCourses,
        photoDriveId: photoDriveId || null,
        source: "google_sheets",
      };
    });

    return students;
  } catch (error) {
    console.error("Error fetching students from Google Sheets:", error);
    throw error;
  }
};

/**
 * Get student by ID from sheet
 * @param {string} spreadsheetId - Google Sheet ID
 * @param {string} studentNumber - Student number to find
 * @param {string} apiKey - Google Sheets API key (optional)
 * @returns {Promise<Object|null>} Student object or null
 */
export const getStudentFromSheet = async (
  spreadsheetId,
  studentNumber,
  apiKey = API_KEY
) => {
  try {
    const students = await getStudentsFromSheet(spreadsheetId, apiKey);
    return students.find((s) => s.studentNumber === studentNumber) || null;
  } catch (error) {
    console.error("Error fetching student from sheet:", error);
    throw error;
  }
};

/**
 * Get students enrolled in a course from sheet
 * @param {string} spreadsheetId - Google Sheet ID
 * @param {string} courseId - Course ID
 * @param {string} apiKey - Google Sheets API key (optional)
 * @returns {Promise<Array>} Array of students
 */
export const getStudentsByCourseFromSheet = async (
  spreadsheetId,
  courseId,
  apiKey = API_KEY
) => {
  try {
    const students = await getStudentsFromSheet(spreadsheetId, apiKey);
    return students.filter((s) => s.enrolledCourses.includes(courseId));
  } catch (error) {
    console.error("Error fetching students by course from sheet:", error);
    throw error;
  }
};
