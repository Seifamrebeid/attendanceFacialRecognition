// Warnings Service
// Handles warning operations for students

import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

/**
 * Create a new warning for a student
 * @param {Object} warningData - Warning data
 * @returns {Promise<string>} Document ID
 */
export const createWarning = async (warningData) => {
  try {
    const {
      courseId,
      courseName,
      studentId,
      studentName,
      studentEmail,
      warningType,
      message,
      createdBy,
    } = warningData;

    const warningRef = collection(db, "warnings");
    const docRef = await addDoc(warningRef, {
      courseId,
      courseName,
      studentId,
      studentName,
      studentEmail: studentEmail || null,
      warningType,
      message,
      createdBy,
      createdAt: new Date().toISOString(),
      status: "Sent",
      emailSent: false,
    });

    console.log(`Warning created with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("Error creating warning:", error);
    throw error;
  }
};

/**
 * Get all warnings
 * @returns {Promise<Array>} Array of warning objects
 */
export const getAllWarnings = async () => {
  try {
    const warningsRef = collection(db, "warnings");
    const snapshot = await getDocs(warningsRef);
    const warnings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by createdAt client-side
    warnings.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    return warnings;
  } catch (error) {
    console.error("Error fetching all warnings:", error);
    return [];
  }
};

/**
 * Get warnings for a specific student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of warning objects
 */
export const getStudentWarnings = async (studentId) => {
  try {
    const warningsRef = collection(db, "warnings");
    const q = query(warningsRef, where("studentId", "==", studentId));
    const snapshot = await getDocs(q);
    const warnings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    warnings.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    return warnings;
  } catch (error) {
    console.error(`Error fetching warnings for student ${studentId}:`, error);
    return [];
  }
};

/**
 * Get warnings for a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of warning objects
 */
export const getWarningsByCourse = async (courseId) => {
  try {
    const warningsRef = collection(db, "warnings");
    const q = query(warningsRef, where("courseId", "==", courseId));
    const snapshot = await getDocs(q);
    const warnings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    warnings.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    return warnings;
  } catch (error) {
    console.error(`Error fetching warnings for course ${courseId}:`, error);
    return [];
  }
};
