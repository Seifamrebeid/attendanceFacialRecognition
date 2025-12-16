// Analytics Service
// Handles late threshold calculations and analytics for arrival times

import { getArrivalTimes } from './attendanceService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Calculate statistics for arrival times
 * @param {Array} arrivalTimes - Array of Date objects
 * @returns {Object} Statistics (mean, stdDev, percentiles)
 */
const calculateStatistics = (arrivalTimes) => {
    if (arrivalTimes.length === 0) {
        return { mean: 0, stdDev: 0, percentile75: 0, percentile90: 0 };
    }

    // Convert times to minutes since midnight for easier calculation
    const minutesArray = arrivalTimes.map(time => {
        return time.getHours() * 60 + time.getMinutes();
    });

    // Calculate mean
    const sum = minutesArray.reduce((acc, val) => acc + val, 0);
    const mean = sum / minutesArray.length;

    // Calculate standard deviation
    const squaredDiffs = minutesArray.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / minutesArray.length;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const sorted = [...minutesArray].sort((a, b) => a - b);
    const percentile75Index = Math.floor(sorted.length * 0.75);
    const percentile90Index = Math.floor(sorted.length * 0.90);

    return {
        mean,
        stdDev,
        percentile75: sorted[percentile75Index] || mean,
        percentile90: sorted[percentile90Index] || mean,
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0
    };
};

/**
 * Calculate late threshold for a course
 * @param {string} courseId - Course ID
 * @param {string} method - Calculation method: 'fixed', 'meanPlusSD', 'percentile'
 * @param {number} fixedMinutes - Minutes after start time (for fixed method)
 * @param {number} percentileValue - Percentile value (default 75)
 * @returns {Promise<Object>} Threshold information
 */
export const calculateLateThreshold = async (courseId, method = 'meanPlusSD', fixedMinutes = 10, percentileValue = 75) => {
    try {
        // Get course start time
        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseRef);

        if (!courseDoc.exists()) {
            throw new Error('Course not found');
        }

        const courseData = courseDoc.data();
        const startTime = courseData.startTime; // Expected format: "10:00" or similar

        // Parse start time to minutes since midnight
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;

        let thresholdMinutes;
        let thresholdInfo = {
            method,
            startTime,
            startMinutes
        };

        if (method === 'fixed') {
            // Fixed minutes after start time
            thresholdMinutes = startMinutes + fixedMinutes;
            thresholdInfo.fixedMinutes = fixedMinutes;
            thresholdInfo.thresholdMinutes = thresholdMinutes;
        } else {
            // Get historical arrival times
            const arrivalData = await getArrivalTimes(courseId);
            const arrivalTimes = arrivalData.map(record => record.arrivalTime);

            if (arrivalTimes.length === 0) {
                // Fallback to fixed if no data
                thresholdMinutes = startMinutes + 10;
                thresholdInfo.fallback = true;
            } else {
                const stats = calculateStatistics(arrivalTimes);
                thresholdInfo.statistics = stats;

                if (method === 'meanPlusSD') {
                    // Mean + 1 standard deviation
                    thresholdMinutes = stats.mean + stats.stdDev;
                } else if (method === 'percentile') {
                    // Use specified percentile
                    const sorted = arrivalTimes
                        .map(time => time.getHours() * 60 + time.getMinutes())
                        .sort((a, b) => a - b);
                    const percentileIndex = Math.floor(sorted.length * (percentileValue / 100));
                    thresholdMinutes = sorted[percentileIndex] || stats.mean;
                    thresholdInfo.percentileValue = percentileValue;
                }
            }

            thresholdInfo.thresholdMinutes = thresholdMinutes;
        }

        // Convert back to time format
        const thresholdHours = Math.floor(thresholdMinutes / 60);
        const thresholdMins = Math.floor(thresholdMinutes % 60);
        thresholdInfo.thresholdTime = `${String(thresholdHours).padStart(2, '0')}:${String(thresholdMins).padStart(2, '0')}`;

        return thresholdInfo;
    } catch (error) {
        console.error('Error calculating late threshold:', error);
        throw error;
    }
};

/**
 * Get arrival time distribution for visualization
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Distribution data for charting
 */
export const getArrivalTimeDistribution = async (courseId) => {
    try {
        const arrivalData = await getArrivalTimes(courseId);

        // Create histogram bins (5-minute intervals)
        const bins = {};
        const binSize = 5; // minutes

        arrivalData.forEach(record => {
            const time = record.arrivalTime;
            const minutes = time.getHours() * 60 + time.getMinutes();
            const binKey = Math.floor(minutes / binSize) * binSize;

            if (!bins[binKey]) {
                bins[binKey] = { count: 0, present: 0, late: 0 };
            }

            bins[binKey].count++;
            if (record.status === 'present') {
                bins[binKey].present++;
            } else if (record.status === 'late') {
                bins[binKey].late++;
            }
        });

        // Convert to array for charting
        const distribution = Object.keys(bins)
            .sort((a, b) => Number(a) - Number(b))
            .map(binKey => {
                const minutes = Number(binKey);
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const timeLabel = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

                return {
                    time: timeLabel,
                    minutes: minutes,
                    count: bins[binKey].count,
                    present: bins[binKey].present,
                    late: bins[binKey].late
                };
            });

        return distribution;
    } catch (error) {
        console.error('Error getting arrival time distribution:', error);
        throw error;
    }
};

/**
 * Get weekly late trend
 * @param {string} courseId - Course ID
 * @param {number} weeks - Number of weeks to analyze (default 8)
 * @returns {Promise<Array>} Weekly late counts
 */
export const getWeeklyLateTrend = async (courseId, weeks = 8) => {
    try {
        const arrivalData = await getArrivalTimes(courseId);

        // Group by week
        const weeklyData = {};
        const now = new Date();

        arrivalData.forEach(record => {
            const time = record.arrivalTime;
            const weeksDiff = Math.floor((now - time) / (7 * 24 * 60 * 60 * 1000));

            if (weeksDiff < weeks) {
                const weekKey = `Week ${weeks - weeksDiff}`;

                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = { total: 0, late: 0, present: 0 };
                }

                weeklyData[weekKey].total++;
                if (record.status === 'late') {
                    weeklyData[weekKey].late++;
                } else if (record.status === 'present') {
                    weeklyData[weekKey].present++;
                }
            }
        });

        // Convert to array
        const trend = Object.keys(weeklyData).map(week => ({
            week,
            total: weeklyData[week].total,
            late: weeklyData[week].late,
            present: weeklyData[week].present,
            latePercentage: (weeklyData[week].late / weeklyData[week].total * 100).toFixed(1)
        }));

        return trend;
    } catch (error) {
        console.error('Error getting weekly late trend:', error);
        throw error;
    }
};
