import { StyleSheet, View, Text, ScrollView, Image, TextInput, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { loadStudentsFromCSV, Student } from '@/services/studentService';

interface StudentWithStatus extends Student {
  status: 'present' | 'absent' | 'late' | 'unknown';
  lastSeen?: string;
}

export default function StudentsScreen() {
  const [students, setStudents] = useState<StudentWithStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentNumber.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'late': return '#FF9800';
      default: return '#9E9E9E';
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
        <Image source={require('@/assets/images/icon.png')} style={styles.loadingLogo} />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>Students</Text>
        <Text style={styles.headerSubtitle}>{students.length} enrolled</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#999"
        />
      </View>

      {/* Students List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <View key={student.id} style={styles.studentCard}>
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
                <Text style={styles.studentId}>ID: {student.studentNumber}</Text>
                {student.lastSeen && (
                  <Text style={styles.lastSeen}>Last seen: {formatTime(student.lastSeen)}</Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.status) }]}>
                <Text style={styles.statusText}>{student.status.toUpperCase()}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              {searchTerm ? 'No students found' : 'No students enrolled'}
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
    backgroundColor: '#1a1a2e',
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
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  list: {
    flex: 1,
    paddingHorizontal: 15,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentId: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  lastSeen: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#999',
    fontSize: 16,
  },
});
