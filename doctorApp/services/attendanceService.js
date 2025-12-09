// Attendance Service
// Handles attendance operations and high-risk student calculations

import { db } from "../config/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getAllStudents } from "./studentsService";

/**
 * Record attendance
 * @param {Object} attendanceData - Attendance record data
 * @returns {Promise<string>} Document ID
 */
export const recordAttendance = async (attendanceData) => {
  try {
    const attendanceRef = collection(db, "attendance");
    const docRef = await addDoc(attendanceRef, {
      ...attendanceData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error recording attendance:", error);
    throw error;
  }
};

/**
 * Get attendance records for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of attendance records
 */
export const getCourseAttendance = async (courseId) => {
  try {
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, where("courseId", "==", courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching course attendance:", error);
    return [];
  }
};

/**
 * Get high-risk students based on absence threshold
 * @param {number} threshold - Number of absences to trigger high risk
 * @returns {Promise<Array>} Array of high-risk students
 */
export const getHighRiskStudents = async (threshold = 3) => {
  try {
    const students = await getAllStudents();
    const attendanceRef = collection(db, "attendance");
    const snapshot = await getDocs(attendanceRef);
    const attendanceDocs = snapshot.docs.map((doc) => doc.data());

    const studentStats = {};
    students.forEach((student) => {
      studentStats[student.id] = {
        student,
        absences: 0,
        records: [],
      };
    });

    attendanceDocs.forEach((record) => {
      let studentId = null;
      if (record.studentName) {
        const parts = record.studentName.split("_");
        studentId = parts[parts.length - 1];
      }

      if (studentId && studentStats[studentId]) {
        const status = record.status || record.action?.toLowerCase();
        if (status === "absent" || status === "left") {
          studentStats[studentId].absences += 1;
          studentStats[studentId].records.push(record);
        }
      }
    });

    const highRiskStudents = Object.values(studentStats)
      .filter((stat) => stat.absences >= threshold)
      .map((stat) => ({
        ...stat.student,
        absenceCount: stat.absences,
        lastAbsence: stat.records.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0],
      }));

    return highRiskStudents;
  } catch (error) {
    console.error("Error fetching high risk students:", error);
    return [];
  }
};

/**
 * Get arrival times for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of Date objects
 */
export const getArrivalTimes = async (courseId) => {
  try {
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    const arrivalTimes = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.action === "JOIN" && data.timestamp) {
        const time =
          typeof data.timestamp === "string"
            ? new Date(data.timestamp)
            : data.timestamp.toDate
            ? data.timestamp.toDate()
            : new Date(data.timestamp);
        arrivalTimes.push(time);
      }
    });

    return arrivalTimes;
  } catch (error) {
    console.error("Error fetching arrival times:", error);
    return [];
  }
};

/**
 * Get student attendance records
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID (optional)
 * @returns {Promise<Array>} Array of attendance records
 */
export const getStudentAttendance = async (studentId, courseId = null) => {
  try {
    const attendanceRef = collection(db, "attendance");
    let q;

    if (courseId) {
      q = query(
        attendanceRef,
        where("studentId", "==", studentId),
        where("courseId", "==", courseId),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        attendanceRef,
        where("studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
    }));
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return [];
  }
};
