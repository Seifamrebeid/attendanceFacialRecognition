// Courses Service
// Handles all Firestore operations for courses collection

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "courses";

/**
 * Get all courses from Firestore
 * @returns {Promise<Array>} Array of course objects with IDs
 */
export const getAllCourses = async () => {
  try {
    const coursesRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(coursesRef);

    const courses = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      courses.push({
        id: doc.id,
        ...data,
        name: data.name || data.courseName || "",
        code: data.code || data.courseCode || "",
        instructorName: data.instructorName || data.lecturerName || "",
        courseName: data.courseName,
        courseCode: data.courseCode,
        lecturerName: data.lecturerName,
      });
    });

    courses.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

/**
 * Create a new course
 * @param {Object} courseData - Course data
 * @returns {Promise<string>} ID of the created course
 */
export const createCourse = async (courseData) => {
  try {
    const coursesRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(coursesRef, {
      ...courseData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
};

/**
 * Update an existing course
 * @param {string} courseId - Course ID
 * @param {Object} courseData - Updated course data
 * @returns {Promise<void>}
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    const courseRef = doc(db, COLLECTION_NAME, courseId);
    await updateDoc(courseRef, {
      ...courseData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating course:", error);
    throw error;
  }
};

/**
 * Delete a course
 * @param {string} courseId - Course ID
 * @returns {Promise<void>}
 */
export const deleteCourse = async (courseId) => {
  try {
    const courseRef = doc(db, COLLECTION_NAME, courseId);
    await deleteDoc(courseRef);
  } catch (error) {
    console.error("Error deleting course:", error);
    throw error;
  }
};
