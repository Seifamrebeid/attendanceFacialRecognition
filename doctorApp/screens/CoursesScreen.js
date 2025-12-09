// Courses Screen
// Manages course list, creation, editing, and deletion

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../services/coursesService";

export default function CoursesScreen() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    instructorName: "",
    schedule: "",
    startTime: "",
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await getAllCourses();
      setCourses(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const handleOpenModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        name: course.name || "",
        code: course.code || "",
        instructorName: course.instructorName || "",
        schedule: course.schedule || "",
        startTime: course.startTime || "",
      });
    } else {
      setEditingCourse(null);
      setFormData({
        name: "",
        code: "",
        instructorName: "",
        schedule: "",
        startTime: "",
      });
    }
    setModalVisible(true);
  };

  const handleSaveCourse = async () => {
    if (!formData.name || !formData.code) {
      Alert.alert("Error", "Please fill in required fields");
      return;
    }

    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
        Alert.alert("Success", "Course updated successfully");
      } else {
        await createCourse(formData);
        Alert.alert("Success", "Course created successfully");
      }
      setModalVisible(false);
      loadCourses();
    } catch (error) {
      Alert.alert("Error", "Failed to save course");
    }
  };

  const handleDeleteCourse = (course) => {
    Alert.alert(
      "Delete Course",
      `Are you sure you want to delete ${course.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCourse(course.id);
              Alert.alert("Success", "Course deleted");
              loadCourses();
            } catch (error) {
              Alert.alert("Error", "Failed to delete course");
            }
          },
        },
      ]
    );
  };

  const renderCourse = ({ item }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseName}>{item.name}</Text>
        <Text style={styles.courseDetail}>Code: {item.code}</Text>
        <Text style={styles.courseDetail}>
          Instructor: {item.instructorName}
        </Text>
        {item.schedule && (
          <Text style={styles.courseDetail}>Schedule: {item.schedule}</Text>
        )}
        {item.startTime && (
          <Text style={styles.courseDetail}>Start Time: {item.startTime}</Text>
        )}
      </View>
      <View style={styles.courseActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleOpenModal(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteCourse(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
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
        <Text style={styles.title}>Courses ({courses.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenModal()}
        >
          <Text style={styles.addButtonText}>+ Add Course</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={courses}
        renderItem={renderCourse}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No courses found</Text>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCourse ? "Edit Course" : "Add New Course"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Course Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Course Code *"
              value={formData.code}
              onChangeText={(text) => setFormData({ ...formData, code: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Instructor Name"
              value={formData.instructorName}
              onChangeText={(text) =>
                setFormData({ ...formData, instructorName: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Schedule (e.g., Mon/Wed 10:00)"
              value={formData.schedule}
              onChangeText={(text) =>
                setFormData({ ...formData, schedule: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Start Time (e.g., 10:00)"
              value={formData.startTime}
              onChangeText={(text) =>
                setFormData({ ...formData, startTime: text })
              }
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCourse}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  addButton: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  list: {
    padding: 15,
  },
  courseCard: {
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
  courseInfo: {
    marginBottom: 10,
  },
  courseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 5,
  },
  courseDetail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  courseActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    padding: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 50,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1f2937",
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
