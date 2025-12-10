// Students Service - Local CSV Version
// Reads students from public/datasdt.csv

/**
 * Parse CSV data to student objects
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of student objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const students = [];

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV parsing (respecting quotes)
    const values = [];
    let inQuote = false;
    let currentValue = '';

    for (let char of line) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    // Map columns based on observed structure:
    // Name, StudentID, ...
    const name = values[0] || '';
    const studentNumber = values[1] || '';

    // Try to find other fields
    let email = '';
    let photoId = '';

    // Check remaining columns
    for (let j = 2; j < values.length; j++) {
      const val = values[j];

      if (val.includes('@') && !val.includes('drive.google.com')) {
        email = val;
      } else if (val.includes('drive.google.com') || (val.length > 20 && !val.includes(' '))) {
        // Handle Google Drive URL or raw ID
        if (val.includes('id=')) {
          // Extract ID from URL (e.g., ...open?id=XYZ...)
          const match = val.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) {
            photoId = match[1];
          }
        } else if (val.includes('/d/')) {
          // Extract ID from URL (e.g., .../d/XYZ/...)
          const match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) {
            photoId = match[1];
          }
        } else if (val.length > 20 && /^[a-zA-Z0-9_-]+$/.test(val)) {
          // Assume it's a raw ID if it's long and only contains valid characters
          photoId = val;
        }
      }
    }

    // Generate email if missing
    if (!email && studentNumber) {
      email = `${studentNumber}@student.university.edu`;
    }

    if (name && studentNumber) {
      const photoUrl = photoId ? `https://drive.google.com/uc?export=view&id=${photoId}` : null;

      students.push({
        id: studentNumber,
        studentNumber,
        name: name.replace(/^"|"$/g, ''), // Remove quotes if any
        email,
        enrolledCourses: [],
        photoId, // Keep compatibility with Doctor app
        photoUrl,
        source: 'local_csv'
      });
    }
  }

  return students;
}

/**
 * Get all students from local CSV
 * @returns {Promise<Array>} Array of student objects
 */
export const getAllStudents = async () => {
  try {
    const response = await fetch('/datasdt.csv');

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const csvText = await response.text();
    const students = parseCSV(csvText);

    // Sort by name
    students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return students;
  } catch (error) {
    console.error('Error fetching students from CSV:', error);
    return [];
  }
};
