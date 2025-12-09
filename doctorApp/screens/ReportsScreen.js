// Reports Screen
// Generates and displays reports

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";

export default function ReportsScreen() {
  const [loading, setLoading] = useState(false);

  const generateReport = (type) => {
    Alert.alert("Generate Report", `Generate ${type} report?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Generate",
        onPress: () => {
          Alert.alert("Info", "Report generation feature coming soon");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Generate Reports</Text>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => generateReport("Attendance")}
        >
          <Text style={styles.reportButtonTitle}>Attendance Report</Text>
          <Text style={styles.reportButtonDescription}>
            Generate detailed attendance report for all courses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => generateReport("Warnings")}
        >
          <Text style={styles.reportButtonTitle}>Warnings Report</Text>
          <Text style={styles.reportButtonDescription}>
            Summary of all student warnings issued
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => generateReport("Analytics")}
        >
          <Text style={styles.reportButtonTitle}>Analytics Report</Text>
          <Text style={styles.reportButtonDescription}>
            Late arrival patterns and trends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => generateReport("Predictions")}
        >
          <Text style={styles.reportButtonTitle}>Predictions Report</Text>
          <Text style={styles.reportButtonDescription}>
            High-risk students and absence predictions
          </Text>
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
  header: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  content: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 15,
  },
  reportButton: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reportButtonTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 8,
  },
  reportButtonDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
});
