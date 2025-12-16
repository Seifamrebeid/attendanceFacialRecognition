import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAllStudents } from './studentsService';

/**
 * Fetches all attendance records and identifies students with high absences.
 * @param {number} threshold - Number of absences to trigger high risk (default 3).
 * @returns {Promise<Array>} Array of student objects with absence count and details.
 */
export const getHighRiskStudents = async (threshold = 3) => {
    try {
        // 1. Fetch all students
        const students = await getAllStudents();

        // 2. Fetch all attendance records
        // Note: In a real large-scale app, we would aggregate this on the backend/Cloud Functions
        const attendanceRef = collection(db, 'attendance');
        const snapshot = await getDocs(attendanceRef);

        const attendanceDocs = snapshot.docs.map(doc => doc.data());

        // 3. Calculate absences per student
        const studentStats = {};

        // Initialize stats
        students.forEach(student => {
            studentStats[student.id] = {
                student,
                absences: 0,
                records: []
            };
        });

        // Process records
        attendanceDocs.forEach(record => {
            // Identify student by ID (assuming format Name_ID or just ID matching)
            // The record might store studentId directly if we updated it, but let's check
            // AttendancePage saves: studentName: `${student.name}_${student.studentNumber}`

            let studentId = null;
            if (record.studentName) {
                const parts = record.studentName.split('_');
                studentId = parts[parts.length - 1];
            }

            if (studentId && studentStats[studentId]) {
                const status = record.status || record.action?.toLowerCase();
                if (status === 'absent' || status === 'left') {
                    studentStats[studentId].absences += 1;
                    studentStats[studentId].records.push(record);
                }
            }
        });

        // 4. Filter by threshold
        const highRiskStudents = Object.values(studentStats)
            .filter(stat => stat.absences >= threshold)
            .map(stat => ({
                ...stat.student,
                absenceCount: stat.absences,
                lastAbsence: stat.records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
            }));

        return highRiskStudents;

    } catch (error) {
        console.error('Error fetching high risk students:', error);
        return [];
    }
};

/**
 * Get arrival times for a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of Date objects representing arrival times
 */
export const getArrivalTimes = async (courseId) => {
    try {
        const attendanceRef = collection(db, 'attendance');
        const q = query(attendanceRef, where('courseId', '==', courseId));
        const snapshot = await getDocs(q);

        const arrivalTimes = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Only get JOIN actions with timestamps
            if (data.action === 'JOIN' && data.timestamp) {
                const time = typeof data.timestamp === 'string' 
                    ? new Date(data.timestamp)
                    : data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                arrivalTimes.push(time);
            }
        });

        return arrivalTimes;
    } catch (error) {
        console.error('Error fetching arrival times:', error);
        return [];
    }
};

/**
 * Get attendance records for a specific student
 * @param {string} studentId - Student ID or student number
 * @param {string} courseId - Course ID (optional)
 * @returns {Promise<Array>} Array of attendance records for the student
 */
export const getStudentAttendance = async (studentId, courseId = null) => {
    try {
        const attendanceRef = collection(db, 'attendance');
        let q;

        if (courseId) {
            q = query(attendanceRef, where('courseId', '==', courseId));
        } else {
            q = attendanceRef;
        }

        const snapshot = await getDocs(q);
        const records = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Match by studentName containing the studentId
            if (data.studentName && data.studentName.includes(studentId)) {
                records.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        // Sort by timestamp descending
        records.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt);
            const timeB = new Date(b.timestamp || b.createdAt);
            return timeB - timeA;
        });

        return records;
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        return [];
    }
};
