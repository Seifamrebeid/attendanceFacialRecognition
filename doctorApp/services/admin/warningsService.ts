// Warnings Service for Admin App
// Handles warning operations in Firestore

import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where } from 'firebase/firestore';

export interface Warning {
    id?: string;
    courseId: string;
    courseName: string;
    studentId: string;
    studentName: string;
    studentEmail?: string | null;
    warningType: string;
    message: string;
    createdBy: string;
    createdAt?: any;
    status?: string;
    emailSent?: boolean;
}

/**
 * Creates a new warning for a student
 */
export const createWarning = async (warningData: Warning): Promise<string> => {
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
            status: 'Sent',
            emailSent: false
        });

        console.log(`✅ Warning created with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating warning:', error);
        throw error;
    }
};

/**
 * Retrieves all warnings from the database
 */
export const getAllWarnings = async (): Promise<Warning[]> => {
    try {
        const warningsRef = collection(db, 'warnings');
        const q = query(warningsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warning));
    } catch (error) {
        console.error('❌ Error fetching all warnings:', error);
        return [];
    }
};

/**
 * Retrieves warnings for a specific student
 */
export const getStudentWarnings = async (studentId: string): Promise<Warning[]> => {
    try {
        const warningsRef = collection(db, 'warnings');
        const q = query(
            warningsRef,
            where('studentId', '==', studentId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warning));
    } catch (error) {
        console.error(`❌ Error fetching warnings for student ${studentId}:`, error);
        return [];
    }
};

/**
 * Retrieves warnings for a specific course
 */
export const getWarningsByCourse = async (courseId: string): Promise<Warning[]> => {
    try {
        const warningsRef = collection(db, 'warnings');
        const q = query(
            warningsRef,
            where('courseId', '==', courseId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warning));
    } catch (error) {
        console.error(`❌ Error fetching warnings for course ${courseId}:`, error);
        return [];
    }
};
