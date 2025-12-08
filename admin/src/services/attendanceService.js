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
