// Students Service
// Parse students from CSV file

/**
 * Parse CSV data to student objects
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of student objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const students = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV parsing (respecting quotes)
    const values = [];
    let inQuote = false;
    let currentValue = "";

    for (let char of line) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === "," && !inQuote) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const name = values[0] || "";
    const studentNumber = values[1] || "";

    let email = "";
    let photoId = "";

    // Check remaining columns for email and photo
    for (let j = 2; j < values.length; j++) {
      const val = values[j];

      if (val.includes("@") && !val.includes("drive.google.com")) {
        email = val;
      } else if (val.includes("drive.google.com")) {
        // Extract ID from various Google Drive URL formats
        // Format 1: https://drive.google.com/open?id=XXXXX
        // Format 2: https://drive.google.com/file/d/XXXXX/view
        // Format 3: https://drive.google.com/uc?id=XXXXX
        if (val.includes("id=")) {
          const match = val.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) photoId = match[1];
        } else if (val.includes("/d/")) {
          const match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) photoId = match[1];
        }
      } else if (val.length > 20 && /^[a-zA-Z0-9_-]+$/.test(val)) {
        // Raw ID
        photoId = val;
      }
    }

    if (!email && studentNumber) {
      email = `${studentNumber}@student.university.edu`;
    }

    if (name && studentNumber) {
      const photoUrl = photoId
        ? `https://drive.google.com/uc?export=view&id=${photoId}`
        : null;

      students.push({
        name,
        studentNumber,
        email,
        photoUrl,
        photoId,
      });
    }
  }

  return students;
}

/**
 * Get all students from CSV file
 * @returns {Promise<Array>} Array of student objects
 */
export const getAllStudents = async () => {
  try {
    const response = await fetch("/datasdt.csv");
    if (!response.ok) {
      throw new Error("Failed to load students CSV");
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error("Error loading students:", error);
    return [];
  }
};
