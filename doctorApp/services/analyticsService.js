// Analytics Service
// Handles late threshold calculations and analytics for arrival times

import { getArrivalTimes } from "./attendanceService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Calculate statistics for arrival times
 * @param {Array} arrivalTimes - Array of Date objects
 * @returns {Object} Statistics
 */
const calculateStatistics = (arrivalTimes) => {
  if (arrivalTimes.length === 0) {
    return { mean: 0, stdDev: 0, percentile75: 0, percentile90: 0 };
  }

  const minutesArray = arrivalTimes.map((time) => {
    return time.getHours() * 60 + time.getMinutes();
  });

  const sum = minutesArray.reduce((acc, val) => acc + val, 0);
  const mean = sum / minutesArray.length;

  const squaredDiffs = minutesArray.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((acc, val) => acc + val, 0) / minutesArray.length;
  const stdDev = Math.sqrt(variance);

  const sorted = [...minutesArray].sort((a, b) => a - b);
  const percentile75Index = Math.floor(sorted.length * 0.75);
  const percentile90Index = Math.floor(sorted.length * 0.9);

  return {
    mean,
    stdDev,
    percentile75: sorted[percentile75Index] || mean,
    percentile90: sorted[percentile90Index] || mean,
    min: sorted[0] || 0,
    max: sorted[sorted.length - 1] || 0,
  };
};

/**
 * Calculate late threshold for a course
 * @param {string} courseId - Course ID
 * @param {string} method - Calculation method
 * @param {number} fixedMinutes - Minutes after start time
 * @param {number} percentileValue - Percentile value
 * @returns {Promise<Object>} Threshold information
 */
export const calculateLateThreshold = async (
  courseId,
  method = "meanPlusSD",
  fixedMinutes = 10,
  percentileValue = 75
) => {
  try {
    const courseRef = doc(db, "courses", courseId);
    const courseDoc = await getDoc(courseRef);

    if (!courseDoc.exists()) {
      throw new Error("Course not found");
    }

    const courseData = courseDoc.data();
    const startTime = courseData.startTime;

    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;

    let thresholdMinutes;
    let thresholdInfo = {
      method,
      startTime,
      startMinutes,
    };

    if (method === "fixed") {
      thresholdMinutes = startMinutes + fixedMinutes;
      thresholdInfo.fixedMinutes = fixedMinutes;
      thresholdInfo.thresholdMinutes = thresholdMinutes;
    } else {
      const arrivalTimes = await getArrivalTimes(courseId);

      if (arrivalTimes.length === 0) {
        thresholdMinutes = startMinutes + 10;
        thresholdInfo.fallback = true;
      } else {
        const stats = calculateStatistics(arrivalTimes);
        thresholdInfo.statistics = stats;

        if (method === "meanPlusSD") {
          thresholdMinutes = stats.mean + stats.stdDev;
        } else if (method === "percentile") {
          thresholdMinutes =
            stats[`percentile${percentileValue}`] || stats.percentile75;
        }
      }
    }

    const thresholdHours = Math.floor(thresholdMinutes / 60);
    const thresholdMins = Math.round(thresholdMinutes % 60);
    thresholdInfo.thresholdTime = `${String(thresholdHours).padStart(
      2,
      "0"
    )}:${String(thresholdMins).padStart(2, "0")}`;
    thresholdInfo.thresholdMinutes = thresholdMinutes;

    return thresholdInfo;
  } catch (error) {
    console.error("Error calculating late threshold:", error);
    throw error;
  }
};

/**
 * Get late analytics for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Analytics data
 */
export const getLateAnalytics = async (courseId) => {
  try {
    const arrivalTimes = await getArrivalTimes(courseId);
    const stats = calculateStatistics(arrivalTimes);

    return {
      totalRecords: arrivalTimes.length,
      statistics: stats,
      arrivalTimes: arrivalTimes,
    };
  } catch (error) {
    console.error("Error getting late analytics:", error);
    return { totalRecords: 0, statistics: {}, arrivalTimes: [] };
  }
};
