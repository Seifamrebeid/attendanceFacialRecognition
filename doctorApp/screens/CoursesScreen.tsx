// Courses Management Screen
// Allows admin to view and manage all courses

import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { getAllCourses, createCourse, updateCourse, deleteCourse, Course } from '@/services/admin/coursesService';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function CoursesScreen() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        instructorName: '',
        schedule: '',
        startTime: '',
    });

    const loadCourses = async () => {
        try {
            const coursesData = await getAllCourses();
            setCourses(coursesData);
        } catch (error) {
            console.error('Error loading courses:', error);
            Alert.alert('Error', 'Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCourses();
        setRefreshing(false);
    }, []);

    const handleAddCourse = () => {
        setEditingCourse(null);
        setFormData({
            name: '',
            code: '',
            instructorName: '',
            schedule: '',
            startTime: '',
        });
        setModalVisible(true);
    };

    const handleEditCourse = (course: Course) => {
        setEditingCourse(course);
        setFormData({
            name: course.name,
            code: course.code,
            instructorName: course.instructorName,
            schedule: course.schedule || '',
            startTime: course.startTime || '',
        });
        setModalVisible(true);
    };

    const handleSaveCourse = async () => {
        if (!formData.name || !formData.code) {
            Alert.alert('Error', 'Please fill in course name and code');
            return;
        }

        try {
            if (editingCourse) {
                await updateCourse(editingCourse.id, formData);
                Alert.alert('Success', 'Course updated successfully');
            } else {
                await createCourse(formData);
                Alert.alert('Success', 'Course created successfully');
            }
            setModalVisible(false);
            await loadCourses();
        } catch (error) {
            console.error('Error saving course:', error);
            Alert.alert('Error', 'Failed to save course');
        }
    };

    const handleDeleteCourse = (course: Course) => {
        Alert.alert(
            'Delete Course',
            `Are you sure you want to delete ${course.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCourse(course.id);
                            Alert.alert('Success', 'Course deleted successfully');
                            await loadCourses();
                        } catch (error) {
                            console.error('Error deleting course:', error);
                            Alert.alert('Error', 'Failed to delete course');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading courses...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Courses</Text>
                    <Text style={styles.headerSubtitle}>{courses.length} total courses</Text>
                </View>
                <TouchableOpacity onPress={handleAddCourse} style={styles.addButton}>
                    <IconSymbol name="plus.circle.fill" size={28} color="#2563eb" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {courses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <IconSymbol name="book.closed" size={64} color="#9ca3af" />
                        <Text style={styles.emptyText}>No courses found</Text>
                        <Text style={styles.emptySubtext}>Tap the + button to add a course</Text>
                    </View>
                ) : (
                    courses.map((course) => (
                        <View key={course.id} style={styles.courseCard}>
                            <View style={styles.courseHeader}>
                                <View style={styles.courseIcon}>
                                    <IconSymbol name="book.fill" size={24} color="#2563eb" />
                                </View>
                                <View style={styles.courseInfo}>
                                    <Text style={styles.courseName}>{course.name}</Text>
                                    <Text style={styles.courseCode}>{course.code}</Text>
                                </View>
                            </View>

                            <View style={styles.courseDetails}>
                                <View style={styles.detailRow}>
                                    <IconSymbol name="person.fill" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>{course.instructorName}</Text>
                                </View>
                                {course.schedule && (
                                    <View style={styles.detailRow}>
                                        <IconSymbol name="calendar" size={16} color="#6b7280" />
                                        <Text style={styles.detailText}>{course.schedule}</Text>
                                    </View>
                                )}
                                {course.startTime && (
                                    <View style={styles.detailRow}>
                                        <IconSymbol name="clock.fill" size={16} color="#6b7280" />
                                        <Text style={styles.detailText}>{course.startTime}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.courseActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleEditCourse(course)}
                                >
                                    <IconSymbol name="pencil" size={18} color="#2563eb" />
                                    <Text style={styles.actionButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => handleDeleteCourse(course)}
                                >
                                    <IconSymbol name="trash" size={18} color="#ef4444" />
                                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                                        Delete
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Add/Edit Course Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingCourse ? 'Edit Course' : 'Add Course'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <IconSymbol name="xmark.circle.fill" size={28} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Course Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Introduction to Programming"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Course Code *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., CS101"
                                    value={formData.code}
                                    onChangeText={(text) => setFormData({ ...formData, code: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Instructor Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Dr. Smith"
                                    value={formData.instructorName}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, instructorName: text })
                                    }
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Schedule</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Mon/Wed 10:00 AM"
                                    value={formData.schedule}
                                    onChangeText={(text) => setFormData({ ...formData, schedule: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Start Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., 10:00 AM"
                                    value={formData.startTime}
                                    onChangeText={(text) => setFormData({ ...formData, startTime: text })}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
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
        backgroundColor: '#f8fafc',
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
    addButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6b7280',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
    },
    courseCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    courseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    courseIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    courseInfo: {
        flex: 1,
    },
    courseName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    courseCode: {
        fontSize: 14,
        color: '#6b7280',
    },
    courseDetails: {
        gap: 8,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#4b5563',
    },
    courseActions: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#eff6ff',
        gap: 4,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
    },
    deleteButton: {
        backgroundColor: '#fef2f2',
    },
    deleteButtonText: {
        color: '#ef4444',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalForm: {
        paddingHorizontal: 20,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    saveButton: {
        backgroundColor: '#2563eb',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
