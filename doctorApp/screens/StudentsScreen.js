// Students Screen
// Displays list of students

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { getAllStudents } from "../services/studentsService";

export default function StudentsScreen() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentCard}>
      {item.photoUrl && (
        <Image source={{ uri: item.photoUrl }} style={styles.photo} />
      )}
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentDetail}>ID: {item.studentNumber}</Text>
        <Text style={styles.studentDetail}>Email: {item.email}</Text>
      </View>
    </View>
  );

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
        <Text style={styles.title}>Students ({students.length})</Text>
      </View>
      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No students found</Text>
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
  studentCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  studentInfo: {
    flex: 1,
    justifyContent: "center",
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  studentDetail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 50,
    fontSize: 16,
  },
});
