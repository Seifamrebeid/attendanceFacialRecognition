// Warnings Service
// Handles all Firestore operations for warnings collection

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { countAbsences } from './attendanceService';

const COLLECTION_NAME = 'warnings';

/**
 * Get all warnings
 * @returns {Promise<Array>} Array of warning objects
 */
export const getAllWarnings = async () => {
    try {
        const warningsRef = collection(db, COLLECTION_NAME);
        const q = query(warningsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const warnings = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            warnings.push({
                id: doc.id,
                ...data,
                lastAbsenceDate: data.lastAbsenceDate?.toDate?.() || data.lastAbsenceDate,
                createdAt: data.createdAt?.toDate?.() || data.createdAt
            });
        });

        return warnings;
    } catch (error) {
        console.error('Error fetching warnings:', error);
        throw error;
    }
};

/**
 * Get warnings for a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of warnings for the course
 */
export const getWarningsByCourse = async (courseId) => {
    try {
        const warningsRef = collection(db, COLLECTION_NAME);
        const q = query(
            warningsRef,
            where('courseId', '==', courseId),
            orderBy('absenceCount', 'desc')
        );
        const querySnapshot = await getDocs(q);

        const warnings = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            warnings.push({
                id: doc.id,
                ...data,
                lastAbsenceDate: data.lastAbsenceDate?.toDate?.() || data.lastAbsenceDate,
                createdAt: data.createdAt?.toDate?.() || data.createdAt
            });
        });

        return warnings;
    } catch (error) {
        console.error('Error fetching warnings by course:', error);
        throw error;
    }
};

/**
 * Create a new warning
 * @param {Object} warningData - Warning data
 * @returns {Promise<string>} ID of created warning
 */
export const createWarning = async (warningData) => {
    try {
        const warningsRef = collection(db, COLLECTION_NAME);
        const docRef = await addDoc(warningsRef, {
            ...warningData,
            emailSent: false,
            createdAt: new Date()
        });

        return docRef.id;
    } catch (error) {
        console.error('Error creating warning:', error);
        throw error;
    }
};

/**
 * Mark warning email as sent
 * @param {string} warningId - Warning ID
 * @returns {Promise<void>}
 */
export const markEmailSent = async (warningId) => {
    try {
        const warningRef = doc(db, COLLECTION_NAME, warningId);
        await updateDoc(warningRef, {
            emailSent: true,
            emailSentAt: new Date()
        });
    } catch (error) {
        console.error('Error marking email as sent:', error);
        throw error;
    }
};

/**
 * Check if a student needs a warning and create one if necessary
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @param {Date} lastAbsenceDate - Date of last absence
 * @returns {Promise<Object|null>} Created warning or null if not needed
 */
export const checkAndCreateWarning = async (studentId, courseId, lastAbsenceDate) => {
    try {
        // Count total absences
        const absenceCount = await countAbsences(studentId, courseId);

        // Check if warning threshold is reached (3 absences)
        if (absenceCount >= 3) {
            // Check if warning already exists for this student and course
            const warningsRef = collection(db, COLLECTION_NAME);
            const q = query(
                warningsRef,
                where('studentId', '==', studentId),
                where('courseId', '==', courseId)
            );
            const existingWarnings = await getDocs(q);

            if (existingWarnings.empty) {
                // Create new warning
                const warningId = await createWarning({
                    studentId,
                    courseId,
                    absenceCount,
                    lastAbsenceDate
                });

                return { id: warningId, absenceCount, isNew: true };
            } else {
                // Update existing warning
                const existingWarning = existingWarnings.docs[0];
                await updateDoc(doc(db, COLLECTION_NAME, existingWarning.id), {
                    absenceCount,
                    lastAbsenceDate,
                    updatedAt: new Date()
                });

                return { id: existingWarning.id, absenceCount, isNew: false };
            }
        }

        return null;
    } catch (error) {
        console.error('Error checking/creating warning:', error);
        throw error;
    }
};
