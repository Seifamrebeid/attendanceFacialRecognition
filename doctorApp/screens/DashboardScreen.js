// Dashboard Screen
// Shows overview statistics and quick links

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getAllCourses } from "../services/coursesService";
import { getAllStudents } from "../services/studentsService";
import { getAllWarnings } from "../services/warningsService";

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalWarnings: 0,
    highRiskStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [courses, students, warnings] = await Promise.all([
        getAllCourses(),
        getAllStudents(),
        getAllWarnings(),
      ]);

      const uniqueStudentsWithWarnings = new Set(
        warnings.map((w) => w.studentId)
      ).size;

      setStats({
        totalCourses: courses.length,
        totalStudents: students.length,
        totalWarnings: warnings.length,
        highRiskStudents: uniqueStudentsWithWarnings,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = async () => {
    await logout();
  };

  const StatCard = ({ title, value, color, onPress }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color }]}>
        {loading ? "..." : value}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard Overview</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          color="#2563eb"
          onPress={() => navigation.navigate("Courses")}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          color="#10b981"
          onPress={() => navigation.navigate("Students")}
        />
        <StatCard
          title="Total Warnings"
          value={stats.totalWarnings}
          color="#f59e0b"
          onPress={() => navigation.navigate("Warnings")}
        />
        <StatCard
          title="High Risk Students"
          value={stats.highRiskStudents}
          color="#ef4444"
          onPress={() => navigation.navigate("Warnings")}
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Attendance")}
        >
          <Text style={styles.actionButtonText}>Record Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Analytics")}
        >
          <Text style={styles.actionButtonText}>View Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Predictions")}
        >
          <Text style={styles.actionButtonText}>Absence Predictions</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  statsGrid: {
    padding: 15,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  quickActions: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
