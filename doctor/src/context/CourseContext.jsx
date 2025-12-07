// Course Context - Manage selected course state across app
import { createContext, useContext, useState } from 'react'

const CourseContext = createContext()

export const useCourse = () => {
  const context = useContext(CourseContext)
  if (!context) {
    throw new Error('useCourse must be used within CourseProvider')
  }
  return context
}

export const CourseProvider = ({ children }) => {
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [lecturerName, setLecturerName] = useState(null)

  const login = (course, lecturer) => {
    setSelectedCourse(course)
    setLecturerName(lecturer)
  }

  const logout = () => {
    setSelectedCourse(null)
    setLecturerName(null)
  }

  return (
    <CourseContext.Provider value={{
      selectedCourse,
      lecturerName,
      login,
      logout,
      isAuthenticated: !!selectedCourse
    }}>
      {children}
    </CourseContext.Provider>
  )
}
