import { StyleSheet, View, Text, ScrollView, Image, TextInput, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { loadStudentsFromCSV, Student } from '@/services/studentService';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface StudentWithStatus extends Student {
  status: 'present' | 'absent' | 'late' | 'unknown';
  lastSeen?: string;
}

export default function StudentsScreen() {
  const [students, setStudents] = useState<StudentWithStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  const loadData = async () => {
    try {
      const csvStudents = await loadStudentsFromCSV();

      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);

      const attendanceMap = new Map<string, { status: string, timestamp: string }>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const fullName = data.studentName || '';
        const lastUnderscoreIndex = fullName.lastIndexOf('_');
        if (lastUnderscoreIndex !== -1) {
          const studentNumber = fullName.substring(lastUnderscoreIndex + 1);
          if (!attendanceMap.has(studentNumber)) {
            attendanceMap.set(studentNumber, {
              status: data.action,
              timestamp: data.timestamp
            });
          }
        }
      });

      const mergedStudents: StudentWithStatus[] = csvStudents.map(student => {
        const attendance = attendanceMap.get(student.studentNumber);
        let status: 'present' | 'absent' | 'late' | 'unknown' = 'unknown';
        let lastSeen: string | undefined = undefined;

        if (attendance) {
          lastSeen = attendance.timestamp;
          const recordDate = new Date(attendance.timestamp).toDateString();
          const today = new Date().toDateString();
          if (recordDate === today) {
            status = attendance.status === 'JOIN' ? 'present' :
              attendance.status === 'LEFT' ? 'absent' :
                attendance.status === 'LATE' ? 'late' : 'unknown';
          }
        }

        return { ...student, status, lastSeen };
      });

      setStudents(mergedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentNumber.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || student.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: students.length,
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'absent': return '#ef4444';
      case 'late': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return 'checkmark.circle.fill';
      case 'absent': return 'xmark.circle.fill';
      case 'late': return 'clock.fill';
      default: return 'questionmark.circle.fill';
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner}>
          <IconSymbol name="person.2.fill" size={48} color="#10b981" />
        </View>
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Students Directory</Text>
            <Text style={styles.headerSubtitle}>{students.length} total students</Text>
          </View>
          <View style={styles.headerIcon}>
            <IconSymbol name="person.2.crop.square.stack.fill" size={32} color="#fff" />
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statCard, filterStatus === 'all' && styles.statCardActive]}
          onPress={() => setFilterStatus('all')}
        >
          <IconSymbol name="person.3.fill" size={24} color={filterStatus === 'all' ? '#10b981' : '#6b7280'} />
          <Text style={[styles.statValue, filterStatus === 'all' && styles.statValueActive]}>{statusCounts.all}</Text>
          <Text style={[styles.statLabel, filterStatus === 'all' && styles.statLabelActive]}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, filterStatus === 'present' && styles.statCardActive]}
          onPress={() => setFilterStatus('present')}
        >
          <IconSymbol name="checkmark.circle.fill" size={24} color={filterStatus === 'present' ? '#10b981' : '#6b7280'} />
          <Text style={[styles.statValue, filterStatus === 'present' && styles.statValueActive]}>{statusCounts.present}</Text>
          <Text style={[styles.statLabel, filterStatus === 'present' && styles.statLabelActive]}>Present</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, filterStatus === 'absent' && styles.statCardActive]}
          onPress={() => setFilterStatus('absent')}
        >
          <IconSymbol name="xmark.circle.fill" size={24} color={filterStatus === 'absent' ? '#10b981' : '#6b7280'} />
          <Text style={[styles.statValue, filterStatus === 'absent' && styles.statValueActive]}>{statusCounts.absent}</Text>
          <Text style={[styles.statLabel, filterStatus === 'absent' && styles.statLabelActive]}>Absent</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, filterStatus === 'late' && styles.statCardActive]}
          onPress={() => setFilterStatus('late')}
        >
          <IconSymbol name="clock.fill" size={24} color={filterStatus === 'late' ? '#10b981' : '#6b7280'} />
          <Text style={[styles.statValue, filterStatus === 'late' && styles.statValueActive]}>{statusCounts.late}</Text>
          <Text style={[styles.statLabel, filterStatus === 'late' && styles.statLabelActive]}>Late</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={20} color="#10b981" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
          {searchTerm !== '' && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Students List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />}
      >
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student, index) => (
            <View key={student.id} style={[styles.studentCard, { marginTop: index === 0 ? 0 : 12 }]}>
              <View style={styles.studentCardLeft}>
                <View style={styles.avatarContainer}>
                  {student.photoUrl ? (
                    <Image source={{ uri: student.photoUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: getStatusColor(student.status) }]}>
                      <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(student.status) }]} />
                </View>

                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <View style={styles.studentMetaRow}>
                    <IconSymbol name="number" size={14} color="#6b7280" />
                    <Text style={styles.studentId}>{student.studentNumber}</Text>
                  </View>
                  {student.lastSeen && (
                    <View style={styles.studentMetaRow}>
                      <IconSymbol name="clock" size={14} color="#6b7280" />
                      <Text style={styles.lastSeen}>{formatTime(student.lastSeen)}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.status) + '20' }]}>
                <IconSymbol name={getStatusIcon(student.status)} size={16} color={getStatusColor(student.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(student.status) }]}>
                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <IconSymbol name="person.crop.circle.badge.questionmark" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptyText}>
              {searchTerm ? 'Try adjusting your search' : 'No students enrolled yet'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#10b981',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexGrow: 0,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statValueActive: {
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '600',
  },
  statLabelActive: {
    color: '#059669',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  studentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  studentId: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  lastSeen: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
