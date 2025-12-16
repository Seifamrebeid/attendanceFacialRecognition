# course_selection.R
# Generate course selection and login Python code
#
# This module generates the Python code for:
# - Fetching courses from Firestore
# - Login page with username/password
# - Week number selection (1-16)

#' Generate Course Selection Python Code
#'
#' @description Generates Python code for course selection, login, and week selection
#' @return Character string containing Python code
#' @export
generate_course_selection_code <- function() {
  code <- '
# Course selection and login functionality
import tkinter as tk
from tkinter import ttk, messagebox

# Global variables for selected course and week
selected_course = None
selected_week = None
logged_in_lecturer = None

def fetch_courses_from_firestore():
    """Fetch all courses from Firestore"""
    if not firestore_available:
        print("Firestore not available - using demo courses")
        return [
            {"id": "demo1", "courseCode": "DEMO101", "courseName": "Demo Course", 
             "lecturerName": "Demo Lecturer", "lecturerUsername": "demo", "lecturerPassword": "demo",
             "department": "Demo", "semester": "Fall 2025", "schedule": "Monday 10:00"}
        ]
    
    try:
        courses = []
        docs = db.collection("courses").stream()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            courses.append(data)
        print(f"Fetched {len(courses)} courses from Firestore")
        return courses
    except Exception as e:
        print(f"Error fetching courses: {e}")
        return []

def show_course_selection_window():
    """Show course selection, login, and week selection window"""
    global selected_course, selected_week, logged_in_lecturer
    
    # Fetch courses
    courses = fetch_courses_from_firestore()
    if not courses:
        messagebox.showerror("Error", "No courses found in database")
        return False
    
    # Create main window
    root = tk.Tk()
    root.title("Attendance System - Course Selection")
    root.geometry("650x600")
    root.configure(bg="#2c3e50")
    
    # Center window
    root.update_idletasks()
    x = (root.winfo_screenwidth() - 650) // 2
    y = (root.winfo_screenheight() - 600) // 2
    root.geometry(f"650x600+{x}+{y}")
    
    result = {"success": False}
    
    # Title
    title_label = tk.Label(root, text="Smart Attendance System", 
                          font=("Helvetica", 20, "bold"), fg="white", bg="#2c3e50")
    title_label.pack(pady=20)
    
    # Course Selection Frame
    course_frame = tk.LabelFrame(root, text="Select Course", font=("Helvetica", 12),
                                 fg="white", bg="#34495e", padx=20, pady=10)
    course_frame.pack(fill="x", padx=30, pady=10)
    
    # Course dropdown
    course_var = tk.StringVar()
    course_options = [f"{c[\'courseCode\']} - {c[\'courseName\']} ({c[\'lecturerName\']})" for c in courses]
    course_dropdown = ttk.Combobox(course_frame, textvariable=course_var, values=course_options, 
                                   state="readonly", width=50, font=("Helvetica", 10))
    course_dropdown.pack(pady=10)
    if course_options:
        course_dropdown.current(0)
    
    # Week Selection Frame
    week_frame = tk.LabelFrame(root, text="Select Week", font=("Helvetica", 12),
                               fg="white", bg="#34495e", padx=20, pady=10)
    week_frame.pack(fill="x", padx=30, pady=10)
    
    week_var = tk.StringVar()
    week_options = [f"Week {i}" for i in range(1, 17)]
    week_dropdown = ttk.Combobox(week_frame, textvariable=week_var, values=week_options,
                                 state="readonly", width=50, font=("Helvetica", 10))
    week_dropdown.pack(pady=10)
    week_dropdown.current(0)
    
    # Login Frame
    login_frame = tk.LabelFrame(root, text="Lecturer Login", font=("Helvetica", 12),
                                fg="white", bg="#34495e", padx=20, pady=15)
    login_frame.pack(fill="x", padx=30, pady=15)
    
    # Username
    tk.Label(login_frame, text="Username:", font=("Helvetica", 10), 
             fg="white", bg="#34495e").pack(anchor="w", pady=(5, 0))
    username_entry = tk.Entry(login_frame, font=("Helvetica", 12), width=45)
    username_entry.pack(pady=(5, 10))
    
    # Password
    tk.Label(login_frame, text="Password:", font=("Helvetica", 10),
             fg="white", bg="#34495e").pack(anchor="w", pady=(5, 0))
    password_entry = tk.Entry(login_frame, font=("Helvetica", 12), width=45, show="*")
    password_entry.pack(pady=(5, 10))
    
    def on_login():
        global selected_course, selected_week, logged_in_lecturer
        
        # Get selected course index
        course_idx = course_dropdown.current()
        if course_idx < 0:
            messagebox.showerror("Error", "Please select a course")
            return
        
        course = courses[course_idx]
        username = username_entry.get().strip()
        password = password_entry.get().strip()
        
        # Validate credentials
        if username != course.get("lecturerUsername") or password != course.get("lecturerPassword"):
            messagebox.showerror("Login Failed", "Invalid username or password for this course")
            return
        
        # Get week number
        week_idx = week_dropdown.current()
        week_num = week_idx + 1
        
        # Success
        selected_course = course
        selected_week = week_num
        logged_in_lecturer = course.get("lecturerName")
        result["success"] = True
        
        print(f"\\nLogged in successfully!")
        print(f"Course: {course[\'courseCode\']} - {course[\'courseName\']}")
        print(f"Week: {week_num}")
        print(f"Lecturer: {logged_in_lecturer}")
        
        root.destroy()
    
    def on_cancel():
        root.destroy()
    
    # Buttons
    button_frame = tk.Frame(root, bg="#2c3e50")
    button_frame.pack(pady=20)
    
    login_btn = tk.Button(button_frame, text="Start Attendance", font=("Helvetica", 12, "bold"),
                         bg="#27ae60", fg="white", width=15, command=on_login)
    login_btn.pack(side="left", padx=10)
    
    cancel_btn = tk.Button(button_frame, text="Cancel", font=("Helvetica", 12),
                          bg="#e74c3c", fg="white", width=15, command=on_cancel)
    cancel_btn.pack(side="left", padx=10)
    
    # Run the window
    root.mainloop()
    
    return result["success"]

def write_attendance_record_realtime(student_name, similarity, action):
    """Write a single attendance record to Firestore immediately (real-time)"""
    global selected_course, selected_week, logged_in_lecturer
    
    if not firestore_available or not selected_course:
        print(f"Cannot write attendance - Firestore: {firestore_available}, Course: {selected_course is not None}")
        return False
    
    try:
        timestamp = datetime.now()
        doc_data = {
            # Student info
            "studentName": student_name,
            "similarity": float(similarity),
            "action": action,
            
            # Timestamp info
            "timestamp": timestamp.isoformat(),
            "date": timestamp.strftime("%Y-%m-%d"),
            "time": timestamp.strftime("%H:%M:%S"),
            "dayOfWeek": timestamp.strftime("%A"),
            
            # Course info
            "courseId": selected_course.get("id"),
            "courseCode": selected_course.get("courseCode"),
            "courseName": selected_course.get("courseName"),
            "department": selected_course.get("department"),
            "semester": selected_course.get("semester"),
            
            # Session info
            "weekNumber": selected_week,
            "lecturerName": logged_in_lecturer,
            
            # Metadata
            "createdAt": timestamp.isoformat()
        }
        
        # Write immediately to Firestore
        db.collection("attendance").add(doc_data)
        print(f"[SAVED] {student_name} - {action} - Week {selected_week} - {selected_course.get(\'courseCode\')}")
        return True
        
    except Exception as e:
        print(f"Error writing attendance record: {e}")
        return False

def get_session_info_text():
    """Get formatted session info for display"""
    if selected_course and selected_week:
        return f"{selected_course.get(\'courseCode\')} | Week {selected_week} | {logged_in_lecturer}"
    return "No course selected"
'
  
  return(code)
}
