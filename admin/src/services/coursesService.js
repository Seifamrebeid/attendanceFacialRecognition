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
    onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const COLLECTION_NAME = 'courses';

/**
 * Get all courses from Firestore
 * @returns {Promise<Array>} Array of course objects with IDs
 */
export const getAllCourses = async () => {
    try {
        const coursesRef = collection(db, COLLECTION_NAME);
        // Remove orderBy to avoid index issues, we'll sort client-side
        const querySnapshot = await getDocs(coursesRef);

        const courses = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Normalize field names to support both formats
            courses.push({
                id: doc.id,
                ...data,
                // Map courseName to name for compatibility
                name: data.name || data.courseName || '',
                code: data.code || data.courseCode || '',
                instructorName: data.instructorName || data.lecturerName || '',
                // Keep original fields too
                courseName: data.courseName,
                courseCode: data.courseCode,
                lecturerName: data.lecturerName
            });
        });

        // Sort by name client-side
        courses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return courses;
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
};

/**
 * Create a new course
 * @param {Object} courseData - Course data (name, code, instructorName, schedule, startTime)
 * @returns {Promise<string>} ID of the created course
 */
export const createCourse = async (courseData) => {
    try {
        const coursesRef = collection(db, COLLECTION_NAME);
        const docRef = await addDoc(coursesRef, {
            ...courseData,
            createdAt: new Date().toISOString()
        });

        return docRef.id;
    } catch (error) {
        console.error('Error creating course:', error);
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
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating course:', error);
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
        console.error('Error deleting course:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time course updates
 * @param {Function} callback - Callback function to handle course updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCoursesUpdates = (callback) => {
    const coursesRef = collection(db, COLLECTION_NAME);
    // Remove orderBy to avoid index issues

    return onSnapshot(coursesRef, (querySnapshot) => {
        const courses = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Normalize field names to support both formats
            courses.push({
                id: doc.id,
                ...data,
                name: data.name || data.courseName || '',
                code: data.code || data.courseCode || '',
                instructorName: data.instructorName || data.lecturerName || '',
                courseName: data.courseName,
                courseCode: data.courseCode,
                lecturerName: data.lecturerName
            });
        });

        // Sort by name client-side
        courses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        callback(courses);
    });
};
