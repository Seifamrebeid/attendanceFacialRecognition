// Prediction Service
// Heuristic-based model to predict absence probability for students

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getStudentAttendance } from './attendanceService';
import { getStudentsByCourse } from './studentsService';

const COLLECTION_NAME = 'predictions';

/**
 * Calculate absence probability for a student in a course
 * 
 * PREDICTION MODEL EXPLANATION:
 * This heuristic model uses 4 weighted features to predict absence probability:
 * 
 * 1. Attendance Rate (40% weight):
 *    - Overall percentage of classes attended
 *    - Lower attendance = higher absence risk
 * 
 * 2. Recent Trend (30% weight):
 *    - Compares last 4 weeks vs previous 4 weeks
 *    - Increasing absences = higher risk
 * 
 * 3. Late Frequency (20% weight):
 *    - Percentage of late arrivals
 *    - High late frequency indicates disengagement
 * 
 * 4. Confidence Score Trend (10% weight):
 *    - Declining facial recognition confidence
 *    - May indicate proxy attendance or disengagement
 * 
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<number>} Probability (0-1)
 */
export const calculateAbsenceProbability = async (studentId, courseId) => {
    try {
        // Get all attendance records for this student in this course
        const records = await getStudentAttendance(studentId, courseId);

        if (records.length === 0) {
            return 0.5; // No data, neutral probability
        }

        // Feature 1: Overall Attendance Rate (40% weight)
        const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const attendanceRate = presentCount / records.length;
        const attendanceScore = 1 - attendanceRate; // Invert: low attendance = high risk

        // Feature 2: Recent Trend (30% weight)
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const recentRecords = records.filter(r => r.date >= fourWeeksAgo);
        const previousRecords = records.filter(r => r.date >= eightWeeksAgo && r.date < fourWeeksAgo);

        let trendScore = 0;
        if (recentRecords.length > 0 && previousRecords.length > 0) {
            const recentAbsenceRate = recentRecords.filter(r => r.status === 'absent').length / recentRecords.length;
            const previousAbsenceRate = previousRecords.filter(r => r.status === 'absent').length / previousRecords.length;

            // Positive trend score if absences are increasing
            trendScore = Math.max(0, recentAbsenceRate - previousAbsenceRate);
        } else if (recentRecords.length > 0) {
            // Only recent data available
            trendScore = recentRecords.filter(r => r.status === 'absent').length / recentRecords.length;
        }

        // Feature 3: Late Frequency (20% weight)
        const lateCount = records.filter(r => r.status === 'late').length;
        const lateFrequency = presentCount > 0 ? lateCount / presentCount : 0;
        const lateScore = lateFrequency; // High late frequency = high risk

        // Feature 4: Confidence Score Trend (10% weight)
        const recordsWithConfidence = records.filter(r => r.confidenceScore != null);
        let confidenceScore = 0;

        if (recordsWithConfidence.length >= 3) {
            const recentConfidence = recordsWithConfidence.slice(0, 3);
            const olderConfidence = recordsWithConfidence.slice(-3);

            const recentAvg = recentConfidence.reduce((sum, r) => sum + r.confidenceScore, 0) / recentConfidence.length;
            const olderAvg = olderConfidence.reduce((sum, r) => sum + r.confidenceScore, 0) / olderConfidence.length;

            // Declining confidence = higher risk
            confidenceScore = Math.max(0, (olderAvg - recentAvg) / 100);
        }

        // Weighted combination
        const probability = (
            attendanceScore * 0.40 +
            trendScore * 0.30 +
            lateScore * 0.20 +
            confidenceScore * 0.10
        );

        // Clamp to [0, 1]
        return Math.min(1, Math.max(0, probability));
    } catch (error) {
        console.error('Error calculating absence probability:', error);
        throw error;
    }
};

/**
 * Generate predictions for all students in a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of predictions with student info
 */
export const predictForCourse = async (courseId) => {
    try {
        // Get all students in the course
        const students = await getStudentsByCourse(courseId);

        // Calculate probability for each student
        const predictions = await Promise.all(
            students.map(async (student) => {
                const probability = await calculateAbsenceProbability(student.id, courseId);

                return {
                    studentId: student.id,
                    studentName: student.name,
                    studentEmail: student.email,
                    studentPhotoUrl: student.photoUrl,
                    courseId,
                    absenceProbability: probability,
                    riskLevel: getRiskLevel(probability),
                    generatedAt: new Date()
                };
            })
        );

        // Sort by probability (highest risk first)
        predictions.sort((a, b) => b.absenceProbability - a.absenceProbability);

        return predictions;
    } catch (error) {
        console.error('Error generating predictions for course:', error);
        throw error;
    }
};

/**
 * Get risk level label based on probability
 * @param {number} probability - Absence probability (0-1)
 * @returns {string} Risk level: 'low', 'medium', 'high', 'critical'
 */
const getRiskLevel = (probability) => {
    if (probability >= 0.7) return 'critical';
    if (probability >= 0.5) return 'high';
    if (probability >= 0.3) return 'medium';
    return 'low';
};

/**
 * Save predictions to Firestore
 * @param {Array} predictions - Array of prediction objects
 * @returns {Promise<void>}
 */
export const savePredictions = async (predictions) => {
    try {
        const predictionsRef = collection(db, COLLECTION_NAME);

        // Save each prediction
        const savePromises = predictions.map(prediction =>
            addDoc(predictionsRef, {
                ...prediction,
                generatedAt: Timestamp.fromDate(prediction.generatedAt)
            })
        );

        await Promise.all(savePromises);
    } catch (error) {
        console.error('Error saving predictions:', error);
        throw error;
    }
};

/**
 * Get latest predictions for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of latest predictions
 */
export const getLatestPredictions = async (courseId) => {
    try {
        const predictionsRef = collection(db, COLLECTION_NAME);
        const q = query(
            predictionsRef,
            where('courseId', '==', courseId),
            orderBy('generatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const predictions = [];
        const seenStudents = new Set();

        // Get only the most recent prediction for each student
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (!seenStudents.has(data.studentId)) {
                predictions.push({
                    id: doc.id,
                    ...data,
                    generatedAt: data.generatedAt?.toDate()
                });
                seenStudents.add(data.studentId);
            }
        });

        return predictions;
    } catch (error) {
        console.error('Error fetching predictions:', error);
        throw error;
    }
};

/**
 * HOW TO RETRAIN/UPDATE THE MODEL:
 * 
 * 1. When new attendance data is added (new weeks):
 *    - Simply call predictForCourse(courseId) again
 *    - The model automatically uses all available historical data
 *    - No separate training step needed (heuristic model)
 * 
 * 2. To adjust the model:
 *    - Modify the weights in calculateAbsenceProbability (currently 40/30/20/10)
 *    - Add new features by analyzing additional attendance patterns
 *    - Adjust the getRiskLevel thresholds based on your needs
 * 
 * 3. For production improvements:
 *    - Collect feedback on prediction accuracy
 *    - A/B test different weight combinations
 *    - Consider implementing a simple logistic regression if you have labeled data
 *    - Could integrate TensorFlow.js for more sophisticated ML
 */
