// Analytics Screen
// Displays late arrival analytics with charts

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { LineChart } from "react-native-chart-kit";
import { getAllCourses } from "../services/coursesService";
import { getLateAnalytics } from "../services/analyticsService";

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadAnalytics();
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

  const loadAnalytics = async () => {
    try {
      const data = await getLateAnalytics(selectedCourse);
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const getChartData = () => {
    if (!analytics || analytics.arrivalTimes.length === 0) {
      return null;
    }

    const times = analytics.arrivalTimes
      .map((t) => t.getHours() + t.getMinutes() / 60)
      .slice(0, 20); // Limit to 20 points

    return {
      labels: times.map((_, i) => `${i + 1}`),
      datasets: [
        {
          data: times,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Late Analytics</Text>
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

      {analytics && (
        <View style={styles.content}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Statistics</Text>
            <Text style={styles.statItem}>
              Total Records: {analytics.totalRecords}
            </Text>
            {analytics.statistics.mean > 0 && (
              <>
                <Text style={styles.statItem}>
                  Mean: {analytics.statistics.mean.toFixed(2)} min
                </Text>
                <Text style={styles.statItem}>
                  Std Dev: {analytics.statistics.stdDev.toFixed(2)} min
                </Text>
              </>
            )}
          </View>

          {chartData && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Arrival Times</Text>
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}
        </View>
      )}

      {(!analytics || analytics.totalRecords === 0) && (
        <Text style={styles.emptyText}>No data available for this course</Text>
      )}
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
  content: {
    padding: 15,
  },
  statsCard: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 10,
  },
  statItem: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 5,
  },
  chartCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 10,
  },
  chart: {
    borderRadius: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 50,
    fontSize: 16,
  },
});
