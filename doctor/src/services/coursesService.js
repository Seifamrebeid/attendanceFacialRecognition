// Courses Service
// Handles Firestore operations for courses collection

import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'

const COLLECTION_NAME = 'courses'

/**
 * Get all courses from Firestore
 * @returns {Promise<Array>} Array of course objects with IDs
 */
export const getAllCourses = async () => {
  try {
    const coursesRef = collection(db, COLLECTION_NAME)
    const querySnapshot = await getDocs(coursesRef)

    const courses = []
    querySnapshot.forEach((doc) => {
      courses.push({
        id: doc.id,
        ...doc.data()
      })
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw error
  }
}

/**
 * Validate lecturer credentials for a specific course
 * @param {Object} course - Course object
 * @param {string} username - Lecturer username
 * @param {string} password - Lecturer password
 * @returns {boolean} True if credentials match
 */
export const validateLecturerCredentials = (course, username, password) => {
  return course.lecturerUsername === username && course.lecturerPassword === password
}
