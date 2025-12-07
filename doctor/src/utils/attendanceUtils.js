// Utilities for attendance data processing

/**
 * Get current status for each student based on last action
 * @param {Array} attendanceRecords - All attendance records
 * @returns {Object} Map of studentName -> current status info
 */
export const getCurrentStudentStatuses = (attendanceRecords) => {
  const studentStatuses = {};

  // Sort by timestamp descending
  const sorted = [...attendanceRecords].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.createdAt);
    const timeB = new Date(b.timestamp || b.createdAt);
    return timeB - timeA;
  });

  // Get last action for each student
  sorted.forEach((record) => {
    const studentName = record.studentName;
    if (!studentStatuses[studentName]) {
      studentStatuses[studentName] = {
        studentName,
        currentStatus: record.action, // JOIN, LEFT, or RETURNED
        lastTimestamp: record.timestamp || record.createdAt,
        lastSeen: new Date(
          record.timestamp || record.createdAt
        ).toLocaleString(),
        similarity: record.similarity,
      };
    }
  });

  return studentStatuses;
};

/**
 * Count unique weeks attended per student
 * @param {Array} attendanceRecords - All attendance records
 * @returns {Object} Map of studentName -> unique weeks count
 */
export const getStudentJoinCounts = (attendanceRecords) => {
  const studentWeeks = {};

  attendanceRecords.forEach((record) => {
    const studentName = record.studentName;
    const weekNumber = record.weekNumber;

    if (record.action === "JOIN" && weekNumber) {
      if (!studentWeeks[studentName]) {
        studentWeeks[studentName] = new Set();
      }
      studentWeeks[studentName].add(weekNumber);
    }
  });

  // Convert Sets to counts
  const joinCounts = {};
  Object.keys(studentWeeks).forEach((name) => {
    joinCounts[name] = studentWeeks[name].size;
  });

  return joinCounts;
};

/**
 * Group attendance records by week number
 * @param {Array} attendanceRecords - All attendance records
 * @returns {Object} Map of weekNumber -> records array
 */
export const groupByWeek = (attendanceRecords) => {
  const weekGroups = {};

  attendanceRecords.forEach((record) => {
    const week = record.weekNumber || 0;
    if (!weekGroups[week]) {
      weekGroups[week] = [];
    }
    weekGroups[week].push(record);
  });

  return weekGroups;
};

/**
 * Calculate weekly statistics
 * @param {Array} weekRecords - Attendance records for a specific week
 * @param {number} maxStudents - Maximum students in course
 * @returns {Object} Weekly statistics
 */
export const calculateWeekStats = (weekRecords, maxStudents) => {
  const uniqueStudents = new Set(weekRecords.map((r) => r.studentName)).size;
  const joinCount = weekRecords.filter((r) => r.action === "JOIN").length;
  const leftCount = weekRecords.filter((r) => r.action === "LEFT").length;
  const returnedCount = weekRecords.filter(
    (r) => r.action === "RETURNED"
  ).length;

  const similarities = weekRecords
    .filter((r) => r.similarity !== undefined)
    .map((r) => r.similarity);
  const avgSimilarity =
    similarities.length > 0
      ? similarities.reduce((sum, val) => sum + val, 0) / similarities.length
      : 0;

  const attendanceRate =
    maxStudents > 0 ? (uniqueStudents / maxStudents) * 100 : 0;

  return {
    uniqueStudents,
    attendanceRate: attendanceRate.toFixed(1),
    joinCount,
    leftCount,
    returnedCount,
    avgSimilarity: avgSimilarity.toFixed(2),
    totalRecords: weekRecords.length,
  };
};

/**
 * Calculate overall course statistics
 * @param {Array} attendanceRecords - All attendance records
 * @param {number} maxStudents - Maximum students in course
 * @returns {Object} Overall statistics
 */
export const calculateOverallStats = (attendanceRecords, maxStudents) => {
  const uniqueStudents = new Set(attendanceRecords.map((r) => r.studentName))
    .size;
  const totalJoins = attendanceRecords.filter(
    (r) => r.action === "JOIN"
  ).length;
  const totalLeft = attendanceRecords.filter((r) => r.action === "LEFT").length;
  const totalReturned = attendanceRecords.filter(
    (r) => r.action === "RETURNED"
  ).length;

  const similarities = attendanceRecords
    .filter((r) => r.similarity !== undefined)
    .map((r) => r.similarity);
  const avgSimilarity =
    similarities.length > 0
      ? similarities.reduce((sum, val) => sum + val, 0) / similarities.length
      : 0;

  const attendanceRate =
    maxStudents > 0 ? (uniqueStudents / maxStudents) * 100 : 0;

  return {
    totalStudents: uniqueStudents,
    totalRecords: attendanceRecords.length,
    totalJoins,
    totalLeft,
    totalReturned,
    avgSimilarity: avgSimilarity.toFixed(2),
    attendanceRate: attendanceRate.toFixed(1),
  };
};
