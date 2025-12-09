// Attendance Screen
// Records and views attendance

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getAllCourses } from "../services/coursesService";
import { getStudentsByCourse } from "../services/studentsService";
import { recordAttendance } from "../services/attendanceService";

export default function AttendanceScreen() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadStudents();
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      const data = await getAllCourses();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await getStudentsByCourse(selectedCourse);
      setStudents(data);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance({ ...attendance, [studentId]: status });
  };

  const handleSubmit = async () => {
    try {
      for (const [studentId, status] of Object.entries(attendance)) {
        await recordAttendance({
          courseId: selectedCourse,
          studentId,
          status,
          timestamp: new Date().toISOString(),
        });
      }
      Alert.alert("Success", "Attendance recorded successfully");
      setAttendance({});
    } catch (error) {
      Alert.alert("Error", "Failed to record attendance");
    }
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentRow}>
      <Text style={styles.studentName}>{item.name}</Text>
      <View style={styles.statusButtons}>
        <TouchableOpacity
          style={[
            styles.statusButton,
            attendance[item.id] === "present" && styles.statusPresent,
          ]}
          onPress={() => handleStatusChange(item.id, "present")}
        >
          <Text style={styles.statusText}>P</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.statusButton,
            attendance[item.id] === "late" && styles.statusLate,
          ]}
          onPress={() => handleStatusChange(item.id, "late")}
        >
          <Text style={styles.statusText}>L</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.statusButton,
            attendance[item.id] === "absent" && styles.statusAbsent,
          ]}
          onPress={() => handleStatusChange(item.id, "absent")}
        >
          <Text style={styles.statusText}>A</Text>
        </TouchableOpacity>
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
        <Text style={styles.title}>Record Attendance</Text>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Select Course:</Text>
        <Picker
          selectedValue={selectedCourse}
          onValueChange={(value) => setSelectedCourse(value)}
          style={styles.picker}
        >
          {courses.map((course) => (
            <Picker.Item
              key={course.id}
              label={course.name}
              value={course.id}
            />
          ))}
        </Picker>
      </View>

      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No students in this course</Text>
        }
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={Object.keys(attendance).length === 0}
      >
        <Text style={styles.submitButtonText}>Submit Attendance</Text>
      </TouchableOpacity>
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
  pickerContainer: {
    padding: 15,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 8,
  },
  picker: {
    backgroundColor: "#f8fafc",
  },
  list: {
    padding: 15,
  },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  studentName: {
    fontSize: 16,
    color: "#1f2937",
    flex: 1,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  statusPresent: {
    backgroundColor: "#10b981",
  },
  statusLate: {
    backgroundColor: "#f59e0b",
  },
  statusAbsent: {
    backgroundColor: "#ef4444",
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 50,
    fontSize: 16,
  },
});
