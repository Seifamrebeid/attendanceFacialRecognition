import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where } from 'firebase/firestore';

/**
 * Creates a new warning for a student.
 * 
 * @param {Object} warningData - The warning details.
 * @param {string} warningData.courseId - ID of the course.
 * @param {string} warningData.courseName - Name of the course.
 * @param {string} warningData.studentId - ID of the student.
 * @param {string} warningData.studentName - Name of the student.
 * @param {string} warningData.studentEmail - Email of the student (required for notification).
 * @param {string} warningData.warningType - Type of warning (e.g., 'Low Attendance', 'Misconduct').
 * @param {string} warningData.message - The detailed warning message.
 * @param {string} warningData.createdBy - Name or ID of the person creating the warning.
 * @returns {Promise<string>} - The ID of the created warning document.
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
            createdBy
        } = warningData;

        if (!studentEmail) {
            console.warn('⚠️ Creating warning without student email. Notification will not be sent.');
        }

        const warningRef = collection(db, 'warnings');
        const docRef = await addDoc(warningRef, {
            courseId,
            courseName,
            studentId,
            studentName,
            studentEmail: studentEmail || null,
            warningType,
            message,
            createdBy,
            createdAt: serverTimestamp(),
            status: 'Sent', // Initial status
            emailSent: false // Will be updated by Cloud Function
        });

        console.log(`✅ Warning created with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating warning:', error);
        throw error;
    }
};

/**
 * Retrieves all warnings from the database.
 * @returns {Promise<Array>} Array of warning objects.
 */
export const getAllWarnings = async () => {
    try {
        const warningsRef = collection(db, 'warnings');
        const q = query(warningsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('❌ Error fetching all warnings:', error);
        // If the index is missing, firestore might throw.
        // Fallback to client-side sorting or just return unsorted if needed, 
        // but usually we want to catch this.
        return [];
    }
};

/**
 * Retrieves warnings for a specific student.
 * @param {string} studentId 
 * @returns {Promise<Array>}
 */
export const getStudentWarnings = async (studentId) => {
    try {
        const warningsRef = collection(db, 'warnings');
        const q = query(
            warningsRef,
            where('studentId', '==', studentId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`❌ Error fetching warnings for student ${studentId}:`, error);
        return [];
    }
};

/**
 * Retrieves warnings for a specific course.
 * @param {string} courseId 
 * @returns {Promise<Array>}
 */
export const getWarningsByCourse = async (courseId) => {
    try {
        const warningsRef = collection(db, 'warnings');
        const q = query(
            warningsRef,
            where('courseId', '==', courseId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`❌ Error fetching warnings for course ${courseId}:`, error);
        return [];
    }
};
