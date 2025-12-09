// Predictions Screen
// Displays absence predictions for students

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getAllCourses } from "../services/coursesService";
import { getPredictionsForCourse } from "../services/predictionService";

export default function PredictionsScreen() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadPredictions();
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
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      const data = await getPredictionsForCourse(selectedCourse);
      setPredictions(data);
    } catch (error) {
      console.error("Error loading predictions:", error);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "High":
        return "#ef4444";
      case "Medium":
        return "#f59e0b";
      default:
        return "#10b981";
    }
  };

  const renderPrediction = ({ item }) => (
    <View style={styles.predictionCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.student.name}</Text>
        <Text style={styles.studentId}>{item.student.studentNumber}</Text>
      </View>
      <View style={styles.predictionInfo}>
        <View
          style={[
            styles.riskBadge,
            { backgroundColor: getRiskColor(item.riskLevel) },
          ]}
        >
          <Text style={styles.riskText}>{item.riskLevel}</Text>
        </View>
        <Text style={styles.probability}>
          {(item.probability * 100).toFixed(1)}%
        </Text>
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
        <Text style={styles.title}>Absence Predictions</Text>
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
        data={predictions}
        renderItem={renderPrediction}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No predictions available</Text>
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
  predictionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: "#6b7280",
  },
  predictionInfo: {
    alignItems: "flex-end",
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  riskText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  probability: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 50,
    fontSize: 16,
  },
});
