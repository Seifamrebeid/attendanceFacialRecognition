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
