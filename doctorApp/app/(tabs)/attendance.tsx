import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, where, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { loadStudentsFromCSV, parseStudentInfo, Student as ServiceStudent } from '@/services/studentService';

interface Student extends ServiceStudent {
    status: 'present' | 'absent' | 'late' | null;
    recordId?: string;
    arrivalTime?: string;
}

export default function AttendanceScreen() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Stats (calculated from current students list)
    const stats = {
        total: students.length,
        present: students.filter(s => s.status === 'present').length,
        absent: students.filter(s => s.status === 'absent').length,
        unmarked: students.filter(s => s.status === null).length,
    };

    // Auto-detect max week on mount
    useEffect(() => {
        const fetchLatestWeek = async () => {
            try {
                // Fetch all records to find the latest week with data
                // This is a naive approach but reliable without indexes
                const snapshot = await getDocs(collection(db, 'attendance'));
                if (!snapshot.empty) {
                    let maxWeek = 1;
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        // Handle number or string weekNumber
                        const w = Number(data.weekNumber);
                        if (!isNaN(w) && w > maxWeek) maxWeek = w;
                    });
                    console.log(`Auto-detected latest week: ${maxWeek}`);
                    if (maxWeek > 1) {
                        setSelectedWeek(maxWeek);
                    }
                }
            } catch (e) {
                console.error("Failed to auto-detect week", e);
            }
        };
        fetchLatestWeek();
    }, []);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupRealtimeListener = async () => {
            try {
                setLoading(true);
                // 1. Load base student list from CSV
                const csvStudents = await loadStudentsFromCSV();

                const attendanceRef = collection(db, 'attendance');

                // 2. Real-time listener for the selected week
                // Note: Removed courseId filter to ensure visibility of all records matching student IDs
                const weekQuery = query(
                    attendanceRef,
                    where('weekNumber', '==', selectedWeek)
                );

                unsubscribe = onSnapshot(weekQuery, (snapshot) => {
                    const attendanceMap = new Map<string, { status: any, recordId: string, time: string }>();

                    snapshot.forEach((docSnap) => {
                        const data = docSnap.data();

                        // Use robust helper to parse "Name_ID" -> ID
                        const info = parseStudentInfo(data.studentName || '');
                        const id = info.id ? info.id.trim() : '';

                        if (id) {
                            attendanceMap.set(id, {
                                status: data.action,
                                recordId: docSnap.id,
                                time: data.time
                            });
                        }
                    });

                    // 3. Merge data
                    const mergedStudents: Student[] = csvStudents.map(student => {
                        const attendance = attendanceMap.get(student.studentNumber);

                        let status: 'present' | 'absent' | 'late' | null = null;
                        let recordId: string | undefined = undefined;
                        let arrivalTime: string | undefined = undefined;

                        if (attendance) {
                            status = attendance.status === 'JOIN' ? 'present' :
                                attendance.status === 'LEFT' ? 'absent' :
                                    attendance.status === 'LATE' ? 'late' : null;
                            recordId = attendance.recordId;
                            arrivalTime = attendance.time;
                        }

                        return {
                            ...student,
                            status,
                            recordId,
                            arrivalTime
                        };
                    });

                    setStudents(mergedStudents.sort((a, b) => a.name.localeCompare(b.name)));
                    setLoading(false);
                }, (error) => {
                    console.error("Real-time listener error:", error);
                    Alert.alert('Error', 'Connection to realtime updates failed');
                    setLoading(false);
                });

            } catch (error) {
                console.error('Error setting up attendance listener:', error);
                setLoading(false);
            }
        };

        setupRealtimeListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [selectedWeek]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const handleStatusChange = async (studentId: string, newStatus: 'present' | 'absent' | null) => {
        setSaving(studentId);

        try {
            const student = students.find(s => s.id === studentId);
            if (!student) return;

            // Optimistic update
            setStudents(prev => prev.map(s =>
                s.id === studentId ? { ...s, status: newStatus } : s
            ));

            const now = new Date();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            if (newStatus === null) {
                // Delete record
                if (student.recordId) {
                    await deleteDoc(doc(db, 'attendance', student.recordId));
                }
            } else if (student.recordId) {
                // Update existing
                await updateDoc(doc(db, 'attendance', student.recordId), {
                    action: newStatus === 'present' ? 'JOIN' : 'LEFT',
                    updatedAt: now.toISOString(),
                    manuallyEdited: true
                });
            } else {
                // Create new
                // IMPORTANT: Construct name exactly as Python script/Web app expects: "Name_ID"
                const newDoc = await addDoc(collection(db, 'attendance'), {
                    studentName: `${student.name.replace(/\s+/g, '_')}_${student.studentNumber}`,
                    courseId: 'EBA3201',
                    weekNumber: selectedWeek,
                    action: newStatus === 'present' ? 'JOIN' : 'LEFT',
                    date: now.toISOString().split('T')[0],
                    time: now.toTimeString().split(' ')[0],
                    timestamp: now.toISOString(),
                    createdAt: now.toISOString(),
                    dayOfWeek: dayNames[now.getDay()],
                    similarity: 1.0,
                    manualEntry: true
                });
            }
        } catch (error) {
            console.error('Error updating attendance:', error);
            Alert.alert('Error', 'Failed to update attendance');
        } finally {
            setSaving(null);
        }
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'present': return '#4CAF50';
            case 'absent': return '#F44336';
            case 'late': return '#FF9800';
            default: return '#E0E0E0';
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Image source={require('@/assets/images/icon.png')} style={styles.loadingLogo} />
                <Text style={styles.loadingText}>Loading attendance...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
                <Text style={styles.headerTitle}>Attendance</Text>
                <Text style={styles.headerSubtitle}>Week {selectedWeek}</Text>
            </View>

            {/* Week Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekSelector}>
                {Array.from({ length: 16 }, (_, i) => i + 1).map(week => (
                    <TouchableOpacity
                        key={week}
                        style={[styles.weekButton, selectedWeek === week && styles.weekButtonActive]}
                        onPress={() => setSelectedWeek(week)}
                    >
                        <Text style={[styles.weekButtonText, selectedWeek === week && styles.weekButtonTextActive]}>
                            W{week}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statMini, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.statMiniNumber, { color: '#1976D2' }]}>{stats.total}</Text>
                    <Text style={styles.statMiniLabel}>Total</Text>
                </View>
                <View style={[styles.statMini, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.statMiniNumber, { color: '#388E3C' }]}>{stats.present}</Text>
                    <Text style={styles.statMiniLabel}>Present</Text>
                </View>
                <View style={[styles.statMini, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={[styles.statMiniNumber, { color: '#D32F2F' }]}>{stats.absent}</Text>
                    <Text style={styles.statMiniLabel}>Absent</Text>
                </View>
                <View style={[styles.statMini, { backgroundColor: '#FAFAFA' }]}>
                    <Text style={[styles.statMiniNumber, { color: '#666' }]}>{stats.unmarked}</Text>
                    <Text style={styles.statMiniLabel}>Unmarked</Text>
                </View>
            </View>

            {/* Student List */}
            <ScrollView
                style={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {students.map((student) => (
                    <View key={student.id} style={styles.studentCard}>
                        <View style={styles.studentLeft}>
                            <View style={styles.avatarContainer}>
                                {student.photoUrl ? (
                                    <Image source={{ uri: student.photoUrl }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.studentInfo}>
                                <Text style={styles.studentName}>{student.name}</Text>
                                <Text style={styles.studentId}>{student.studentNumber}</Text>
                                {student.arrivalTime && (
                                    <Text style={styles.timeText}>Time: {student.arrivalTime}</Text>
                                )}
                            </View>
                        </View>
                        <View style={styles.statusButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.statusBtn,
                                    student.status === 'present' && styles.statusBtnPresent,
                                    saving === student.id && styles.statusBtnDisabled
                                ]}
                                onPress={() => handleStatusChange(student.id, student.status === 'present' ? null : 'present')}
                                disabled={saving === student.id}
                            >
                                <Text style={[styles.statusBtnText, student.status === 'present' && styles.statusBtnTextActive]}>✓</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.statusBtn,
                                    student.status === 'absent' && styles.statusBtnAbsent,
                                    saving === student.id && styles.statusBtnDisabled
                                ]}
                                onPress={() => handleStatusChange(student.id, student.status === 'absent' ? null : 'absent')}
                                disabled={saving === student.id}
                            >
                                <Text style={[styles.statusBtnText, student.status === 'absent' && styles.statusBtnTextActive]}>✗</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
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
    weekSelector: {
        maxHeight: 50,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    weekButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    weekButtonActive: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    weekButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    weekButtonTextActive: {
        color: '#fff',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 8,
    },
    statMini: {
        flex: 1,
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    statMiniNumber: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statMiniLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    list: {
        flex: 1,
        paddingHorizontal: 10,
    },
    studentCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    studentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    studentId: {
        fontSize: 12,
        color: '#888',
    },
    timeText: {
        fontSize: 10,
        color: '#10b981',
        marginTop: 2,
    },
    statusButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    statusBtnPresent: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    statusBtnAbsent: {
        backgroundColor: '#F44336',
        borderColor: '#F44336',
    },
    statusBtnDisabled: {
        opacity: 0.5,
    },
    statusBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#999',
    },
    statusBtnTextActive: {
        color: '#fff',
    },
});
