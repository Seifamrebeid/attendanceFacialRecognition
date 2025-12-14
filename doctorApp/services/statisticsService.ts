
export interface AttendanceRecord {
    id: string;
    studentName: string; // Format: Name_ID
    courseId: string;
    date: string;
    time: string; // "HH:mm:ss"
    action: 'JOIN' | 'LEFT' | 'LATE' | 'ABSENT';
    similarity: number;
    weekNumber: number;
    dayOfWeek: string;
    timestamp?: string;
    late?: boolean;
}

export interface StudentAnalytics {
    id: string;
    name: string;
    totalLectures: number;
    presentCount: number;
    absentCount: number;
    earlyLeaveCount: number;
    lateArrivalCount: number;

    // Percentages & Scores
    attendanceRate: number;    // 0-100
    earlyLeaveRate: number;    // 0-100
    disciplineScore: number;   // 0-100 (Time discipline)
    aqi: number;               // 0-100 (Attendance Quality Index)
    avgSimilarity: number;     // 0-1
    trustLevel: 'High' | 'Medium' | 'Low';

    // Risk
    riskLevel: 'Low' | 'Medium' | 'High';
    riskReason: string;

    // Predictive
    nextAbsenceProbability: number; // 0-1
    absentStreak: number;
    predictionScore: number; // 0-100
    predictionLabel: 'Low' | 'Medium' | 'High';
}

export interface CourseHealth {
    courseId: string;
    avgAttendance: number;
    avgEarlyLeave: number;
    avgSimilarity: number;
    riskConcentration: number; // % of students at High Risk
    healthScore: number; // 0-100
    trend: 'Up' | 'Down' | 'Stable';
}

export interface WeeklyTrend {
    name: string;
    Attendance: number;
    EarlyLeaves: number;
    Lateness: number;
    TrustScore: number;
}

// --- CONSTANTS ---
const SIMILARITY_THRESHOLD_HIGH = 0.85;
const SIMILARITY_THRESHOLD_LOW = 0.75;

// --- CORE ANALYTICS ---

export const analyzeStudent = (studentId: string, studentName: string, records: AttendanceRecord[], totalWeeksSoFar: number): StudentAnalytics => {
    const studentRecords = records.filter(r => (r.studentName || '').includes(studentId));

    // Unique weeks present validation
    const uniqueWeeksPresentSet = new Set(
        studentRecords
            .filter(r => r.action === 'JOIN' || r.action === 'LATE')
            .map(r => r.weekNumber)
    );
    const uniqueWeeksPresent = uniqueWeeksPresentSet.size;

    // Calculate Absent Streak (Backwards from totalWeeksSoFar)
    let absentStreak = 0;
    for (let w = totalWeeksSoFar; w >= 1; w--) {
        if (!uniqueWeeksPresentSet.has(w)) {
            absentStreak++;
        } else {
            break;
        }
    }

    // 1. Basic Counts
    const presentCount = uniqueWeeksPresent;
    const absentCount = totalWeeksSoFar - presentCount;
    const earlyLeaves = studentRecords.filter(r => r.action === 'LEFT').length;
    const lateArrivals = studentRecords.filter(r => r.action === 'LATE').length;

    const lateRate = presentCount > 0 ? (lateArrivals / presentCount) : 0;

    // 2. Rates
    const attendanceRate = totalWeeksSoFar > 0 ? (presentCount / totalWeeksSoFar) * 100 : 0;
    const earlyLeaveRate = presentCount > 0 ? (earlyLeaves / presentCount) * 100 : 0;

    // 3. Discipline Score
    const onTimeRate = 1 - lateRate;
    const stayFullRate = 1 - (earlyLeaveRate / 100);

    const disciplineScore = Math.round(
        ((attendanceRate / 100) * 40) +
        (onTimeRate * 30) +
        (stayFullRate * 30)
    );

    // 4. Similarity / Trust
    const similarityValues = studentRecords.map(r => r.similarity).filter(s => s > 0);
    const avgSimilarity = similarityValues.length > 0
        ? similarityValues.reduce((a, b) => a + b, 0) / similarityValues.length
        : 0;

    let trustLevel: 'High' | 'Medium' | 'Low' = 'Medium';
    if (avgSimilarity >= SIMILARITY_THRESHOLD_HIGH) trustLevel = 'High';
    else if (avgSimilarity < SIMILARITY_THRESHOLD_LOW) trustLevel = 'Low';

    // 5. AQI
    const aqi = Math.round(
        (attendanceRate * 0.5) +
        (disciplineScore * 0.3) +
        (avgSimilarity * 100 * 0.2)
    );

    // 6. Risk Assessment Logic
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    let riskReasons: string[] = [];

    if (attendanceRate < 60) {
        riskLevel = 'High';
        riskReasons.push('Critical attendance shortage');
    } else if (attendanceRate < 80) {
        if (riskLevel !== 'High') riskLevel = 'Medium';
        riskReasons.push('Low attendance');
    }

    if (earlyLeaveRate > 30) {
        riskLevel = 'High';
        riskReasons.push('Frequent early exits');
    } else if (earlyLeaveRate > 15) {
        if (riskLevel !== 'High') riskLevel = 'Medium';
        riskReasons.push('Occasional early exits');
    }

    if (avgSimilarity < 0.70 && avgSimilarity > 0) {
        riskReasons.push('Low biometric confidence');
        if (riskLevel === 'Low') riskLevel = 'Medium';
    }

    // --- Risk & Prediction Analytics ---

    // Trend Direction (Recent 3 Weeks)
    const recentWeeks = [totalWeeksSoFar, totalWeeksSoFar - 1, totalWeeksSoFar - 2].filter(w => w >= 1);
    const recentAbsences = recentWeeks.filter(w => !uniqueWeeksPresentSet.has(w)).length;

    // Prediction Score (0-100)
    let predictionScore = 0;

    // Factor A: Past Absences
    if (attendanceRate < 50) predictionScore += 40;
    else if (attendanceRate < 75) predictionScore += 20;

    // Factor B: Absence Streak
    predictionScore += (absentStreak * 20);

    // Factor C: Trend Direction
    if (recentAbsences === 3) predictionScore += 20;
    else if (recentAbsences >= 1 && absentStreak === 0) predictionScore += 5;

    // Cap at 100
    predictionScore = Math.min(100, predictionScore);

    let predictionLabel: 'Low' | 'Medium' | 'High' = 'Low';
    if (predictionScore >= 80) predictionLabel = 'High';
    else if (predictionScore >= 40) predictionLabel = 'Medium';

    // Legacy nextAbsenceProbability
    const lastWeek = totalWeeksSoFar;
    const attendedLastWeek = studentRecords.some(r => r.weekNumber === lastWeek && (r.action === 'JOIN' || r.action === 'LATE'));
    let nextAbsenceProbability = 0.2;
    if (!attendedLastWeek) nextAbsenceProbability += 0.4;
    if (earlyLeaveRate > 50) nextAbsenceProbability += 0.2;

    const riskReason = riskReasons.length > 0 ? riskReasons.join(', ') : 'Stable performance';

    return {
        id: studentId,
        name: studentName,
        totalLectures: totalWeeksSoFar,
        presentCount,
        absentCount,
        earlyLeaveCount: earlyLeaves,
        lateArrivalCount: lateArrivals,
        attendanceRate: Math.round(attendanceRate),
        earlyLeaveRate: Math.round(earlyLeaveRate),
        disciplineScore,
        aqi,
        avgSimilarity,
        trustLevel,
        riskLevel,
        riskReason,
        nextAbsenceProbability,
        absentStreak,
        predictionScore,
        predictionLabel
    };
};

export const calculateCourseHealth = (students: StudentAnalytics[]): CourseHealth => {
    if (students.length === 0) return {
        courseId: 'all', avgAttendance: 0, avgEarlyLeave: 0, avgSimilarity: 0, riskConcentration: 0, healthScore: 0, trend: 'Stable'
    };

    const avgAttendance = students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length;
    const avgEarlyLeave = students.reduce((sum, s) => sum + s.earlyLeaveRate, 0) / students.length;
    const avgSimilarity = students.reduce((sum, s) => sum + s.avgSimilarity, 0) / students.length;
    const highRiskCount = students.filter(s => s.riskLevel === 'High').length;
    const riskConcentration = (highRiskCount / students.length) * 100;

    let healthScore = 100 - (100 - avgAttendance) - (riskConcentration * 0.5);
    healthScore = Math.max(0, Math.round(healthScore));

    return {
        courseId: 'all',
        avgAttendance: Math.round(avgAttendance),
        avgEarlyLeave: Math.round(avgEarlyLeave),
        avgSimilarity,
        riskConcentration: Math.round(riskConcentration),
        healthScore,
        trend: 'Stable'
    };
};

export const analyzeTrends = (records: AttendanceRecord[]): WeeklyTrend[] => {
    const groups: Record<number, { week: string, joins: number, lefts: number, totalSim: number, countSim: number, late: number }> = {};

    records.forEach(r => {
        const w = r.weekNumber || 1;
        if (!groups[w]) groups[w] = { week: `Week ${w}`, joins: 0, lefts: 0, totalSim: 0, countSim: 0, late: 0 };

        if (r.action === 'JOIN') groups[w].joins++;
        if (r.action === 'LEFT') groups[w].lefts++;
        if (r.action === 'LATE') { groups[w].late++; groups[w].joins++; }

        if (r.similarity > 0) {
            groups[w].totalSim += r.similarity;
            groups[w].countSim++;
        }
    });

    return Object.values(groups)
        .sort((a, b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1]))
        .map(g => ({
            name: g.week,
            Attendance: g.joins,
            EarlyLeaves: g.lefts,
            Lateness: g.late,
            TrustScore: g.countSim > 0 ? (g.totalSim / g.countSim) * 100 : 0
        }));
};
