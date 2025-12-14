import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { loadStudentsFromCSV, parseStudentInfo } from '@/services/studentService';
import { analyzeStudent, calculateCourseHealth, analyzeTrends, StudentAnalytics, CourseHealth, AttendanceRecord, WeeklyTrend } from '@/services/statisticsService';

export default function DoctorDashboard() {
  const [courseHealth, setCourseHealth] = useState<CourseHealth | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<StudentAnalytics[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [bestWeek, setBestWeek] = useState<WeeklyTrend | null>(null);
  const [worstWeek, setWorstWeek] = useState<WeeklyTrend | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      // 1. Load Students & Photos
      const studentsCSV = await loadStudentsFromCSV();
      const studentMap = new Map(studentsCSV.map(s => [s.studentNumber, s]));

      // 2. Load Attendance Records (Filtered by Course)
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('courseId', '==', 'EBA3201'),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);

      const records: AttendanceRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        // Enrich record
        records.push({
          id: doc.id,
          studentName: data.studentName,
          courseId: data.courseId,
          date: data.date,
          time: data.time,
          action: data.action,
          similarity: data.similarity,
          weekNumber: data.weekNumber || 1,
          dayOfWeek: data.dayOfWeek,
          timestamp: data.timestamp
        });
      });

      // 3. Process Analytics
      // Calculate Stats for ALL students
      const maxWeek = records.length > 0 ? Math.max(...records.map(r => r.weekNumber)) : 1;

      const allStudentStats: StudentAnalytics[] = studentsCSV.map(student => {
        return analyzeStudent(student.studentNumber, student.name, records, maxWeek);
      });

      // 4. Compute Course Health
      const health = calculateCourseHealth(allStudentStats);
      setCourseHealth(health);

      // 5. Identify High Risk Students
      const risky = allStudentStats
        .filter(s => s.riskLevel === 'High' || s.riskLevel === 'Medium')
        .sort((a, b) => a.aqi - b.aqi) // Lowest AQI first
        .slice(0, 5); // Start with top 5
      setAtRiskStudents(risky);

      // 6. Recent Activity (augmented with photos)
      const recent = records.slice(0, 10).map(r => {
        const { id } = parseStudentInfo(r.studentName);
        const studentInfo = studentMap.get(id);
        return { ...r, photoUrl: studentInfo?.photoUrl };
      });
      // @ts-ignore
      setRecentRecords(recent);

      // 7. Class Level Intelligence (Trends)
      const trends = analyzeTrends(records);
      const activeWeeks = trends.filter(t => t.Attendance > 0);
      const sortedWeeks = [...activeWeeks].sort((a, b) => b.Attendance - a.Attendance);

      setWeeklyTrends(trends);
      if (sortedWeeks.length > 0) {
        setBestWeek(sortedWeeks[0]);
        setWorstWeek(sortedWeeks[sortedWeeks.length - 1]);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return '#D32F2F';
      case 'Medium': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi >= 80) return '#4CAF50';
    if (aqi >= 60) return '#FF9800';
    return '#D32F2F';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={require('@/assets/images/icon.png')} style={styles.loadingLogo} />
        <Text style={styles.loadingText}>Analyzing Class Data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* AI Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerRole}>LECTURER PORTAL</Text>
            <Text style={styles.headerTitle}>AI Analytics Dashboard</Text>
            <Text style={{ color: '#aaa', fontSize: 10 }}>Course: EBA3201</Text>
          </View>
        </View>

        {/* Course Health Card */}
        {courseHealth && (
          <View style={styles.healthCard}>
            <View style={styles.healthRow}>
              <View style={styles.aqiContainer}>
                <Text style={[styles.aqiValue, { color: getAQIColor(courseHealth.healthScore) }]}>
                  {courseHealth.healthScore}
                </Text>
                <Text style={styles.aqiLabel}>Course Health</Text>
              </View>
              <View style={styles.healthStats}>
                <View style={styles.healthStat}>
                  <Text style={styles.statVal}>{courseHealth.avgAttendance}%</Text>
                  <Text style={styles.statLab}>Avg Attendance</Text>
                </View>
                <View style={styles.healthStat}>
                  <Text style={styles.statVal}>{courseHealth.riskConcentration}%</Text>
                  <Text style={styles.statLab}>High Risk</Text>
                </View>
                <View style={styles.healthStat}>
                  <Text style={styles.statVal}>{(courseHealth.avgSimilarity * 100).toFixed(1)}%</Text>
                  <Text style={styles.statLab}>Trust Score</Text>
                </View>
              </View>
            </View>
            <View style={styles.aiInsight}>
              <Text style={styles.aiIcon}>✨</Text>
              <Text style={styles.aiText}>
                AI Insight: Course health is {courseHealth.healthScore > 80 ? 'Excellent' : courseHealth.healthScore > 60 ? 'Stable' : 'Critical'}.
                {courseHealth.riskConcentration > 10 ? ' High dropout risk detected.' : ' Engagement is solid.'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Class Level Intelligence (New) */}
      {bestWeek && (
        <View style={styles.section}>
          <View style={styles.intelligenceCard}>
            <Text style={styles.intelligenceTitle}>🟣 Class-Level Intelligence</Text>
            <View style={styles.intelligenceRow}>
              <View style={styles.intelItem}>
                <Text style={styles.intelLabel}>HIGHEST PRESENCE</Text>
                <Text style={[styles.intelValue, { color: '#4CAF50' }]}>{bestWeek.name}</Text>
                <Text style={styles.intelSub}>{bestWeek.Attendance} Students</Text>
              </View>
              <View style={styles.intelDivider} />
              <View style={styles.intelItem}>
                <Text style={styles.intelLabel}>LOWEST PRESENCE</Text>
                <Text style={[styles.intelValue, { color: '#F44336' }]}>{worstWeek?.name}</Text>
                <Text style={styles.intelSub}>{worstWeek?.Attendance} Students</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Real-time Monitor */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Real-time Attendance</Text>
          <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.liveStream}>
          {recentRecords.map((r: any) => (
            <View key={r.id} style={styles.liveCard}>
              {r.photoUrl ? (
                <Image source={{ uri: r.photoUrl }} style={styles.liveAvatar} />
              ) : (
                <View style={styles.liveAvatarPlaceholder}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{r.studentName.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.liveTime}>{r.time ? r.time.substring(0, 5) : '--:--'}</Text>
              <Text style={[styles.liveAction, { color: r.action === 'LEFT' ? '#D32F2F' : '#388E3C' }]}>
                {r.action}
              </Text>
              {r.action === 'LEFT' && (
                <View style={styles.alertDot} /> // Early leave alert
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* At-Risk Students */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ At-Risk Students (AI Priority)</Text>
        <Text style={styles.sectionSubtitle}>Students requiring immediate attention</Text>

        {atRiskStudents.length > 0 ? (
          atRiskStudents.map((student) => (
            <View key={student.id} style={styles.riskCard}>
              <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(student.riskLevel) }]} />
              <View style={styles.riskContent}>
                <View style={styles.riskHeader}>
                  <Text style={styles.riskName}>{student.name}</Text>
                  <Text style={[styles.riskBadge, { color: getRiskColor(student.riskLevel) }]}>
                    {student.riskLevel.toUpperCase()} RISK
                  </Text>
                </View>
                <Text style={styles.riskId}>{student.id}</Text>

                <View style={styles.riskMetrics}>
                  <Text style={styles.metricText}>Attendance: {student.attendanceRate}%</Text>
                  <Text style={styles.metricText}>Early Leave: {student.earlyLeaveRate}%</Text>
                </View>

                {/* Absent Streak Warning */}
                {student.absentStreak >= 3 && (
                  <Text style={styles.streakWarning}>🔥 {student.absentStreak} Weeks Absent Streak!</Text>
                )}

                <View style={styles.aiReasonBox}>
                  <Text style={styles.aiReasonTitle}>🤖 AI Analysis:</Text>
                  <Text style={styles.aiReasonText}>{student.riskReason}</Text>

                  {/* Prediction Score */}
                  <View style={styles.predictionBox}>
                    <Text style={styles.predictionLabel}>🟡 Prediction Score:</Text>
                    <Text style={[styles.predictionValue, { color: student.predictionScore > 50 ? '#D32F2F' : '#FF9800' }]}>
                      {student.predictionScore}/100 ({student.predictionLabel})
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No high-risk students detected. Great job! 🎉</Text>
          </View>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingLogo: { width: 80, height: 80, marginBottom: 20 },
  loadingText: { color: '#666', fontSize: 16 },
  header: {
    backgroundColor: '#1A237E', // Academic Navy
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 50,
    height: 50,
    tintColor: '#fff',
    marginRight: 15,
  },
  headerRole: {
    color: '#8C9EFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  aqiContainer: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  aqiValue: {
    fontSize: 36,
    fontWeight: '900',
  },
  aqiLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  healthStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingLeft: 10,
  },
  healthStat: { alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statLab: { fontSize: 10, color: '#888', marginTop: 2 },
  aiInsight: {
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiIcon: { fontSize: 16, marginRight: 8, marginTop: 2 },
  aiText: { fontSize: 12, color: '#304FFE', flex: 1, lineHeight: 18 },

  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  liveBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  liveText: { color: '#D32F2F', fontSize: 10, fontWeight: 'bold' },
  liveStream: {
    paddingVertical: 10,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  liveCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    width: 80,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  liveAvatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
  liveAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A237E', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  liveTime: { fontSize: 10, color: '#888', marginBottom: 2 },
  liveAction: { fontSize: 11, fontWeight: 'bold' },
  alertDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D32F2F',
    borderWidth: 1,
    borderColor: '#fff',
  },

  riskCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  riskIndicator: {
    width: 6,
    height: '100%',
  },
  riskContent: {
    flex: 1,
    padding: 15,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  riskName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  riskBadge: { fontSize: 12, fontWeight: 'bold' },
  riskId: { fontSize: 12, color: '#999', marginBottom: 10 },
  riskMetrics: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  metricText: { fontSize: 12, color: '#555', backgroundColor: '#F5F5F5', padding: 4, borderRadius: 4 },
  streakWarning: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 8,
  },
  aiReasonBox: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  aiReasonTitle: { fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  aiReasonText: { fontSize: 11, color: '#555', fontStyle: 'italic', lineHeight: 16 },
  predictionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#fffbeb',
    padding: 4,
    borderRadius: 4,
  },
  predictionLabel: { fontSize: 11, color: '#888', marginRight: 5 },
  predictionValue: { fontSize: 11, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', padding: 20 },
  emptyText: { color: '#888' },

  intelligenceCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#7c3aed',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  intelligenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 15,
  },
  intelligenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intelItem: {
    flex: 1,
    alignItems: 'center',
  },
  intelDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 10,
  },
  intelLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 5,
    fontWeight: '600',
  },
  intelValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  intelSub: {
    fontSize: 12,
    color: '#666',
  },
});
