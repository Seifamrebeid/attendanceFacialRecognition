// Prediction Service
// Heuristic-based model to predict absence probability for students

import { getStudentAttendance } from "./attendanceService";
import { getStudentsByCourse } from "./studentsService";

/**
 * Calculate absence probability for a student in a course
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<number>} Probability (0-1)
 */
export const calculateAbsenceProbability = async (studentId, courseId) => {
  try {
    const records = await getStudentAttendance(studentId, courseId);

    if (records.length === 0) {
      return 0.5; // No data, neutral probability
    }

    // Feature 1: Overall Attendance Rate (40% weight)
    const presentCount = records.filter(
      (r) => r.status === "present" || r.status === "late"
    ).length;
    const attendanceRate = presentCount / records.length;
    const attendanceScore = 1 - attendanceRate;

    // Feature 2: Recent Trend (30% weight)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const recentRecords = records.filter((r) => r.date >= fourWeeksAgo);
    const previousRecords = records.filter(
      (r) => r.date >= eightWeeksAgo && r.date < fourWeeksAgo
    );

    let trendScore = 0;
    if (recentRecords.length > 0 && previousRecords.length > 0) {
      const recentAbsenceRate =
        recentRecords.filter((r) => r.status === "absent").length /
        recentRecords.length;
      const previousAbsenceRate =
        previousRecords.filter((r) => r.status === "absent").length /
        previousRecords.length;
      trendScore = Math.max(0, recentAbsenceRate - previousAbsenceRate);
    } else if (recentRecords.length > 0) {
      trendScore =
        recentRecords.filter((r) => r.status === "absent").length /
        recentRecords.length;
    }

    // Feature 3: Late Frequency (20% weight)
    const lateCount = records.filter((r) => r.status === "late").length;
    const lateFrequency = presentCount > 0 ? lateCount / presentCount : 0;
    const lateScore = lateFrequency;

    // Feature 4: Confidence Score Trend (10% weight)
    const recordsWithConfidence = records.filter(
      (r) => r.confidenceScore != null
    );
    let confidenceScore = 0;

    if (recordsWithConfidence.length >= 3) {
      const recentConfidence = recordsWithConfidence.slice(0, 3);
      const olderConfidence = recordsWithConfidence.slice(-3);

      const recentAvg =
        recentConfidence.reduce((sum, r) => sum + r.confidenceScore, 0) /
        recentConfidence.length;
      const olderAvg =
        olderConfidence.reduce((sum, r) => sum + r.confidenceScore, 0) /
        olderConfidence.length;

      confidenceScore = Math.max(0, (olderAvg - recentAvg) / 100);
    }

    // Weighted combination
    const probability =
      attendanceScore * 0.4 +
      trendScore * 0.3 +
      lateScore * 0.2 +
      confidenceScore * 0.1;

    return Math.max(0, Math.min(1, probability));
  } catch (error) {
    console.error("Error calculating absence probability:", error);
    return 0.5;
  }
};

/**
 * Get predictions for all students in a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of predictions
 */
export const getPredictionsForCourse = async (courseId) => {
  try {
    const students = await getStudentsByCourse(courseId);
    const predictions = [];

    for (const student of students) {
      const probability = await calculateAbsenceProbability(
        student.id,
        courseId
      );

      let riskLevel = "Low";
      if (probability >= 0.7) riskLevel = "High";
      else if (probability >= 0.4) riskLevel = "Medium";

      predictions.push({
        student,
        probability,
        riskLevel,
        predictedDate: new Date().toISOString(),
      });
    }

    predictions.sort((a, b) => b.probability - a.probability);
    return predictions;
  } catch (error) {
    console.error("Error getting predictions for course:", error);
    return [];
  }
};
