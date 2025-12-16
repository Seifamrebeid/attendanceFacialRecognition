/* eslint-disable no-unused-vars */

const SIMILARITY_THRESHOLD_HIGH = 0.85;
const SIMILARITY_THRESHOLD_LOW = 0.75;

// --- EXISTING FUNCTIONS (Preserved & Enhanced) ---

export const analyzeStudent = (studentId, studentName, records, totalWeeksSoFar) => {
    const studentRecords = records.filter(r => (r.studentName || '').includes(studentId));
    const uniqueWeeksPresentSet = new Set(studentRecords.filter(r => r.action === 'JOIN' || r.action === 'LATE').map(r => r.weekNumber));
    const uniqueWeeksPresent = uniqueWeeksPresentSet.size;

    // Calculate Absent Streak
    let absentStreak = 0;
    for (let w = totalWeeksSoFar; w >= 1; w--) {
        if (!uniqueWeeksPresentSet.has(w)) {
            absentStreak++;
        } else {
            break;
        }
    }

    const joins = studentRecords.filter(r => r.action === 'JOIN' || r.action === 'LATE').length;
    const presentCount = uniqueWeeksPresent;
    const absentCount = totalWeeksSoFar - presentCount;

    const earlyLeaves = studentRecords.filter(r => r.action === 'LEFT').length;
    const lateArrivals = studentRecords.filter(r => r.action === 'LATE').length;
    const lateRate = presentCount > 0 ? (lateArrivals / presentCount) : 0;

    const attendanceRate = totalWeeksSoFar > 0 ? (presentCount / totalWeeksSoFar) * 100 : 0;
    const earlyLeaveRate = presentCount > 0 ? (earlyLeaves / presentCount) * 100 : 0;

    const onTimeRate = 1 - lateRate;
    const stayFullRate = 1 - (earlyLeaveRate / 100);

    const disciplineScore = Math.round(
        ((attendanceRate / 100) * 40) +
        (onTimeRate * 30) +
        (stayFullRate * 30)
    );

    const similarityValues = studentRecords.map(r => r.similarity).filter(s => s > 0);
    const avgSimilarity = similarityValues.length > 0
        ? similarityValues.reduce((a, b) => a + b, 0) / similarityValues.length
        : 0;

    let trustLevel = 'Medium';
    if (avgSimilarity >= SIMILARITY_THRESHOLD_HIGH) trustLevel = 'High';
    else if (avgSimilarity < SIMILARITY_THRESHOLD_LOW) trustLevel = 'Low';

    // Weighted AQI
    const aqi = Math.round(
        (attendanceRate * 0.5) +
        (disciplineScore * 0.3) +
        (avgSimilarity * 100 * 0.2)
    );

    let riskLevel = 'Low';
    let riskReasons = [];

    if (attendanceRate < 60) { riskLevel = 'High'; riskReasons.push('Critical attendance shortage'); }
    else if (attendanceRate < 80) { if (riskLevel !== 'High') riskLevel = 'Medium'; riskReasons.push('Low attendance'); }

    if (earlyLeaveRate > 30) { riskLevel = 'High'; riskReasons.push('Frequent early exits'); }
    else if (earlyLeaveRate > 15) { if (riskLevel !== 'High') riskLevel = 'Medium'; riskReasons.push('Occasional early exits'); }

    if (avgSimilarity < 0.70 && avgSimilarity > 0) { riskReasons.push('Low biometric confidence'); if (riskLevel === 'Low') riskLevel = 'Medium'; }

    const lastWeek = totalWeeksSoFar;
    const attendedLastWeek = studentRecords.some(r => r.weekNumber === lastWeek && (r.action === 'JOIN' || r.action === 'LATE'));

    // --- Risk & Prediction Analytics ---

    // 1. Trend Direction (Recent 3 Weeks)
    const recentWeeks = [totalWeeksSoFar, totalWeeksSoFar - 1, totalWeeksSoFar - 2].filter(w => w >= 1);
    const recentAbsences = recentWeeks.filter(w => !uniqueWeeksPresentSet.has(w)).length;

    // 2. Calculate Prediction Score (0-100)
    let predictionScore = 0;

    // Factor A: Past Absences (Overall Rate)
    if (attendanceRate < 50) predictionScore += 40;
    else if (attendanceRate < 75) predictionScore += 20;

    // Factor B: Absence Streak (Recency Bias)
    predictionScore += (absentStreak * 20); // 1 week = 20, 3 weeks = 60 (High impact)

    // Factor C: Trend Direction (Accelerating Absence)
    if (recentAbsences === 3) predictionScore += 20;
    else if (recentAbsences >= 1 && absentStreak === 0) predictionScore += 5; // Choppy attendance

    // Cap at 100
    predictionScore = Math.min(100, predictionScore);

    let predictionLabel = 'Low';
    if (predictionScore >= 80) predictionLabel = 'High'; // Very likely to be absent again
    else if (predictionScore >= 40) predictionLabel = 'Medium';

    let nextAbsenceProbability = 0.2;
    if (!attendedLastWeek) nextAbsenceProbability += 0.4;
    if (earlyLeaveRate > 50) nextAbsenceProbability += 0.2;

    const riskReason = riskReasons.length > 0 ? riskReasons.join(', ') : 'Stable performance';

    return {
        id: studentId,
        name: studentName,
        department: studentRecords[0]?.department || 'N/A',
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

export const calculateCourseHealth = (students) => {
    if (students.length === 0) return null;

    const avgAttendance = students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length;
    const avgEarlyLeave = students.reduce((sum, s) => sum + s.earlyLeaveRate, 0) / students.length;
    const avgSimilarity = students.reduce((sum, s) => sum + s.avgSimilarity, 0) / students.length;
    const highRiskCount = students.filter(s => s.riskLevel === 'High').length;
    const riskConcentration = (highRiskCount / students.length) * 100;

    let healthScore = 100 - (100 - avgAttendance) - (riskConcentration * 0.5);
    healthScore = Math.max(0, Math.round(healthScore));

    return {
        avgAttendance: Math.round(avgAttendance),
        avgEarlyLeave: Math.round(avgEarlyLeave),
        avgSimilarity,
        riskConcentration: Math.round(riskConcentration),
        healthScore,
        totalStudents: students.length,
        highRiskCount
    };
};

// --- NEW ADVANCED STATISTICS ---

export const analyzeTrends = (records) => {
    // 1. Group by Week
    const groups = {};
    records.forEach(r => {
        const w = r.weekNumber || 1;
        if (!groups[w]) groups[w] = { week: `Week ${w}`, joins: 0, lefts: 0, totalSim: 0, countSim: 0, late: 0 };

        if (r.action === 'JOIN') groups[w].joins++;
        if (r.action === 'LEFT') groups[w].lefts++;
        if (r.action === 'LATE') { groups[w].late++; groups[w].joins++; } // Late implies join

        if (r.similarity > 0) {
            groups[w].totalSim += r.similarity;
            groups[w].countSim++;
        }
    });

    // 2. Format for Recharts
    return Object.values(groups).sort((a, b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1])).map(g => ({
        name: g.week,
        Attendance: g.joins,
        EarlyLeaves: g.lefts,
        Lateness: g.late,
        TrustScore: g.countSim > 0 ? (g.totalSim / g.countSim) * 100 : 0
    }));
};

export const analyzeDailyDistribution = (records) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = {};
    days.forEach(d => counts[d] = 0);

    records.forEach(r => {
        if (r.action === 'JOIN' || r.action === 'LATE') {
            const d = r.dayOfWeek || new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
            if (counts[d] !== undefined) counts[d]++;
            // Handle case mismatch or trimming if needed
        }
    });

    return Object.keys(counts).map(day => ({
        name: day.substring(0, 3), // Mon, Tue
        count: counts[day],
        fullDate: day
    })).filter(d => d.count > 0 || true); // Keep all days for scale consistency?
};

export const analyzeHourlyDistribution = (records) => {
    const hours = {};
    for (let i = 8; i <= 18; i++) hours[i] = 0; // 8 AM to 6 PM

    records.forEach(r => {
        if (r.action === 'JOIN' || r.action === 'LATE') {
            try {
                const timeParts = r.time.split(':');
                const h = parseInt(timeParts[0]);
                if (h >= 8 && h <= 18) hours[h]++;
            } catch (e) { /* ignore */ }
        }
    });

    return Object.keys(hours).map(h => ({
        time: `${h}:00`,
        count: hours[h]
    }));
};

export const analyzeDemographics = (records, allStudents) => {
    // If department available in records or student profiles
    // Assuming student records might contain department or we use StudentAnalytics

    // Use results from analyzeStudent (which extracts dept)
    const depts = {};
    allStudents.forEach(s => {
        const d = s.department || 'Unknown';
        if (!depts[d]) depts[d] = 0;
        depts[d]++;
    });

    return Object.keys(depts).map(d => ({
        name: d,
        value: depts[d]
    }));
};

export const analyzeActionBreakdown = (records) => {
    let join = 0, left = 0, late = 0, returned = 0;
    records.forEach(r => {
        if (r.action === 'JOIN') join++;
        else if (r.action === 'LEFT') left++;
        else if (r.action === 'LATE') late++;
        else if (r.action === 'RETURNED') returned++;
    });

    return [
        { name: 'On-Time Join', value: join },
        { name: 'Late Arrival', value: late },
        { name: 'Early Leave', value: left },
        { name: 'Returned', value: returned }
    ].filter(x => x.value > 0);
};

export const generateInsightsSummary = (trendData, health) => {
    // Generate textual insights based on data
    const insights = [];

    // Trend
    if (trendData.length >= 2) {
        const last = trendData[trendData.length - 1];
        const prev = trendData[trendData.length - 2];
        if (last.Attendance < prev.Attendance) insights.push("Attendance dropped this week compared to last week.");
        if (last.Attendance > prev.Attendance) insights.push("Attendance is improving!");
        if (last.EarlyLeaves > prev.EarlyLeaves) insights.push("Spike in early departures detected recently.");
    }

    // Health
    if (health) {
        if (health.avgSimilarity < 0.80) insights.push("Biometric confidence is lower than optimal. Check lighting conditions.");
        if (health.riskConcentration > 20) insights.push(`High Alert: ${health.riskConcentration}% of students are at risk.`);
    }

    return insights;
};
