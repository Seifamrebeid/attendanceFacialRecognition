// Course Statistics Service for Admin App
// Provides comprehensive statistics for each course

import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAllCourses, Course } from './coursesService';

export interface CourseStatistics {
    courseId: string;
    totalStudents: number;
    totalSessions: number;
    attendanceRate: number;
    averageSessionAttendance: number;
    lateArrivals: number;
    totalRecords: number;
}

export interface CourseWithStats extends Course {
    statistics: CourseStatistics;
}

interface AttendanceRecord {
    id?: string;
    studentId?: string;
    studentNumber?: string;
    studentName?: string;
    action?: string;
    status?: string;
    timestamp?: any;
    createdAt?: any;
    courseId?: string;
    courseName?: string;
}

/**
 * Get comprehensive statistics for a specific course
 */
export const getCourseStatistics = async (courseId: string): Promise<CourseStatistics> => {
    try {
        const attendanceRef = collection(db, 'attendance');
        const q = query(attendanceRef, where('courseId', '==', courseId));
        const attendanceSnapshot = await getDocs(q);

        const attendanceRecords: AttendanceRecord[] = [];
        attendanceSnapshot.forEach((doc) => {
            attendanceRecords.push({ id: doc.id, ...doc.data() });
        });

        const stats = calculateCourseStats(attendanceRecords, courseId);
        return stats;
    } catch (error) {
        console.error('Error fetching course statistics:', error);
        throw error;
    }
};

/**
 * Get statistics for all courses
 */
export const getAllCoursesStatistics = async (): Promise<CourseWithStats[]> => {
    try {
        const courses = await getAllCourses();
        const attendanceRef = collection(db, 'attendance');
        const attendanceSnapshot = await getDocs(attendanceRef);

        const allAttendanceRecords: AttendanceRecord[] = [];
        attendanceSnapshot.forEach((doc) => {
            allAttendanceRecords.push({ id: doc.id, ...doc.data() });
        });

        const coursesWithStats = courses.map((course) => {
            const courseAttendance = allAttendanceRecords.filter(
                (record) =>
                    record.courseId === course.id ||
                    record.courseName === course.name ||
                    record.courseName === course.courseName
            );

            const stats = calculateCourseStats(courseAttendance, course.id);

            return {
                ...course,
                statistics: stats,
            };
        });

        return coursesWithStats;
    } catch (error) {
        console.error('Error fetching all courses statistics:', error);
        throw error;
    }
};

interface StudentAttendance {
    studentId: string;
    studentName?: string;
    sessions: { [sessionDate: string]: { attended: boolean } };
    totalJoins: number;
}

/**
 * Calculate statistics from attendance records
 */
const calculateCourseStats = (attendanceRecords: AttendanceRecord[], courseId: string): CourseStatistics => {
    const studentAttendanceMap: { [key: string]: StudentAttendance } = {};
    const sessionDates = new Set<string>();
    const uniqueStudents = new Set<string>();

    attendanceRecords.forEach((record) => {
        const timestamp = record.timestamp || record.createdAt;
        const sessionDate = timestamp
            ? new Date(timestamp).toISOString().split('T')[0]
            : 'unknown';
        sessionDates.add(sessionDate);

        let studentId = record.studentId || record.studentNumber;
        if (!studentId && record.studentName) {
            const parts = record.studentName.split('_');
            studentId = parts[parts.length - 1];
        }

        if (studentId) {
            uniqueStudents.add(studentId);

            if (!studentAttendanceMap[studentId]) {
                studentAttendanceMap[studentId] = {
                    studentId,
                    studentName: record.studentName,
                    sessions: {},
                    totalJoins: 0,
                };
            }

            const action = (record.action || record.status || '').toLowerCase();

            if (action === 'join' || action === 'present' || action === 'left' || action === 'leave') {
                if (!studentAttendanceMap[studentId].sessions[sessionDate]) {
                    studentAttendanceMap[studentId].sessions[sessionDate] = { attended: true };
                } else {
                    studentAttendanceMap[studentId].sessions[sessionDate].attended = true;
                }
                studentAttendanceMap[studentId].totalJoins += 1;
            }
        }
    });

    const totalSessions = sessionDates.size;
    const totalStudents = uniqueStudents.size;

    let totalAttended = 0;
    const totalPossibleAttendances = totalStudents * totalSessions;

    Object.values(studentAttendanceMap).forEach((student) => {
        totalAttended += Object.values(student.sessions).filter((s) => s.attended).length;
    });

    const attendanceRate =
        totalPossibleAttendances > 0
            ? parseFloat(((totalAttended / totalPossibleAttendances) * 100).toFixed(2))
            : 0;

    const lateArrivals = attendanceRecords.filter((record) => {
        if (record.action === 'JOIN' && record.timestamp) {
            const time = new Date(record.timestamp);
            const minute = time.getMinutes();
            return minute > 15;
        }
        return false;
    }).length;

    const sessionAttendanceCounts = Array.from(sessionDates).map((date) => {
        return Object.values(studentAttendanceMap).filter(
            (student) => student.sessions[date]?.attended
        ).length;
    });

    const averageSessionAttendance =
        sessionAttendanceCounts.length > 0
            ? parseFloat(
                (sessionAttendanceCounts.reduce((a, b) => a + b, 0) / sessionAttendanceCounts.length).toFixed(1)
            )
            : 0;

    return {
        courseId,
        totalStudents,
        totalSessions,
        attendanceRate,
        averageSessionAttendance,
        lateArrivals,
        totalRecords: attendanceRecords.length,
    };
};
