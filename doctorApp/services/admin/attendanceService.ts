// Attendance Service for Admin App
// Handles attendance record operations

import { db } from '@/config/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { loadStudentsFromCSV, Student } from '../studentService';

export interface AttendanceRecord {
    id?: string;
    studentName: string;
    courseId: string;
    action: string;
    status?: string;
    timestamp: Timestamp | Date | string;
    createdAt?: Timestamp | Date | string;
}

export interface HighRiskStudent extends Student {
    absenceCount: number;
    lastAbsence: AttendanceRecord;
}

/**
 * Fetches all attendance records and identifies students with high absences
 */
export const getHighRiskStudents = async (threshold: number = 3): Promise<HighRiskStudent[]> => {
    try {
        // 1. Fetch all students
        const students = await loadStudentsFromCSV();

        // 2. Fetch all attendance records
        const attendanceRef = collection(db, 'attendance');
        const snapshot = await getDocs(attendanceRef);
        const attendanceDocs = snapshot.docs.map(doc => doc.data() as AttendanceRecord);

        // 3. Calculate absences per student
        const studentStats: { [key: string]: { student: Student; absences: number; records: AttendanceRecord[] } } = {};

        // Initialize stats
        students.forEach(student => {
            studentStats[student.studentNumber] = {
                student,
                absences: 0,
                records: []
            };
        });

        // Process records
        attendanceDocs.forEach(record => {
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
                lastAbsence: stat.records.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0]
            }));

        return highRiskStudents;
    } catch (error) {
        console.error('Error fetching high risk students:', error);
        return [];
    }
};

/**
 * Get arrival times for a specific course
 */
export const getArrivalTimes = async (courseId: string): Promise<Date[]> => {
    try {
        const attendanceRef = collection(db, 'attendance');
        const q = query(attendanceRef, where('courseId', '==', courseId));
        const snapshot = await getDocs(q);

        const arrivalTimes: Date[] = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
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
 */
export const getStudentAttendance = async (studentId: string, courseId: string | null = null): Promise<AttendanceRecord[]> => {
    try {
        const attendanceRef = collection(db, 'attendance');
        let q;

        if (courseId) {
            q = query(attendanceRef, where('courseId', '==', courseId));
        } else {
            q = query(attendanceRef);
        }

        const snapshot = await getDocs(q);
        const records: AttendanceRecord[] = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.studentName && data.studentName.includes(studentId)) {
                records.push({
                    id: doc.id,
                    ...data
                } as AttendanceRecord);
            }
        });

        records.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt);
            const timeB = new Date(b.timestamp || b.createdAt);
            return timeB.getTime() - timeA.getTime();
        });

        return records;
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        return [];
    }
};
