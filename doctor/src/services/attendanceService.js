// Attendance Service
// Handles Firestore operations for attendance collection with real-time updates

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "attendance";

/**
 * Subscribe to real-time attendance updates for a specific course
 * @param {string} courseId - Course ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const onAttendanceByCourse = (courseId, callback) => {
  try {
    const attendanceRef = collection(db, COLLECTION_NAME);
    const q = query(
      attendanceRef,
      where("courseId", "==", courseId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = [];
      snapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      callback(records);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to attendance:", error);
    throw error;
  }
};

/**
 * Get attendance records for a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of attendance records
 */
export const getAttendanceByCourse = async (courseId) => {
  try {
    const attendanceRef = collection(db, COLLECTION_NAME);
    const q = query(
      attendanceRef,
      where("courseId", "==", courseId),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const records = [];

    querySnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return records;
  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
};

/**
 * Get attendance records filtered by week number
 * @param {string} courseId - Course ID
 * @param {number} weekNumber - Week number (1-16)
 * @returns {Promise<Array>} Array of attendance records
 */
export const getAttendanceByWeek = async (courseId, weekNumber) => {
  try {
    const attendanceRef = collection(db, COLLECTION_NAME);
    const q = query(
      attendanceRef,
      where("courseId", "==", courseId),
      where("weekNumber", "==", weekNumber),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const records = [];

    querySnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return records;
  } catch (error) {
    console.error("Error fetching attendance by week:", error);
    throw error;
  }
};

/**
 * Get high-risk students (with N or more absences) in a course
 * @param {number} absenceThreshold - Minimum number of absences to be flagged
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of high-risk students with absence count
 */
export const getHighRiskStudents = async (absenceThreshold = 3, courseId) => {
  try {
    // Get all attendance records for the course
    const attendanceRef = collection(db, COLLECTION_NAME);
    const q = query(
      attendanceRef,
      where("courseId", "==", courseId)
    );

    const querySnapshot = await getDocs(q);
    const studentAbsences = {};

    // Count absences per student
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const studentId = data.studentId || data.studentName;
      const status = data.action?.toUpperCase() || data.status?.toUpperCase() || 'PRESENT';

      if (status === 'LEFT' || status === 'ABSENT') {
        studentAbsences[studentId] = (studentAbsences[studentId] || 0) + 1;
      }
    });

    // Filter students who meet the threshold
    const atRiskStudentIds = Object.keys(studentAbsences).filter(
      (studentId) => studentAbsences[studentId] >= absenceThreshold
    );

    // Import students to get full info
    const { getAllStudents } = await import('./studentsService');
    const allStudents = await getAllStudents();

    // Map high-risk students with their data
    const atRiskStudents = allStudents
      .filter((student) =>
        atRiskStudentIds.some(
          (id) => id.includes(student.studentNumber) || id.includes(student.id)
        )
      )
      .map((student) => ({
        ...student,
        absenceCount: Math.max(
          ...atRiskStudentIds
            .filter((id) => id.includes(student.studentNumber) || id.includes(student.id))
            .map((id) => studentAbsences[id] || 0)
        )
      }));

    return atRiskStudents;
  } catch (error) {
    console.error("Error fetching high-risk students:", error);
    throw error;
  }
};
