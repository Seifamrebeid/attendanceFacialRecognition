// Course Statistics Service
// Provides comprehensive statistics for each course from Firebase data

import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getAllCourses } from "./coursesService";

/**
 * Get comprehensive statistics for a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Course statistics object
 */
export const getCourseStatistics = async (courseId) => {
  try {
    // Fetch attendance records for this course
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, where("courseId", "==", courseId));
    const attendanceSnapshot = await getDocs(q);

    const attendanceRecords = [];
    attendanceSnapshot.forEach((doc) => {
      attendanceRecords.push({ id: doc.id, ...doc.data() });
    });

    // Calculate statistics
    const stats = calculateCourseStats(attendanceRecords, courseId);

    return stats;
  } catch (error) {
    console.error("Error fetching course statistics:", error);
    throw error;
  }
};

/**
 * Get statistics for all courses
 * @returns {Promise<Array>} Array of course statistics
 */
export const getAllCoursesStatistics = async () => {
  try {
    // Get all courses
    const courses = await getAllCourses();

    // Get all attendance records
    const attendanceRef = collection(db, "attendance");
    const attendanceSnapshot = await getDocs(attendanceRef);

    const allAttendanceRecords = [];
    attendanceSnapshot.forEach((doc) => {
      allAttendanceRecords.push({ id: doc.id, ...doc.data() });
    });

    // Calculate statistics for each course
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
    console.error("Error fetching all courses statistics:", error);
    throw error;
  }
};

/**
 * Calculate statistics from attendance records
 * @private
 * @param {Array} attendanceRecords - Array of attendance records
 * @param {string} courseId - Course ID
 * @returns {Object} Statistics object
 */
const calculateCourseStats = (attendanceRecords, courseId) => {
  // Group records by student and session
  const studentAttendanceMap = {};
  const sessionDates = new Set();
  const uniqueStudents = new Set();

  attendanceRecords.forEach((record) => {
    const timestamp = record.timestamp || record.createdAt;
    const sessionDate = timestamp
      ? new Date(timestamp).toISOString().split("T")[0]
      : "unknown";
    sessionDates.add(sessionDate);

    // Extract student identifier
    let studentId = record.studentId || record.studentNumber;
    if (!studentId && record.studentName) {
      const parts = record.studentName.split("_");
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
          totalLeaves: 0,
          totalAbsences: 0,
        };
      }

      const action = (record.action || record.status || "").toLowerCase();

      // Debug logging
      if (action === "JOIN") {
        console.log(
          `Processing JOIN: Student ${studentId}, Date: ${sessionDate}, Action: ${record.action}`
        );
      }

      // ANY record means the student was there/recorded (attended)
      // We track all actions but they all mean the student showed up
      if (
        action === "join" ||
        action === "present" ||
        action === "LEFT" ||
        action === "leave"
      ) {
        if (action === "join" || action === "present") {
          studentAttendanceMap[studentId].totalJoins += 1;
        } else if (action === "LEFT" || action === "leave") {
          studentAttendanceMap[studentId].totalLeaves += 1;
        }

        // Mark as attended (they showed up)
        if (!studentAttendanceMap[studentId].sessions[sessionDate]) {
          studentAttendanceMap[studentId].sessions[sessionDate] = {
            attended: true,
          };
        } else {
          studentAttendanceMap[studentId].sessions[sessionDate].attended = true;
        }
      } else if (action === "absent") {
        // Even "absent" status means they were recorded/tracked that week
        studentAttendanceMap[studentId].totalAbsences += 1;
        if (!studentAttendanceMap[studentId].sessions[sessionDate]) {
          studentAttendanceMap[studentId].sessions[sessionDate] = {
            attended: true, // They showed up/were recorded
          };
        } else {
          studentAttendanceMap[studentId].sessions[sessionDate].attended = true;
        }
      }
    }
  });

  // Calculate attendance rate
  const totalSessions = sessionDates.size;
  const totalStudents = uniqueStudents.size;

  let totalAttended = 0;
  let totalPossibleAttendances = totalStudents * totalSessions;

  Object.values(studentAttendanceMap).forEach((student) => {
    totalAttended += Object.values(student.sessions).filter(
      (s) => s.attended
    ).length;
  });

  const attendanceRate =
    totalPossibleAttendances > 0
      ? ((totalAttended / totalPossibleAttendances) * 100).toFixed(2)
      : 0;

  // Calculate late arrivals (students who joined after a certain time)
  const lateArrivals = attendanceRecords.filter((record) => {
    if (record.action === "JOIN" && record.timestamp) {
      const time = new Date(record.timestamp);
      const hour = time.getHours();
      const minute = time.getMinutes();
      // Consider late if after 15 minutes past the hour (adjust as needed)
      return minute > 15;
    }
    return false;
  }).length;

  // Calculate average session attendance
  const sessionAttendanceCounts = Array.from(sessionDates).map((date) => {
    return Object.values(studentAttendanceMap).filter(
      (student) => student.sessions[date]?.attended
    ).length;
  });

  const averageSessionAttendance =
    sessionAttendanceCounts.length > 0
      ? (
          sessionAttendanceCounts.reduce((a, b) => a + b, 0) /
          sessionAttendanceCounts.length
        ).toFixed(1)
      : 0;

  // Calculate average time spent in lectures
  const FULL_LECTURE_DURATION_MINUTES = 90; // 1.5 hours

  // Group records by week and student, then sort by timestamp
  const weeklyRecords = {};

  attendanceRecords.forEach((record) => {
    let studentId = record.studentId || record.studentNumber;
    if (!studentId && record.studentName) {
      const parts = record.studentName.split("_");
      studentId = parts[parts.length - 1];
    }

    if (!studentId) return;

    const weekNumber = record.weekNumber || 1;
    const timestamp = record.timestamp || record.createdAt;
    const sessionDate = timestamp
      ? new Date(timestamp).toISOString().split("T")[0]
      : "unknown";

    const key = `${studentId}_${weekNumber}_${sessionDate}`;

    if (!weeklyRecords[key]) {
      weeklyRecords[key] = {
        studentId,
        weekNumber,
        sessionDate,
        records: [],
      };
    }

    weeklyRecords[key].records.push({
      action: (record.action || record.status || "").toLowerCase(),
      timestamp: new Date(timestamp),
      timestampStr: timestamp,
    });
  });

  // Sort records by timestamp within each session
  Object.values(weeklyRecords).forEach((session) => {
    session.records.sort((a, b) => a.timestamp - b.timestamp);
  });

  // Calculate time spent for each session
  const studentSessionTimes = {};

  Object.values(weeklyRecords).forEach((session) => {
    const { studentId, weekNumber, sessionDate, records } = session;

    let totalMinutesInside = 0;
    let joinTime = null;

    // Process records in order to find JOIN/LEFT pairs
    records.forEach((record) => {
      if (record.action === "join" || record.action === "present") {
        if (!joinTime) {
          joinTime = record.timestamp;
        }
      } else if (record.action === "left" || record.action === "leave") {
        if (joinTime) {
          // Calculate duration for this JOIN-LEFT pair
          const durationMinutes = (record.timestamp - joinTime) / (1000 * 60);
          totalMinutesInside += durationMinutes;
          joinTime = null; // Reset for next pair
        }
      }
    });

    // If there's a JOIN without LEFT, assume they stayed until end (90 min from first join)
    if (joinTime && records.length > 0) {
      const firstJoinTime = records.find(
        (r) => r.action === "join" || r.action === "present"
      )?.timestamp;
      if (firstJoinTime) {
        totalMinutesInside += FULL_LECTURE_DURATION_MINUTES;
      }
    }

    // Cap at maximum lecture duration
    totalMinutesInside = Math.min(
      totalMinutesInside,
      FULL_LECTURE_DURATION_MINUTES
    );

    if (!studentSessionTimes[studentId]) {
      studentSessionTimes[studentId] = {};
    }

    studentSessionTimes[studentId][sessionDate] = {
      weekNumber,
      totalMinutesInside,
      totalMinutesOutside: FULL_LECTURE_DURATION_MINUTES - totalMinutesInside,
      hadJoin: records.some(
        (r) => r.action === "join" || r.action === "present"
      ),
      hadLeft: records.some((r) => r.action === "left" || r.action === "leave"),
    };
  });

  // Calculate averages across all sessions
  let totalMinutesInside = 0;
  let totalMinutesOutside = 0;
  let sessionCount = 0;
  let sessionsWithLeftRecord = 0;

  Object.values(studentSessionTimes).forEach((sessions) => {
    Object.values(sessions).forEach((session) => {
      if (session.hadJoin) {
        totalMinutesInside += session.totalMinutesInside;
        totalMinutesOutside += session.totalMinutesOutside;
        sessionCount += 1;

        if (session.hadLeft) {
          sessionsWithLeftRecord += 1;
        }
      }
    });
  });

  const averageLectureStayMinutes =
    sessionCount > 0 ? (totalMinutesInside / sessionCount).toFixed(1) : 0;
  const averageOutsideMinutes =
    sessionCount > 0 ? (totalMinutesOutside / sessionCount).toFixed(1) : 0;

  return {
    courseId,
    totalStudents,
    totalSessions,
    totalAttendanceRecords: attendanceRecords.length,
    attendanceRate: parseFloat(attendanceRate),
    averageSessionAttendance: parseFloat(averageSessionAttendance),
    averageLectureStayMinutes: parseFloat(averageLectureStayMinutes),
    averageOutsideMinutes: parseFloat(averageOutsideMinutes),
    lateArrivals,
    studentsAtRisk: 0,
    sessionDates: Array.from(sessionDates).sort(),
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Get attendance trends over time for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of attendance data points by date
 */
export const getCourseAttendanceTrends = async (courseId) => {
  try {
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    const recordsByDate = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp || data.createdAt;
      if (!timestamp) return;

      const date = new Date(timestamp).toISOString().split("T")[0];

      if (!recordsByDate[date]) {
        recordsByDate[date] = {
          date,
          joins: 0,
          leaves: 0,
          absences: 0,
          uniqueStudents: new Set(),
        };
      }

      const action = (data.action || data.status || "").toUpperCase();

      if (action === "JOIN" || action === "PRESENT") {
        recordsByDate[date].joins += 1;
      } else if (action === "LEFT" || action === "LEAVE") {
        recordsByDate[date].leaves += 1;
      } else if (action === "ABSENT") {
        recordsByDate[date].absences += 1;
      }

      let studentId = data.studentId || data.studentNumber;
      if (!studentId && data.studentName) {
        const parts = data.studentName.split("_");
        studentId = parts[parts.length - 1];
      }
      if (studentId) {
        recordsByDate[date].uniqueStudents.add(studentId);
      }
    });

    // Convert to array and calculate percentages
    const trends = Object.values(recordsByDate)
      .map((day) => ({
        date: day.date,
        joins: day.joins,
        leaves: day.leaves,
        absences: day.absences,
        uniqueStudents: day.uniqueStudents.size,
        attendanceCount: day.joins,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trends;
  } catch (error) {
    console.error("Error fetching course attendance trends:", error);
    return [];
  }
};

/**
 * Export course statistics to a formatted object for reporting
 * @param {Object} stats - Statistics object from getCourseStatistics
 * @param {Object} courseInfo - Course information
 * @returns {Object} Formatted report object
 */
export const formatCourseReport = (stats, courseInfo) => {
  return {
    courseName: courseInfo.name || courseInfo.courseName,
    courseCode: courseInfo.code || courseInfo.courseCode,
    instructor: courseInfo.instructorName || courseInfo.lecturerName,
    reportDate: new Date().toLocaleDateString(),
    summary: {
      totalStudents: stats.totalStudents,
      totalSessions: stats.totalSessions,
      overallAttendanceRate: `${stats.attendanceRate}%`,
      averageStudentsPerSession: stats.averageSessionAttendance,
      studentsAtRisk: stats.studentsAtRisk,
      lateArrivals: stats.lateArrivals,
    },
    studentDetails: stats.studentsWithStats,
    sessionDates: stats.sessionDates,
    recommendations: generateRecommendations(stats),
  };
};

/**
 * Generate recommendations based on course statistics
 * @private
 * @param {Object} stats - Statistics object
 * @returns {Array} Array of recommendation strings
 */
const generateRecommendations = (stats) => {
  const recommendations = [];

  if (stats.attendanceRate < 70) {
    recommendations.push(
      "⚠️ Low overall attendance rate. Consider reviewing course engagement strategies."
    );
  }

  if (stats.studentsAtRisk > 0) {
    recommendations.push(
      `📧 ${stats.studentsAtRisk} student(s) at risk. Recommend sending individual check-ins or warnings.`
    );
  }

  if (stats.lateArrivals > stats.totalAttendanceRecords * 0.2) {
    recommendations.push(
      "⏰ High number of late arrivals. Consider reviewing class timing or policies."
    );
  }

  if (stats.attendanceRate >= 90) {
    recommendations.push(
      "✅ Excellent attendance rate! Keep up the good work."
    );
  }

  if (stats.totalSessions < 5) {
    recommendations.push(
      "ℹ️ Limited session data. Statistics will be more accurate with more sessions."
    );
  }

  return recommendations;
};
