import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { loadStudentsFromCSV } from '@/services/studentService';

interface WeeklyReport {
    week: number;
    totalRecords: number;
    uniqueStudents: number;
    joinCount: number;
    leftCount: number;
    attendanceRate: number;
}

interface StudentReport {
    name: string;
    studentNumber: string;
    totalWeeks: number;
    presentWeeks: number;
    absentWeeks: number;
    attendanceRate: number;
    photoUrl?: string | null;
}

export default function ReportsScreen() {
    const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
    const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
    const [activeTab, setActiveTab] = useState<'weekly' | 'students'>('weekly');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadReports = async () => {
        try {
            // Load photos map
            const csvStudents = await loadStudentsFromCSV();
            const studentInfoMap = new Map(csvStudents.map(s => [s.studentNumber, s]));

            const attendanceRef = collection(db, 'attendance');
            const q = query(attendanceRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);

            // Process weekly reports
            const weekMap = new Map<number, { records: number; students: Set<string>; joins: number; lefts: number }>();
            const studentMap = new Map<string, { name: string; weeks: Set<number>; presentWeeks: Set<number> }>();

            snapshot.forEach((doc) => {
                const data = doc.data();
                const weekNum = data.weekNumber || 1;
                const fullName = data.studentName || '';
                const action = data.action;

                // Parse student info
                const lastUnderscoreIndex = fullName.lastIndexOf('_');
                if (lastUnderscoreIndex === -1) return;

                const name = fullName.substring(0, lastUnderscoreIndex).replace(/_/g, ' ');
                const studentNumber = fullName.substring(lastUnderscoreIndex + 1);

                // Weekly stats
                if (!weekMap.has(weekNum)) {
                    weekMap.set(weekNum, { records: 0, students: new Set(), joins: 0, lefts: 0 });
                }
                const weekData = weekMap.get(weekNum)!;
                weekData.records++;
                weekData.students.add(studentNumber);
                if (action === 'JOIN') weekData.joins++;
                if (action === 'LEFT') weekData.lefts++;

                // Student stats
                if (!studentMap.has(studentNumber)) {
                    studentMap.set(studentNumber, { name, weeks: new Set(), presentWeeks: new Set() });
                }
                const studentData = studentMap.get(studentNumber)!;
                studentData.weeks.add(weekNum);
                if (action === 'JOIN') studentData.presentWeeks.add(weekNum);
            });

            // Convert to arrays
            const weeklyData: WeeklyReport[] = Array.from(weekMap.entries())
                .map(([week, data]) => ({
                    week,
                    totalRecords: data.records,
                    uniqueStudents: data.students.size,
                    joinCount: data.joins,
                    leftCount: data.lefts,
                    attendanceRate: data.records > 0 ? Math.round((data.joins / data.records) * 100) : 0
                }))
                .sort((a, b) => a.week - b.week);

            const maxWeeks = Math.max(...weeklyData.map(w => w.week), 1);

            const studentData: StudentReport[] = Array.from(studentMap.entries())
                .map(([studentNumber, data]) => ({
                    name: data.name,
                    studentNumber,
                    totalWeeks: maxWeeks,
                    presentWeeks: data.presentWeeks.size,
                    absentWeeks: maxWeeks - data.presentWeeks.size,
                    attendanceRate: Math.round((data.presentWeeks.size / maxWeeks) * 100),
                    photoUrl: studentInfoMap.get(studentNumber)?.photoUrl
                }))
                .sort((a, b) => b.attendanceRate - a.attendanceRate);

            setWeeklyReports(weeklyData);
            setStudentReports(studentData);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadReports();
        setRefreshing(false);
    }, []);

    const getAttendanceColor = (rate: number) => {
        if (rate >= 80) return '#4CAF50';
        if (rate >= 60) return '#FF9800';
        return '#F44336';
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Image source={require('@/assets/images/icon.png')} style={styles.loadingLogo} />
                <Text style={styles.loadingText}>Generating reports...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
                <Text style={styles.headerTitle}>Reports</Text>
                <Text style={styles.headerSubtitle}>Attendance Analytics</Text>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
                    onPress={() => setActiveTab('weekly')}
                >
                    <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'students' && styles.tabActive]}
                    onPress={() => setActiveTab('students')}
                >
                    <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>Students</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {activeTab === 'weekly' ? (
                    <>
                        <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
                        {weeklyReports.length > 0 ? (
                            weeklyReports.map((report) => (
                                <View key={report.week} style={styles.reportCard}>
                                    <View style={styles.reportHeader}>
                                        <Text style={styles.weekLabel}>Week {report.week}</Text>
                                        <View style={[styles.rateBadge, { backgroundColor: getAttendanceColor(report.attendanceRate) }]}>
                                            <Text style={styles.rateText}>{report.attendanceRate}%</Text>
                                        </View>
                                    </View>
                                    <View style={styles.reportStats}>
                                        <View style={styles.reportStat}>
                                            <Text style={styles.reportStatNumber}>{report.uniqueStudents}</Text>
                                            <Text style={styles.reportStatLabel}>Students</Text>
                                        </View>
                                        <View style={styles.reportStat}>
                                            <Text style={[styles.reportStatNumber, { color: '#4CAF50' }]}>{report.joinCount}</Text>
                                            <Text style={styles.reportStatLabel}>Present</Text>
                                        </View>
                                        <View style={styles.reportStat}>
                                            <Text style={[styles.reportStatNumber, { color: '#F44336' }]}>{report.leftCount}</Text>
                                            <Text style={styles.reportStatLabel}>Left</Text>
                                        </View>
                                        <View style={styles.reportStat}>
                                            <Text style={styles.reportStatNumber}>{report.totalRecords}</Text>
                                            <Text style={styles.reportStatLabel}>Records</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>No weekly data available</Text>
                        )}
                    </>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Student Performance</Text>
                        {studentReports.length > 0 ? (
                            studentReports.map((student, index) => (
                                <View key={student.studentNumber} style={styles.studentReportCard}>
                                    <View style={styles.rankBadge}>
                                        <Text style={styles.rankText}>#{index + 1}</Text>
                                    </View>
                                    <View style={styles.reportAvatar}>
                                        {student.photoUrl ? (
                                            <Image source={{ uri: student.photoUrl }} style={styles.avatarImageSmall} />
                                        ) : (
                                            <View style={styles.avatarPlaceholderSmall}>
                                                <Text style={styles.avatarTextSmall}>{student.name.charAt(0).toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.studentReportInfo}>
                                        <Text style={styles.studentReportName}>{student.name}</Text>
                                        <Text style={styles.studentReportId}>{student.studentNumber}</Text>
                                        <View style={styles.attendanceBar}>
                                            <View
                                                style={[
                                                    styles.attendanceBarFill,
                                                    {
                                                        width: `${student.attendanceRate}%`,
                                                        backgroundColor: getAttendanceColor(student.attendanceRate)
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.attendanceDetail}>
                                            {student.presentWeeks}/{student.totalWeeks} weeks attended
                                        </Text>
                                    </View>
                                    <View style={[styles.rateCircle, { borderColor: getAttendanceColor(student.attendanceRate) }]}>
                                        <Text style={[styles.rateCircleText, { color: getAttendanceColor(student.attendanceRate) }]}>
                                            {student.attendanceRate}%
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>No student data available</Text>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    loadingLogo: {
        width: 80,
        height: 80,
        marginBottom: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    header: {
        backgroundColor: '#10b981',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    logo: {
        width: 50,
        height: 50,
        marginBottom: 10,
        tintColor: '#fff',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 5,
    },
    tabContainer: {
        flexDirection: 'row',
        margin: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#10b981',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
    },
    tabTextActive: {
        color: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        marginTop: 5,
    },
    reportCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    weekLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    rateBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    rateText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    reportStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    reportStat: {
        alignItems: 'center',
    },
    reportStatNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    reportStatLabel: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    studentReportCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e6e6e6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    rankText: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
    },
    reportAvatar: {
        marginRight: 12,
    },
    avatarImageSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e0e0e0',
    },
    avatarPlaceholderSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarTextSmall: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    studentReportInfo: {
        flex: 1,
    },
    studentReportName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    studentReportId: {
        fontSize: 11,
        color: '#888',
        marginBottom: 4,
    },
    attendanceBar: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    attendanceBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    attendanceDetail: {
        fontSize: 10,
        color: '#888',
        marginTop: 2,
    },
    rateCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    rateCircleText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    noDataText: {
        textAlign: 'center',
        color: '#999',
        padding: 40,
        fontSize: 16,
    },
});
