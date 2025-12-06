// Attendance Service
// Handles all Firestore operations for attendance collection

import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'attendance';

/**
 * Get attendance records by date range and course
 * @param {string} courseId - Course ID (optional)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of attendance records
 */
export const getAttendanceByDateRange = async (courseId, startDate, endDate) => {
    try {
        const attendanceRef = collection(db, COLLECTION_NAME);
        let q;

        // Convert dates to string format (YYYY-MM-DD) for comparison
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`Fetching attendance from ${startDateStr} to ${endDateStr}`);

        // Try to query with date filtering
        // Note: Firebase date comparison can be tricky, so we fetch and filter
        if (courseId) {
            q = query(
                attendanceRef,
                where('courseId', '==', courseId),
                orderBy('date', 'desc')
            );
        } else {
            q = query(
                attendanceRef,
                orderBy('date', 'desc')
            );
        }

        const querySnapshot = await getDocs(q);
        const records = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Convert date field to Date object and filter by date range
            let docDate = null;
            if (data.date) {
                if (typeof data.date === 'string') {
                    docDate = new Date(data.date);
                } else if (data.date.toDate) {
                    docDate = data.date.toDate();
                } else if (data.date instanceof Date) {
                    docDate = data.date;
                }
            } else if (data.created_at) {
                docDate = new Date(data.created_at);
            }

            // Check if date is within range
            if (docDate) {
                const docDateStr = docDate.toISOString().split('T')[0];
                if (docDateStr >= startDateStr && docDateStr <= endDateStr) {
                    records.push({
                        id: doc.id,
                        ...data,
                        date: docDate,
                        arrivalTime: data.arrivalTime?.toDate ? data.arrivalTime.toDate() : data.arrivalTime
                    });
                }
            }
        });

        console.log(`Fetched ${records.length} attendance records`);
        return records;
    } catch (error) {
        console.error('Error fetching attendance:', error);
        throw error;
    }
};

/**
 * Count absences for a student in a specific course
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<number>} Number of absences
 */
export const countAbsences = async (studentId, courseId) => {
    try {
        const attendanceRef = collection(db, COLLECTION_NAME);
        const q = query(
            attendanceRef,
            where('studentId', '==', studentId),
            where('courseId', '==', courseId),
            where('status', '==', 'absent')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error('Error counting absences:', error);
        throw error;
    }
};

/**
 * Get all attendance records for a student in a course
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of attendance records
 */
export const getStudentAttendance = async (studentId, courseId) => {
    try {
        const attendanceRef = collection(db, COLLECTION_NAME);
        const q = query(
            attendanceRef,
            where('studentId', '==', studentId),
            where('courseId', '==', courseId),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const records = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            records.push({
                id: doc.id,
                ...data,
                date: data.date?.toDate(),
                arrivalTime: data.arrivalTime?.toDate()
            });
        });

        return records;
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        throw error;
    }
};

/**
 * Update attendance status
 * @param {string} attendanceId - Attendance record ID
 * @param {string} status - New status (present/late/absent)
 * @returns {Promise<void>}
 */
export const updateAttendanceStatus = async (attendanceId, status) => {
    try {
        const attendanceRef = doc(db, COLLECTION_NAME, attendanceId);
        await updateDoc(attendanceRef, {
            status,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating attendance status:', error);
        throw error;
    }
};

/**
 * Get arrival times for a course (for threshold calculation)
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of arrival times for present students
 */
export const getArrivalTimes = async (courseId) => {
    try {
        const attendanceRef = collection(db, COLLECTION_NAME);
        const q = query(
            attendanceRef,
            where('courseId', '==', courseId),
            where('status', 'in', ['present', 'late'])
        );

        const querySnapshot = await getDocs(q);
        const arrivalTimes = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.arrivalTime) {
                arrivalTimes.push({
                    id: doc.id,
                    arrivalTime: data.arrivalTime.toDate(),
                    status: data.status
                });
            }
        });

        return arrivalTimes;
    } catch (error) {
        console.error('Error fetching arrival times:', error);
        throw error;
    }
};
