// Warnings Screen
// Displays and creates warnings for students

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getAllWarnings } from "../services/warningsService";
import { format } from "date-fns";

export default function WarningsScreen() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWarnings();
  }, []);

  const loadWarnings = async () => {
    try {
      const data = await getAllWarnings();
      setWarnings(data);
    } catch (error) {
      console.error("Error loading warnings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWarnings();
  };

  const renderWarning = ({ item }) => {
    let warningDate = new Date();
    try {
      if (item.createdAt) {
        // Handle Firestore Timestamp
        if (item.createdAt.toDate) {
          warningDate = item.createdAt.toDate();
        } else if (item.createdAt.seconds) {
          warningDate = new Date(item.createdAt.seconds * 1000);
        } else {
          warningDate = new Date(item.createdAt);
        }
      }
    } catch (error) {
      console.error("Error parsing date:", error);
      warningDate = new Date();
    }

    return (
      <View style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <Text style={styles.warningType}>{item.warningType}</Text>
          <Text style={styles.warningDate}>
            {format(warningDate, "MMM dd, yyyy")}
          </Text>
        </View>
        <Text style={styles.studentName}>{item.studentName}</Text>
        <Text style={styles.courseName}>{item.courseName}</Text>
        <Text style={styles.warningMessage}>{item.message}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Warnings ({warnings.length})</Text>
      </View>
      <FlatList
        data={warnings}
        renderItem={renderWarning}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No warnings found</Text>
        }
      />
    </View>
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
  list: {
    padding: 15,
  },
  warningCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  warningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  warningType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f59e0b",
  },
  warningDate: {
    fontSize: 14,
    color: "#6b7280",
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  courseName: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  warningMessage: {
    fontSize: 14,
    color: "#1f2937",
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: "#1f2937",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 50,
    fontSize: 16,
  },
});
