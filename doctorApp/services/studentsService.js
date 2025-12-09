// Students Service
// Handles operations for students from CSV file

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { Asset } from "expo-asset";

/**
 * Parse CSV data to student objects
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of student objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const students = [];

  // Skip header row (index 0)
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

    // Map columns based on observed structure:
    // Name, StudentID, ...
    const name = values[0] || "";
    const studentNumber = values[1] || "";

    // Try to find other fields
    let email = "";
    let photoId = "";

    // Check remaining columns
    for (let j = 2; j < values.length; j++) {
      const val = values[j];

      if (val.includes("@") && !val.includes("drive.google.com")) {
        email = val;
      } else if (
        val.includes("drive.google.com") ||
        (val.length > 20 && !val.includes(" "))
      ) {
        // Handle Google Drive URL or raw ID
        if (val.includes("id=")) {
          // Extract ID from URL (e.g., ...open?id=XYZ...)
          const match = val.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) {
            photoId = match[1];
            console.log(`Extracted photoId from URL: ${photoId}`);
          }
        } else if (val.includes("/d/")) {
          // Extract ID from URL (e.g., .../d/XYZ/...)
          const match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) {
            photoId = match[1];
            console.log(`Extracted photoId from /d/ URL: ${photoId}`);
          }
        } else if (val.length > 20 && /^[a-zA-Z0-9_-]+$/.test(val)) {
          // Assume it's a raw ID if it's long and only contains valid characters
          photoId = val;
          console.log(`Using raw photoId: ${photoId}`);
        }
      }
    }

    // Generate email if missing
    if (!email && studentNumber) {
      email = `${studentNumber}@student.university.edu`;
    }

    if (name && studentNumber) {
      const photoUrl = photoId
        ? `https://drive.google.com/uc?export=view&id=${photoId}`
        : null;
      if (photoId) {
        console.log(`✅ Found photo for ${name}: ID=${photoId}`);
        console.log(`   URL: ${photoUrl}`);
      }

      students.push({
        id: studentNumber,
        studentNumber,
        name: name.replace(/^"|"$/g, ""), // Remove quotes if any
        email,
        enrolledCourses: [],
        photoDriveId: photoId,
        photoUrl,
        source: "local_csv",
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
    console.log("Fetching students from local CSV...");

    // Import CSV data as a JS module
    const csvText = require("../datasdt.js").default;

    const students = parseCSV(csvText);

    // Sort by name
    students.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return students;
  } catch (error) {
    console.error("Error fetching students from CSV:", error);
    return [];
  }
};

/**
 * Get students by course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of student objects
 */
export const getStudentsByCourse = async (courseId) => {
  try {
    const students = await getAllStudents();

    // Check if any students have enrollment data
    const hasEnrollmentData = students.some(
      (student) => student.enrolledCourses && student.enrolledCourses.length > 0
    );

    // If no enrollment data exists, return all students
    // Otherwise, filter by enrolled courses
    if (!hasEnrollmentData) {
      console.log(
        `No enrollment data found. Returning all ${students.length} students for course ${courseId}`
      );
      return students;
    }

    return students.filter(
      (student) =>
        student.enrolledCourses && student.enrolledCourses.includes(courseId)
    );
  } catch (error) {
    console.error("Error fetching students by course:", error);
    return [];
  }
};

/**
 * Get student by ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Student object or null
 */
export const getStudentById = async (studentId) => {
  try {
    const students = await getAllStudents();
    return (
      students.find(
        (s) => s.id === studentId || s.studentNumber === studentId
      ) || null
    );
  } catch (error) {
    console.error("Error fetching student:", error);
    return null;
  }
};
