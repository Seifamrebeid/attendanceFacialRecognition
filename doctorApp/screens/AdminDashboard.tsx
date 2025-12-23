// Admin Dashboard Screen
// Shows overview statistics and quick links for all courses

import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { getAllCourses } from '@/services/admin/coursesService';
import { loadStudentsFromCSV } from '@/services/studentService';
import { getAllWarnings } from '@/services/admin/warningsService';
import { getAllCoursesStatistics } from '@/services/admin/courseStatsService';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalWarnings: 0,
    averageAttendance: 0,
    totalSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [courses, students, warnings, allCourseStats] = await Promise.all([
        getAllCourses(),
        loadStudentsFromCSV(),
        getAllWarnings(),
        getAllCoursesStatistics(),
      ]);

      const avgAttendance =
        allCourseStats.length > 0
          ? (
              allCourseStats.reduce(
                (sum, c) => sum + (c.statistics?.attendanceRate || 0),
                0
              ) / allCourseStats.length
            ).toFixed(1)
          : 0;

      const totalSessions = allCourseStats.reduce(
        (sum, c) => sum + (c.statistics?.totalSessions || 0),
        0
      );

      setStats({
        totalCourses: courses.length,
        totalStudents: students.length,
        totalWarnings: warnings.length,
        averageAttendance: parseFloat(avgAttendance),
        totalSessions: totalSessions,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    onPress?: () => void;
  }

  const StatCard = ({ title, value, icon, color, onPress }: StatCardProps) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statCardContent}>
        <View style={styles.statCardText}>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={[styles.statCardValue, { color }]}>
            {loading ? '...' : value}
          </Text>
        </View>
        <View style={[styles.statCardIcon, { backgroundColor: color + '20' }]}>
          <IconSymbol name={icon} size={32} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Attendance Management System</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <IconSymbol name="arrow.right.square" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Courses"
                value={stats.totalCourses}
                icon="book.fill"
                color="#10b981"
              />
              <StatCard
                title="Total Students"
                value={stats.totalStudents}
                icon="person.2.fill"
                color="#059669"
              />
              <StatCard
                title="Warnings"
                value={stats.totalWarnings}
                icon="exclamationmark.triangle.fill"
                color="#f59e0b"
              />
              <StatCard
                title="Avg Attendance"
                value={`${stats.averageAttendance}%`}
                icon="chart.bar.fill"
                color="#14b8a6"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol name="person.crop.circle.badge.plus" size={24} color="#10b981" />
                  <Text style={styles.actionButtonText}>Add Student</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol name="book.closed.fill" size={24} color="#10b981" />
                  <Text style={styles.actionButtonText}>Add Course</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol name="bell.badge.fill" size={24} color="#10b981" />
                  <Text style={styles.actionButtonText}>Send Warning</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System Overview</Text>
              <View style={styles.overviewCard}>
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Total Sessions</Text>
                  <Text style={styles.overviewValue}>{stats.totalSessions}</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Active Courses</Text>
                  <Text style={styles.overviewValue}>{stats.totalCourses}</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Enrolled Students</Text>
                  <Text style={styles.overviewValue}>{stats.totalStudents}</Text>
                </View>
              </View>
            </View>
          </>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#059669',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardText: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  overviewValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  overviewDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
});
