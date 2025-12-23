// Courses Service for Admin App
// Handles all Firestore operations for courses collection

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const COLLECTION_NAME = 'courses';

export interface Course {
    id: string;
    name: string;
    code: string;
    instructorName: string;
    schedule?: string;
    startTime?: string;
    courseName?: string;
    courseCode?: string;
    lecturerName?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Get all courses from Firestore
 */
export const getAllCourses = async (): Promise<Course[]> => {
    try {
        const coursesRef = collection(db, COLLECTION_NAME);
        const querySnapshot = await getDocs(coursesRef);

        const courses: Course[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            courses.push({
                id: doc.id,
                ...data,
                name: data.name || data.courseName || '',
                code: data.code || data.courseCode || '',
                instructorName: data.instructorName || data.lecturerName || '',
                courseName: data.courseName,
                courseCode: data.courseCode,
                lecturerName: data.lecturerName
            } as Course);
        });

        courses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return courses;
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
};

/**
 * Create a new course
 */
export const createCourse = async (courseData: Partial<Course>): Promise<string> => {
    try {
        const coursesRef = collection(db, COLLECTION_NAME);
        const docRef = await addDoc(coursesRef, {
            ...courseData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating course:', error);
        throw error;
    }
};

/**
 * Update an existing course
 */
export const updateCourse = async (courseId: string, courseData: Partial<Course>): Promise<void> => {
    try {
        const courseRef = doc(db, COLLECTION_NAME, courseId);
        await updateDoc(courseRef, {
            ...courseData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating course:', error);
        throw error;
    }
};

/**
 * Delete a course
 */
export const deleteCourse = async (courseId: string): Promise<void> => {
    try {
        const courseRef = doc(db, COLLECTION_NAME, courseId);
        await deleteDoc(courseRef);
    } catch (error) {
        console.error('Error deleting course:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time course updates
 */
export const subscribeToCoursesUpdates = (callback: (courses: Course[]) => void) => {
    const coursesRef = collection(db, COLLECTION_NAME);

    return onSnapshot(coursesRef, (querySnapshot) => {
        const courses: Course[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            courses.push({
                id: doc.id,
                ...data,
                name: data.name || data.courseName || '',
                code: data.code || data.courseCode || '',
                instructorName: data.instructorName || data.lecturerName || '',
                courseName: data.courseName,
                courseCode: data.courseCode,
                lecturerName: data.lecturerName
            } as Course);
        });

        courses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        callback(courses);
    });
};
