
import cv2
import numpy as np
import pickle
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
from datetime import datetime
import pandas as pd
import threading
import time


# Firebase Firestore integration
from firebase_admin import credentials, firestore, initialize_app

# Initialize Firebase
try:
    cred = credentials.Certificate("service.json")
    initialize_app(cred)
    db = firestore.client()
    firestore_available = True
    print("Firebase Firestore initialized")
except Exception as e:
    print(f"Firestore initialization failed: {e}")
    firestore_available = False

def read_firestore_attendance():
    """Read all attendance records from Firestore at startup"""
    if not firestore_available:
        return []
    
    try:
        docs = db.collection("attendance").stream()
        firestore_records = []
        for doc in docs:
            data = doc.to_dict()
            firestore_records.append({
                "id": doc.id,
                "name": data.get("name"),
                "action": data.get("action"),
                "timestamp": data.get("timestamp"),
                "similarity": data.get("similarity"),
                "duration_minutes": data.get("duration_minutes"),
                "session_id": data.get("session_id")
            })
        
        print(f"Read {len(firestore_records)} records from Firestore:")
        for record in firestore_records[-3:]:  # Show last 3
            print(f"  {record['timestamp']} - {record['name']} {record['action']}")
        
        return firestore_records
    except Exception as e:
        print(f"Error reading from Firestore: {e}")
        return []

def write_to_firestore(attendance_log):
    """Write attendance log to Firestore when stopping"""
    if not firestore_available or not attendance_log:
        return
    
    try:
        print("\nWriting to Firestore...")
        batch = db.batch()
        
        for entry in attendance_log:
            doc_data = {
                "name": entry["name"],
                "action": entry["action"],
                "timestamp": entry["timestamp"],
                "date": entry["date"], 
                "time": entry["time"],
                "similarity": float(entry["similarity"]),
                "duration_minutes": float(entry["duration_minutes"]) if entry["duration_minutes"] else None,
                "session_id": int(entry["session_id"]) if entry["session_id"] else None,
                "created_at": datetime.now().isoformat()
            }
            
            # doc_ref = db.collection("attendance").document()
            batch.set(doc_ref, doc_data)
        
        batch.commit()
        print(f"Successfully wrote {len(attendance_log)} records to Firestore")
        
    except Exception as e:
        print(f"Error writing to Firestore: {e}")


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
    course_options = [f"{c['courseCode']} - {c['courseName']} ({c['lecturerName']})" for c in courses]
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
        
        print(f"\nLogged in successfully!")
        print(f"Course: {course['courseCode']} - {course['courseName']}")
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
        print(f"[SAVED] {student_name} - {action} - Week {selected_week} - {selected_course.get('courseCode')}")
        return True
        
    except Exception as e:
        print(f"Error writing attendance record: {e}")
        return False

def get_session_info_text():
    """Get formatted session info for display"""
    if selected_course and selected_week:
        return f"{selected_course.get('courseCode')} | Week {selected_week} | {logged_in_lecturer}"
    return "No course selected"


# Smart auto-detection using face positioning and stability
def detect_face_in_optimal_zone(boxes, frame_shape, stability_threshold=0.02):
    """Detect if face is in optimal position for auto-capture"""
    if boxes is None:
        return False, None
    
    height, width = frame_shape[:2]
    center_x, center_y = width // 2, height // 2
    
    # Define optimal capture zone (center 40% of frame)
    zone_width = int(width * 0.4)
    zone_height = int(height * 0.4)
    
    zone_left = center_x - zone_width // 2
    zone_right = center_x + zone_width // 2
    zone_top = center_y - zone_height // 2
    zone_bottom = center_y + zone_height // 2
    
    for box in boxes:
        x1, y1, x2, y2 = [int(b) for b in box]
        face_center_x = (x1 + x2) // 2
        face_center_y = (y1 + y2) // 2
        face_width = x2 - x1
        face_height = y2 - y1
        face_area = face_width * face_height
        
        # Check if face is in optimal zone
        in_zone = (zone_left <= face_center_x <= zone_right and 
                   zone_top <= face_center_y <= zone_bottom)
        
        # Check face size (should be substantial but not too close)
        optimal_size = 8000 <= face_area <= 50000
        
        if in_zone and optimal_size:
            return True, (x1, y1, x2, y2, face_center_x, face_center_y)
    
    return False, None

def draw_smart_guidance(frame, boxes, optimal_face, quality_score):
    """Draw smart positioning guidance with high-quality text"""
    height, width = frame.shape[:2]
    center_x, center_y = width // 2, height // 2
    
    # Helper function for high-quality text on camera feed
    def draw_text_camera(img, text, pos, font_scale, color, thickness=2):
        cv2.putText(img, text, pos, cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness, cv2.LINE_AA)
    
    # Draw optimal zone
    zone_width = int(width * 0.4)
    zone_height = int(height * 0.4)
    
    zone_left = center_x - zone_width // 2
    zone_right = center_x + zone_width // 2
    zone_top = center_y - zone_height // 2
    zone_bottom = center_y + zone_height // 2
    
    # Draw zone rectangle
    cv2.rectangle(frame, (zone_left, zone_top), (zone_right, zone_bottom), (0, 255, 255), 2)
    draw_text_camera(frame, "OPTIMAL ZONE", (zone_left, zone_top - 10), 0.8, (0, 255, 255), 2)
    
    # Draw center crosshair
    cv2.line(frame, (center_x - 20, center_y), (center_x + 20, center_y), (0, 255, 255), 2)
    cv2.line(frame, (center_x, center_y - 20), (center_x, center_y + 20), (0, 255, 255), 2)
    
    if boxes is not None:
        for box in boxes:
            x1, y1, x2, y2 = [int(b) for b in box]
            face_center_x = (x1 + x2) // 2
            face_center_y = (y1 + y2) // 2
            
            if optimal_face and optimal_face[0] == x1:  # This is the optimal face
                # Green for optimal position
                color = (0, 255, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
            else:
                # Guide to optimal position
                color = (255, 255, 0)  # Yellow for guidance
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                # Direction arrows with better text
                if face_center_x < zone_left:
                    draw_text_camera(frame, "MOVE RIGHT ->", (x1, y2 + 25), 0.7, color, 2)
                elif face_center_x > zone_right:
                    draw_text_camera(frame, "<- MOVE LEFT", (x1, y2 + 25), 0.7, color, 2)
                
                if face_center_y < zone_top:
                    draw_text_camera(frame, "MOVE DOWN", (x1, y1 - 35), 0.7, color, 2)
                elif face_center_y > zone_bottom:
                    draw_text_camera(frame, "MOVE UP", (x1, y1 - 35), 0.7, color, 2)
                
                # Size guidance with better text
                face_area = (x2 - x1) * (y2 - y1)
                if face_area < 8000:
                    draw_text_camera(frame, "COME CLOSER", (x1, y2 + 50), 0.7, color, 2)
                elif face_area > 50000:
                    draw_text_camera(frame, "STEP BACK", (x1, y2 + 50), 0.7, color, 2)
    
    # Enhanced quality indicator with better styling
    if quality_score > 0:
        # Position on top right for better visibility
        bar_x = width - 320
        bar_y = 30
        bar_length = int(250 * quality_score)
        
        # Background rectangle with rounded effect
        cv2.rectangle(frame, (bar_x - 10, bar_y - 10), (bar_x + 270, bar_y + 35), (0, 0, 0), -1)
        cv2.rectangle(frame, (bar_x - 8, bar_y - 8), (bar_x + 268, bar_y + 33), (50, 50, 50), 2)
        
        # Quality bar background
        cv2.rectangle(frame, (bar_x, bar_y + 15), (bar_x + 250, bar_y + 25), (100, 100, 100), -1)
        
        # Color gradient based on quality
        if quality_score >= 0.8:
            bar_color = (0, 255, 0)  # Bright Green
            status_text = "EXCELLENT"
        elif quality_score >= 0.6:
            bar_color = (0, 255, 255)  # Yellow
            status_text = "GOOD"
        elif quality_score >= 0.4:
            bar_color = (0, 165, 255)  # Orange
            status_text = "OK"
        else:
            bar_color = (0, 100, 255)  # Red
            status_text = "POOR"
        
        # Quality bar fill
        cv2.rectangle(frame, (bar_x, bar_y + 15), (bar_x + bar_length, bar_y + 25), bar_color, -1)
        
        # Enhanced text with percentage and status
        cv2.putText(frame, f"Quality: {quality_score:.0%} - {status_text}", (bar_x, bar_y + 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 3, cv2.LINE_AA)

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def similarity_to_match_percent(similarity):
    """Convert cosine similarity (0–1) to human-friendly percent 0–100"""
    if similarity is None:
        return 0
    try:
        s = float(similarity)
    except Exception:
        return 0
    if s < 0.0:
        s = 0.0
    if s > 1.0:
        s = 1.0
    return int(s * 100)

def find_best_match(face_encoding, threshold=0.45):
    """Find the best matching face from known encodings"""
    similarities = [cosine_similarity(face_encoding, known_enc) for known_enc in known_encodings]
    best_idx = np.argmax(similarities)
    best_similarity = similarities[best_idx]
    
    if best_similarity >= threshold:
        return known_names[best_idx], best_similarity
    else:
        return "Unknown", best_similarity

def is_same_face(pos1, pos2, threshold=50):
    """Check if two face positions represent the same face"""
    if pos1 is None or pos2 is None:
        return False
    center1_x, center1_y = (pos1[0] + pos1[2]) // 2, (pos1[1] + pos1[3]) // 2
    center2_x, center2_y = (pos2[0] + pos2[2]) // 2, (pos2[1] + pos2[3]) // 2
    distance = ((center1_x - center2_x)**2 + (center1_y - center2_y)**2)**0.5
    return distance < threshold

def get_current_action(person_name):
    """Determine if this should be JOIN, LEFT, or potential RETURNED"""
    if person_name in current_sessions:
        return "LEFT"
    else:
        # Check if they left recently (within 10 minutes) - could be RETURNED
        current_time = datetime.now()
        if (person_name in recent_departures and 
            (current_time - recent_departures[person_name]).total_seconds() < 600):  # 10 minutes
            return "RETURNED"
        else:
            return "JOIN"

def calculate_duration(start_time, end_time):
    """Calculate duration in minutes between two timestamps"""
    duration = end_time - start_time
    return duration.total_seconds() / 60

def log_attendance(name, similarity, action):
    """Log attendance with enhanced tracking and REAL-TIME Firestore write.
       Also updates CURRENT_RECOGNITION global for the UI and stores a percent."""
    global session_counter
    
    timestamp = datetime.now()
    duration_minutes = None
    session_id = None

    # Convert similarity (0–1) to percent for UI
    match_percent = similarity_to_match_percent(similarity)
    
    # Try to split "Abdullah_Nagy_Abdullah_231004881" → display name + ID
    display_name = str(name)
    student_id = ""
    if isinstance(name, str):
        parts = name.split("_")
        if len(parts) > 1 and parts[-1].isdigit():
            student_id = parts[-1]
            display_name = " ".join(parts[:-1])
    
    # Update global CURRENT_RECOGNITION for the right-side panel
    try:
        globals()["CURRENT_RECOGNITION"] = {
            "name": display_name,
            "id": student_id,
            "match_percent": match_percent,
            "live_face": None,   # can be replaced later with cropped frame
            "ref_face": None     # can be replaced later with DB photo
        }
    except Exception:
        pass
    
    if action == "JOIN":
        current_sessions[name] = {
            "start_time": timestamp,
            "session_id": session_counter
        }
        session_id = session_counter
        session_counter += 1
        
        # Remove from recent departures if they were there
        if name in recent_departures:
            del recent_departures[name]
            
        print("[JOIN] {} JOINED at {}".format(name, timestamp.strftime("%H:%M:%S")))
        
    elif action == "LEFT" and name in current_sessions:
        start_time = current_sessions[name]["start_time"]
        session_id = current_sessions[name]["session_id"]
        duration_minutes = calculate_duration(start_time, timestamp)
        
        # Track this person departure time for RETURNED detection
        recent_departures[name] = timestamp
        
        del current_sessions[name]
        
        hours = int(duration_minutes // 60)
        minutes = int(duration_minutes % 60)
        duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
        print("[LEFT] {} LEFT at {} (Duration: {})".format(name, timestamp.strftime("%H:%M:%S"), duration_str))
    
    # Add to local attendance log (now with match_percent)
    attendance_log.append({
        "name": name,
        "action": action,
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "date": timestamp.strftime("%Y-%m-%d"),
        "time": timestamp.strftime("%H:%M:%S"),
        "similarity": round(similarity, 2),
        "match_percent": match_percent,
        "duration_minutes": round(duration_minutes, 1) if duration_minutes else None,
        "session_id": session_id
    })
    
    # REAL-TIME: Write to Firestore immediately
    write_attendance_record_realtime(name, similarity, action)


def create_unified_fullscreen_interface(frame, attendance_log, current_sessions,
                                         quality_score, boxes, optimal_face,
                                         stable_detection_start, stability_duration):
    """
    Fullscreen dashboard UI (AAST branded, bright blue):
    - Left: camera panel
    - Right: session header, current person, people inside, recent activity, today stats
    Uses global CURRENT_RECOGNITION set by detection code.
    """
    import numpy as np
    import cv2
    from datetime import datetime

    # ---------- SMALL HELPER: CLEAN NAME ----------
    def format_display_name(name):
        """Convert Abdullah_Nagy_Abdullah_231004881 -> (display_name, id)"""
        try:
            s = str(name)
            parts = s.split("_")
            if len(parts) > 1 and parts[-1].isdigit():
                sid = parts[-1]
                display_name = " ".join(parts[:-1])
                return display_name, sid
            return s, ""
        except Exception:
            return name, ""

    # ---------- GLOBAL STATE: CURRENT RECOGNITION ----------
    current_state = globals().get("CURRENT_RECOGNITION", None)
    current_name = None
    current_id = None
    current_match_percent = 0
    if current_state is not None:
        current_name = current_state.get("name")
        current_id = current_state.get("id")
        current_match_percent = int(current_state.get("match_percent", 0))

    # If name still has underscores, clean it here too
    if current_name:
        clean_name, _tmp_id = format_display_name(current_name)
        current_name = clean_name
        if not current_id and _tmp_id:
            current_id = _tmp_id

    # ---------- COLORS (AAST BLUE PALETTE, BGR) ----------
    BG_DARK      = (160, 60, 20)   # deep background
    CARD_BG      = (120, 50, 20)   # panel background

    BORDER_SOFT  = (200, 150, 60)  # cyan/blue border
    TITLE_BLUE   = (220, 200, 100)
    SKY_BLUE     = (210, 190, 90)
    TURQ_GLOW    = (210, 230, 160)
    MINT_GREEN   = (200, 230, 170)

    AMBER        = (190, 210, 200)
    ORANGE_SOFT  = (180, 200, 210)

    TEXT_MAIN    = (240, 246, 255)
    TEXT_MUTED   = (185, 192, 210)

    # ---------- BASE CANVAS ----------
    canvas = np.zeros((1080, 1920, 3), dtype=np.uint8)
    canvas[:] = BG_DARK

    def draw_text(img, s, x, y, scale, color, thick=2):
        cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                    scale, color, thick, cv2.LINE_AA)

    # ---------- LOAD / CACHE AAST LOGO ----------
    if "AAST_LOGO" not in globals():
        try:
            logo = cv2.imread("emblem.png", cv2.IMREAD_UNCHANGED)
            if logo is not None:
                globals()["AAST_LOGO"] = logo
            else:
                globals()["AAST_LOGO"] = None
        except Exception:
            globals()["AAST_LOGO"] = None

    logo_img = globals().get("AAST_LOGO", None)

    # ==============================
    # TOP TITLE BAR (dark navy)
    # ==============================
    # Royal navy: hex #0F2745 -> BGR (69, 39, 15)
    cv2.rectangle(canvas, (0, 0), (1920, 70), (69, 39, 15), -1)

    # place logo on top-left if available (bigger now)
    if logo_img is not None:
        try:
            logo_h, logo_w = logo_img.shape[:2]
            target_h = 70   # was 50, now bigger
            scale = target_h / float(logo_h)
            target_w = int(logo_w * scale)
            logo_resized = cv2.resize(logo_img, (target_w, target_h))
            if logo_resized.shape[2] == 4:
                alpha = logo_resized[:, :, 3] / 255.0
                rgb = logo_resized[:, :, :3]
                roi = canvas[5:5+target_h, 20:20+target_w]
                for c in range(3):
                    roi[:, :, c] = (alpha * rgb[:, :, c] +
                                    (1 - alpha) * roi[:, :, c])
                canvas[5:5+target_h, 20:20+target_w] = roi
            else:
                canvas[5:5+target_h, 20:20+target_w] = logo_resized
        except Exception:
            pass

    draw_text(canvas, "AAST Smart Attendance System", 140, 45, 1.0, TITLE_BLUE, 2)

    # Quality indicator on top-right
    if quality_score > 0:
        qx1, qy1 = 1350, 25
        bar_w = int(190 * min(1.0, max(0.0, quality_score)))
        cv2.rectangle(canvas, (qx1 - 10, qy1 - 20),
                      (qx1 + 230, qy1 + 15), (120, 60, 30), -1)
        cv2.rectangle(canvas, (qx1 - 10, qy1 - 20),
                      (qx1 + 230, qy1 + 15), BORDER_SOFT, 1)
        if quality_score >= 0.8:
            qc = MINT_GREEN
            qlabel = "Excellent"
        elif quality_score >= 0.6:
            qc = SKY_BLUE
            qlabel = "Good"
        elif quality_score >= 0.4:
            qc = AMBER
            qlabel = "Fair"
        else:
            qc = ORANGE_SOFT
            qlabel = "Low"
        cv2.rectangle(canvas, (qx1, qy1 - 5),
                      (qx1 + bar_w, qy1 + 3), qc, -1)
        draw_text(canvas, f"Position {int(quality_score*100)}% - {qlabel}",
                  qx1, qy1 - 7, 0.5, TEXT_MAIN, 1)

    # ==============================
    # LEFT: CAMERA PANEL
    # ==============================
    cam_x, cam_y = 40, 100
    cam_w, cam_h = 1180, 880

    cv2.rectangle(canvas, (cam_x - 15, cam_y - 15),
                  (cam_x + cam_w + 15, cam_y + cam_h + 15),
                  CARD_BG, -1)
    cv2.rectangle(canvas, (cam_x - 15, cam_y - 15),
                  (cam_x + cam_w + 15, cam_y + cam_h + 15),
                  BORDER_SOFT, 1)

    cam_frame = cv2.resize(frame, (cam_w, cam_h))
    canvas[cam_y:cam_y+cam_h, cam_x:cam_x+cam_w] = cam_frame

    # bright blue frame border
    cv2.rectangle(canvas, (cam_x, cam_y),
                  (cam_x + cam_w, cam_y + cam_h),
                  SKY_BLUE, 2)
    cv2.rectangle(canvas, (cam_x+4, cam_y+4),
                  (cam_x + cam_w-4, cam_y + cam_h-4),
                  TURQ_GLOW, 1)

    # LIVE label
    label_bg = (110, 80, 40)
    cv2.rectangle(canvas, (cam_x, cam_y - 38),
                  (cam_x + 240, cam_y - 10), label_bg, -1)
    dot_color = MINT_GREEN if int(datetime.now().timestamp() * 2) % 2 == 0 else (80, 120, 70)
    cv2.circle(canvas, (cam_x + 20, cam_y - 24), 8, dot_color, -1)
    draw_text(canvas, "LIVE CAMERA FEED", cam_x + 40, cam_y - 20, 0.7, TEXT_MAIN, 2)

    # INFO BAR under camera
    info_y = cam_y + cam_h + 40
    cv2.rectangle(canvas, (cam_x - 10, info_y - 30),
                  (cam_x + cam_w + 10, info_y + 10),
                  (130, 70, 30), -1)
    cv2.rectangle(canvas, (cam_x - 10, info_y - 30),
                  (cam_x + cam_w + 10, info_y + 10),
                  BORDER_SOFT, 1)

    now = datetime.now()
    time_str = now.strftime("%H:%M:%S")
    draw_text(canvas, f"Time: {time_str}", cam_x, info_y, 0.7, SKY_BLUE, 2)
    draw_text(canvas, f"Currently Inside: {len(current_sessions)}",
              cam_x + 300, info_y, 0.7, TEXT_MAIN, 2)

    live_label = "LIVE RECOGNITION: ON" if stable_detection_start else "LIVE RECOGNITION: READY"
    live_color = MINT_GREEN if stable_detection_start else AMBER
    draw_text(canvas, live_label, cam_x + 770, info_y, 0.7, live_color, 2)

    # ==============================
    # RIGHT SIDE PANEL COLUMN
    # ==============================
    panel_x = 1260
    panel_w = 1920 - panel_x - 40

    # --- SESSION HEADER CARD ---
    header_y = 100
    header_h = 120
    cv2.rectangle(canvas, (panel_x, header_y),
                  (panel_x + panel_w, header_y + header_h),
                  CARD_BG, -1)
    cv2.rectangle(canvas, (panel_x, header_y),
                  (panel_x + panel_w, header_y + header_h),
                  BORDER_SOFT, 1)

    try:
        session_str = get_session_info_text()
    except NameError:
        session_str = ""

    draw_text(canvas, "Attendance Control Center",
              panel_x + 20, header_y + 35, 0.8, TITLE_BLUE, 2)
    draw_text(canvas, session_str,
              panel_x + 20, header_y + 70, 0.6, TEXT_MAIN, 2)

    date_str = now.strftime("%A, %d %B %Y")
    draw_text(canvas, date_str,
              panel_x + 20, header_y + 100, 0.55, TEXT_MUTED, 2)

    pill_x1 = panel_x + panel_w - 180
    pill_y1 = header_y + 22
    cv2.rectangle(canvas, (pill_x1, pill_y1),
                  (pill_x1 + 160, pill_y1 + 28),
                  (150, 80, 30), -1)
    cv2.circle(canvas, (pill_x1 + 18, pill_y1 + 14), 6, MINT_GREEN, -1)
    draw_text(canvas, "Recording Live", pill_x1 + 32, pill_y1 + 19, 0.5, TEXT_MAIN, 1)

    # --- CURRENT PERSON CARD ---
    cp_y = header_y + header_h + 18
    cp_h = 170
    cv2.rectangle(canvas, (panel_x, cp_y),
                  (panel_x + panel_w, cp_y + cp_h),
                  CARD_BG, -1)
    cv2.rectangle(canvas, (panel_x, cp_y),
                  (panel_x + panel_w, cp_y + cp_h),
                  BORDER_SOFT, 1)
    draw_text(canvas, "Current Person", panel_x + 20, cp_y + 32, 0.7, TITLE_BLUE, 2)

    if current_name:
        draw_text(canvas, str(current_name), panel_x + 20, cp_y + 70, 0.65, TEXT_MAIN, 2)
        if current_id:
            draw_text(canvas, f"ID: {current_id}", panel_x + 20, cp_y + 100, 0.55, TEXT_MUTED, 2)

        mp = max(0, min(100, current_match_percent))
        draw_text(canvas, f"Identity Confidence: {mp}%", panel_x + 20, cp_y + 132, 0.55, TEXT_MUTED, 1)

        bar_x1 = panel_x + 20
        bar_x2 = panel_x + panel_w - 30
        bar_y1 = cp_y + 140
        cv2.rectangle(canvas, (bar_x1, bar_y1),
                      (bar_x2, bar_y1 + 12),
                      (110, 60, 30), -1)
        fill_w = int((bar_x2 - bar_x1) * (mp / 100.0))
        if fill_w > 0:
            cv2.rectangle(canvas, (bar_x1, bar_y1),
                          (bar_x1 + fill_w, bar_y1 + 12),
                          MINT_GREEN if mp >= 80 else SKY_BLUE, -1)
        cv2.rectangle(canvas, (bar_x1, bar_y1),
                      (bar_x2, bar_y1 + 12),
                      BORDER_SOFT, 1)
    else:
        draw_text(canvas, "No recognized face", panel_x + 20, cp_y + 85, 0.6, TEXT_MUTED, 2)

    # --- PEOPLE INSIDE CARD ---
    inside_y = cp_y + cp_h + 18
    inside_h = 160
    cv2.rectangle(canvas, (panel_x, inside_y),
                  (panel_x + panel_w, inside_y + inside_h),
                  CARD_BG, -1)
    cv2.rectangle(canvas, (panel_x, inside_y),
                  (panel_x + panel_w, inside_y + inside_h),
                  (160, 200, 240), 1)
    draw_text(canvas, f"People Inside ({len(current_sessions)})",
              panel_x + 20, inside_y + 32, 0.7, MINT_GREEN, 2)

    list_y = inside_y + 62
    if current_sessions:
        for name, session in current_sessions.items():
            if list_y > inside_y + inside_h - 10:
                draw_text(canvas, "...and more", panel_x + 40, list_y, 0.5, TEXT_MUTED, 1)
                break
            display_name, sid = format_display_name(name)
            start_time = session["start_time"]
            mins = (now - start_time).total_seconds() / 60
            if mins >= 60:
                dur = f"{int(mins//60)}h{int(mins%60):02d}m"
            else:
                dur = f"{int(mins)}m"
            cv2.circle(canvas, (panel_x + 25, list_y - 8), 5, MINT_GREEN, -1)
            draw_text(canvas, display_name, panel_x + 40, list_y, 0.55, TEXT_MAIN, 2)
            draw_text(canvas, dur, panel_x + panel_w - 110, list_y, 0.5, TEXT_MUTED, 1)
            list_y += 24
    else:
        draw_text(canvas, "No one currently inside", panel_x + 40, list_y, 0.6, TEXT_MUTED, 2)

    # --- RECENT ACTIVITY CARD ---
    act_y = inside_y + inside_h + 18
    act_h = 190
    cv2.rectangle(canvas, (panel_x, act_y),
                  (panel_x + panel_w, act_y + act_h),
                  CARD_BG, -1)
    cv2.rectangle(canvas, (panel_x, act_y),
                  (panel_x + panel_w, act_y + act_h),
                  (180, 210, 250), 1)
    draw_text(canvas, "Recent Activity", panel_x + 20, act_y + 32, 0.7, TITLE_BLUE, 2)

    row_y = act_y + 64
    if attendance_log:
        recent = attendance_log[-6:]
        for entry in recent:
            if row_y > act_y + act_h - 10:
                break
            raw_name = entry.get("name", "")
            display_name, _sid = format_display_name(raw_name)
            action = entry.get("action", "")
            t_str = entry.get("time", "")
            mp = entry.get("match_percent", None)
            line = f"{display_name}  {action}"
            if mp is not None:
                line += f" ({int(mp)}%)"
            draw_text(canvas, line[:34], panel_x + 20, row_y, 0.55, TEXT_MAIN, 1)
            draw_text(canvas, t_str, panel_x + panel_w - 130, row_y, 0.5, TEXT_MUTED, 1)
            row_y += 24
    else:
        draw_text(canvas, "No recent activity yet", panel_x + 20, row_y, 0.6, TEXT_MUTED, 2)

    # --- TODAY STATS CARD ---
    stats_y = act_y + act_h + 18
    stats_h = 110
    cv2.rectangle(canvas, (panel_x, stats_y),
                  (panel_x + panel_w, stats_y + stats_h),
                  CARD_BG, -1)
    cv2.rectangle(canvas, (panel_x, stats_y),
                  (panel_x + panel_w, stats_y + stats_h),
                  (190, 220, 250), 1)
    draw_text(canvas, "Today's Statistics", panel_x + 20, stats_y + 32, 0.7, AMBER, 2)

    total_entries = len(attendance_log)
    joins = sum(1 for e in attendance_log if e.get("action") == "JOIN")
    lefts = sum(1 for e in attendance_log if e.get("action") == "LEFT")
    returns = sum(1 for e in attendance_log if e.get("action") == "RETURNED")

    draw_text(canvas, f"Total: {total_entries}", panel_x + 20, stats_y + 68, 0.55, TEXT_MAIN, 1)
    draw_text(canvas, f"Joins: {joins}", panel_x + 170, stats_y + 68, 0.55, MINT_GREEN, 1)
    draw_text(canvas, f"Returns: {returns}", panel_x + 320, stats_y + 68, 0.55, SKY_BLUE, 1)
    draw_text(canvas, f"Exits: {lefts}", panel_x + 500, stats_y + 68, 0.55, ORANGE_SOFT, 1)

    # --- BOTTOM CONTROLS STRIP (dark navy) ---
    cv2.rectangle(canvas, (0, 1040), (1920, 1080), (69, 39, 15), -1)
    draw_text(canvas,
              "Controls: Q=Quit | A=Summary | S=Sessions | D=Toggle Mode | SPACE=Manual Capture",
              40, 1068, 0.5, TEXT_MUTED, 1)

    return canvas


def create_dashboard_window(attendance_log, current_sessions):
    """Secondary dashboard window (for second monitor) with AAST blue theme."""
    import numpy as np
    import cv2
    from datetime import datetime

    def format_display_name(name):
        try:
            s = str(name)
            parts = s.split("_")
            if len(parts) > 1 and parts[-1].isdigit():
                sid = parts[-1]
                display_name = " ".join(parts[:-1])
                return display_name, sid
            return s, ""
        except Exception:
            return name, ""

    dash = np.zeros((600, 900, 3), dtype=np.uint8)
    dash[:] = (160, 60, 20)

    def draw_text(img, s, x, y, scale, color, thick=2):
        cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                    scale, color, thick, cv2.LINE_AA)

    SKY_BLUE     = (210, 190, 90)
    TEXT_MAIN    = (240, 246, 255)
    TEXT_MUTED   = (185, 192, 210)
    MINT_GREEN   = (200, 230, 170)
    ORANGE_SOFT  = (180, 200, 210)

    draw_text(dash, "AAST Attendance Dashboard", 40, 40, 1.0, SKY_BLUE, 2)
    cv2.line(dash, (40, 55), (860, 55), (160, 200, 240), 1)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    draw_text(dash, f"Time: {now}", 40, 80, 0.6, TEXT_MUTED, 1)

    # People inside
    y = 120
    draw_text(dash, "People Inside:", 40, y, 0.8, MINT_GREEN, 2)
    y += 30
    if current_sessions:
        for name, session in current_sessions.items():
            if y > 260:
                draw_text(dash, "...and more", 60, y, 0.5, TEXT_MUTED, 1)
                break
            display_name, sid = format_display_name(name)
            start_time = session["start_time"]
            mins = (datetime.now() - start_time).total_seconds() / 60
            if mins >= 60:
                dur = f"{int(mins//60)}h{int(mins%60):02d}m"
            else:
                dur = f"{int(mins)}m"
            draw_text(dash, f"- {display_name}", 60, y, 0.6, TEXT_MAIN, 1)
            draw_text(dash, dur, 500, y, 0.5, TEXT_MUTED, 1)
            y += 24
    else:
        draw_text(dash, "No one currently inside", 60, y, 0.6, TEXT_MUTED, 1)

    # Recent activity
    y = 310
    draw_text(dash, "Recent Activity:", 40, y, 0.8, SKY_BLUE, 2)
    y += 30
    if attendance_log:
        for entry in attendance_log[-10:]:
            if y > 540:
                break
            raw_name = entry.get("name", "")
            display_name, _sid = format_display_name(raw_name)
            a = entry.get("action", "")
            t = entry.get("time", "")
            mp = entry.get("match_percent", None)
            line = f"{t} - {display_name} {a}"
            if mp is not None:
                line += f" ({int(mp)}%)"
            draw_text(dash, line[:70], 60, y, 0.5, TEXT_MAIN, 1)
            y += 22
    else:
        draw_text(dash, "No activity yet", 60, y, 0.6, TEXT_MUTED, 1)

    # Stats footer
    total_entries = len(attendance_log)
    joins = sum(1 for e in attendance_log if e.get("action") == "JOIN")
    lefts = sum(1 for e in attendance_log if e.get("action") == "LEFT")
    returns = sum(1 for e in attendance_log if e.get("action") == "RETURNED")

    draw_text(dash, f"Total: {total_entries}", 40, 580, 0.6, TEXT_MAIN, 1)
    draw_text(dash, f"Joins: {joins}", 240, 580, 0.6, MINT_GREEN, 1)
    draw_text(dash, f"Returns: {returns}", 430, 580, 0.6, SKY_BLUE, 1)
    draw_text(dash, f"Exits: {lefts}", 640, 580, 0.6, ORANGE_SOFT, 1)

    return dash


print("Loading smart auto-detection system...")

# Show course selection window FIRST
if not show_course_selection_window():
    print("No course selected. Exiting...")
    exit(0)

print(f"\nStarting attendance for: {selected_course.get('courseCode')} - {selected_course.get('courseName')}")
print(f"Week {selected_week} | Lecturer: {logged_in_lecturer}")

# Load face encodings
with open("face_encodings.pkl", "rb") as f:
    data = pickle.load(f)
    known_encodings = data["encodings"]
    known_names = data["names"]

print(f"Loaded {len(known_names)} face encodings")
print("Known people:", ", ".join(known_names))

# Initialize models with optimizations
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Optimize MTCNN for better performance
if device == "cuda":
    mtcnn = MTCNN(keep_all=True, device=device, min_face_size=40, thresholds=[0.6, 0.7, 0.7])
else:
    mtcnn = MTCNN(keep_all=True, device=device, min_face_size=60, thresholds=[0.6, 0.7, 0.8])

resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)

# Enable optimizations
if device == "cuda":
    torch.backends.cudnn.benchmark = True

# Enhanced attendance tracking with entry/exit
attendance_log = []
current_sessions = {}  # Track who is currently "inside"
recent_departures = {}  # Track people who left recently (within last 10 minutes)
last_detection = {}    # Prevent duplicate detections within short time
session_counter = 1

# Smart auto-detection tracking
stable_detection_start = None
stability_duration = 2.0  # seconds to hold stable position
last_quality_score = 0
face_positions = []  # Track face stability
max_position_history = 10

# Performance optimization
frame_skip_counter = 0
frame_skip_rate = 3 # Process every 4th frame for face detection (reduced for better reliability)

# Maintain detection state between frames
last_boxes = None
last_in_optimal_zone = False
last_face_data = None
last_quality_score = 0

# Real-time face recognition tracking
continuous_recognition = True  # Enable continuous face name display
recognized_faces = {}  # Store recognized faces with confidence
face_recognition_interval = 10  # Recognize faces every 10 frames for performance

# Face tracking system - analyze only when face changes
face_tracker = {}  # Track face positions and their recognized names
face_change_threshold = 50  # Pixel distance to consider same face
last_face_positions = []  # Store previous frame face positions
current_face_names = {}  # Current frame face names (position -> name)

# Initialize camera
print("\nInitializing camera...")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot open camera")
    exit(1)

# Set optimized camera resolution for better performance and quality
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
cap.set(cv2.CAP_PROP_FPS, 30)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

print("\nSmart Auto-Detection Attendance System Started!")
print("AI-Powered Face Recognition")
print("Full-Screen Professional Interface")
print("Real-time Continuous Face Recognition")
print("Controls:")
print("- POSITION yourself in the optimal zone for auto-capture")
print("- Press Q to quit")
print("- Press A to view attendance summary")
print("- Press S to show current sessions")
print("- Press D to toggle dashboard/fullscreen mode")
print("- Press F to toggle fullscreen mode")
print("- Press C to toggle continuous recognition on/off")
print("- Press SPACE for manual capture (backup)")

# Display mode control
fullscreen_mode = True
show_dashboard = True

# Auto capture message timer
auto_capture_message_timer = None

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Flip frame horizontally for natural mirror effect
        frame = cv2.flip(frame, 1)
        
        # Optimize face detection - process every few frames but maintain state
        frame_skip_counter += 1
        
        auto_capture_ready = False
        optimal_face = None
        quality_score = 0
        current_faces = []  # Store current frame face recognition results
        
        if frame_skip_counter % frame_skip_rate == 0:
            # Smart face detection for positioning (every 2nd frame)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            # Resize frame for faster processing
            scale_factor = 0.4
            small_frame = cv2.resize(rgb_frame, (0, 0), fx=scale_factor, fy=scale_factor)
            boxes, _ = mtcnn.detect(small_frame)
            # Scale boxes back to original size
            if boxes is not None:
                boxes = boxes / scale_factor
                last_boxes = boxes
            else:
                last_boxes = None
            
            # Check face positioning  
            in_optimal_zone, face_data = detect_face_in_optimal_zone(boxes, frame.shape)
            
            # Store state for next frames
            last_in_optimal_zone = in_optimal_zone
            last_face_data = face_data
            
            # Smart face recognition - only analyze when faces change
            if continuous_recognition and boxes is not None:
                # Check if faces have changed compared to last frame
                faces_changed = False
                if len(boxes) != len(last_face_positions):
                    faces_changed = True
                else:
                    for i, box in enumerate(boxes):
                        if i >= len(last_face_positions) or not is_same_face(box, last_face_positions[i]):
                            faces_changed = True
                            break
                
                # Only re-analyze if faces have changed
                if faces_changed or not current_face_names:
                    print("Analyzing faces - change detected")
                    current_face_names = {}  # Clear previous names
                    
                    for i, box in enumerate(boxes):
                        x1, y1, x2, y2 = [int(b) for b in box]
                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                        
                        if x2 <= x1 or y2 <= y1:
                            continue
                        
                        try:
                            # Extract face for recognition
                            face_img = rgb_frame[y1:y2, x1:x2]
                            face_pil = Image.fromarray(face_img)
                            
                            face_tensor = mtcnn(face_pil)
                            if face_tensor is None:
                                continue
                            
                            if len(face_tensor.shape) == 3:
                                face_tensor = face_tensor.unsqueeze(0)
                            
                            face_tensor = face_tensor.to(device)
                            
                            with torch.no_grad():
                                emb = resnet(face_tensor)
                            
                            emb_array = emb.squeeze(0).cpu().numpy()
                            emb_norm = emb_array / (np.linalg.norm(emb_array) + 1e-10)
                            
                            name, similarity = find_best_match(emb_norm)
                            
                            # Store the recognized name for this face position
                            face_key = "face_{}".format(i)
                            current_face_names[face_key] = {
                                "name": name if similarity >= 0.35 else "Unknown",
                                "similarity": similarity,
                                "box": (x1, y1, x2, y2)
                            }
                            
                        except Exception as e:
                            continue
                    
                    # Update last_face_positions for next frame comparison
                    last_face_positions = boxes.copy() if boxes is not None else []
                        
        else:
            # Use previous detection results to maintain continuity
            boxes = last_boxes
            in_optimal_zone = last_in_optimal_zone
            face_data = last_face_data
            quality_score = last_quality_score
            # Still need rgb_frame for face recognition later
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Display persistent face recognition results
        if current_face_names and boxes is not None:
            for i, box in enumerate(boxes):
                face_key = "face_{}".format(i)
                if face_key in current_face_names:
                    face_info = current_face_names[face_key]
                    x1, y1, x2, y2 = [int(b) for b in box]
                    name = face_info["name"]
                    similarity = face_info["similarity"]
                    
                    # Choose color based on recognition confidence
                    if name != "Unknown" and similarity >= 0.5:
                        color = (0, 255, 0)  # Green for good recognition
                    elif name != "Unknown" and similarity >= 0.35:
                        color = (0, 255, 255)  # Yellow for medium recognition
                    else:
                        color = (128, 128, 128)  # Gray for unknown
                    
                    # Draw face rectangle
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    
                    # Display name with clean, large text
                    name_text = name if name != "Unknown" else "Unknown"
                    
                    # Background rectangle for text visibility
                    text_size = cv2.getTextSize(name_text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)[0]
                    cv2.rectangle(frame, (x1, y1-40), (x1 + text_size[0] + 10, y1-5), color, -1)
                    
                    # Name text - larger and cleaner
                    cv2.putText(frame, name_text, (x1+5, y1-15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2, cv2.LINE_AA)
        
        # Draw all detected faces (even if not recognized) with basic info
        elif boxes is not None:
            for box in boxes:
                x1, y1, x2, y2 = [int(b) for b in box]
                cv2.rectangle(frame, (x1, y1), (x2, y2), (128, 128, 128), 1)
                cv2.putText(frame, "Analyzing...", (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 1, cv2.LINE_AA)
        
        # Original optimal zone detection for attendance logging
        if in_optimal_zone:
            optimal_face = face_data
            current_time = datetime.now()
            
            # Track face stability
            face_positions.append((face_data[4], face_data[5], current_time))  # center_x, center_y, time
            
            # Keep only recent positions
            if len(face_positions) > max_position_history:
                face_positions = face_positions[-max_position_history:]
            
            # Check if face has been stable
            if len(face_positions) >= 5:  # Need at least 5 samples
                recent_positions = face_positions[-5:]
                
                # Calculate position variance
                x_positions = [pos[0] for pos in recent_positions]
                y_positions = [pos[1] for pos in recent_positions]
                
                x_variance = np.var(x_positions)
                y_variance = np.var(y_positions)
                
                # Consider stable if variance is low
                is_stable = x_variance < 100 and y_variance < 100
                
                if is_stable:
                    if stable_detection_start is None:
                        stable_detection_start = current_time
                        print(f"\nStable position detected! Hold for {stability_duration} seconds...")
                    
                    # Check if held stable long enough
                    time_stable = (current_time - stable_detection_start).total_seconds()
                    if time_stable >= stability_duration:
                        auto_capture_ready = True
                else:
                    stable_detection_start = None
            
            # Draw positioning guidance
            draw_smart_guidance(frame, boxes, optimal_face, quality_score)
            
            if stable_detection_start:
                time_remaining = stability_duration - (current_time - stable_detection_start).total_seconds()
                if time_remaining > 0:
                    cv2.putText(frame, f"HOLD STEADY: {time_remaining:.1f}s", (50, 200), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1.3, (255, 255, 0), 3, cv2.LINE_AA)
                    
                    # Progress bar for stability
                    progress = 1 - (time_remaining / stability_duration)
                    bar_width = int(300 * progress)
                    cv2.rectangle(frame, (50, 220), (350, 240), (255, 255, 255), 2)
                    cv2.rectangle(frame, (50, 220), (50 + bar_width, 240), (0, 255, 0), -1)
        else:
            # Reset stability tracking
            stable_detection_start = None
            face_positions = []
            
            # Draw guidance even without optimal positioning
            draw_smart_guidance(frame, boxes, None, 0)
        
        # Handle auto-capture
        if auto_capture_ready:
            auto_capture_message_timer = datetime.now()
            
            # Process face recognition
            current_time_str = datetime.now().strftime("%H:%M:%S")
            print(f"\nAuto-detection triggered! Scanning faces at {current_time_str}...")
            
            # Use the boxes we already detected
            if boxes is not None:
                print(f"Detected {len(boxes)} face(s)")
                
                for i, box in enumerate(boxes):
                    x1, y1, x2, y2 = [int(b) for b in box]
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                    
                    if x2 <= x1 or y2 <= y1:
                        continue
                    
                    # Extract face
                    face_img = rgb_frame[y1:y2, x1:x2]
                    face_pil = Image.fromarray(face_img)
                    
                    try:
                        face_tensor = mtcnn(face_pil)
                        if face_tensor is None:
                            continue
                        
                        if len(face_tensor.shape) == 3:
                            face_tensor = face_tensor.unsqueeze(0)
                        
                        face_tensor = face_tensor.to(device)
                        
                        with torch.no_grad():
                            emb = resnet(face_tensor)
                        
                        emb_array = emb.squeeze(0).cpu().numpy()
                        emb_norm = emb_array / (np.linalg.norm(emb_array) + 1e-10)
                        
                        name, similarity = find_best_match(emb_norm)
                        
                        if name != "Unknown" and similarity >= 0.45:
                            # Determine action (JOIN, LEFT, or RETURNED)
                            action = get_current_action(name)
                            
                            # Check for recent duplicate detection
                            current_time_obj = datetime.now()
                            
                            # Prevent duplicate entries for SAME person within 5 seconds  
                            if (name in last_detection and 
                                (current_time_obj - last_detection[name]).seconds < 5):
                                continue  # Skip only for same person within 5 seconds
                            
                            # Handle RETURNED action (person came back within 10 minutes)
                            if action == "RETURNED":
                                print("[RETURNED] {} RETURNED at {} (came back within 10 minutes)".format(name, current_time_obj.strftime("%H:%M:%S")))
                                
                                # Create new session for the returned person
                                current_sessions[name] = {
                                    "start_time": current_time_obj,
                                    "session_id": session_counter
                                }
                                session_counter += 1
                                
                                # Remove from recent departures
                                if name in recent_departures:
                                    del recent_departures[name]
                                
                                # Add to attendance log with RETURNED action
                                attendance_log.append({
                                    "name": name,
                                    "action": action,
                                    "timestamp": current_time_obj.strftime("%Y-%m-%d %H:%M:%S"),
                                    "date": current_time_obj.strftime("%Y-%m-%d"),
                                    "time": current_time_obj.strftime("%H:%M:%S"),
                                    "similarity": round(similarity, 2),
                                    "duration_minutes": None,
                                    "session_id": current_sessions[name]["session_id"]
                                })
                                
                            else:
                                # Normal JOIN/LEFT processing
                                log_attendance(name, similarity, action)
                            
                            # Update last detection time for all successful detections
                            last_detection[name] = current_time_obj
                            
                            # Draw on frame with action-specific colors
                            if action == "JOIN":
                                color = (0, 255, 0)  # Green for JOIN
                                status_text = "JOINING"
                            elif action == "RETURNED":
                                color = (255, 255, 0)  # Cyan for RETURNED
                                status_text = "RETURNED"
                            else:
                                color = (0, 165, 255)  # Orange for LEFT
                                status_text = "LEAVING"
                            
                            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
                            
                            # Display name, action and similarity with better text
                            label = "{} {} ({:.2f})".format(name, status_text, similarity)
                            cv2.putText(frame, label, (x1, y1-10), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2, cv2.LINE_AA)
                            
                            print(" {} - Action: {} - Confidence: {:.2f}".format(name, action, similarity))
                        
                        else:
                            # Unknown person with better text
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                            cv2.putText(frame, "Unknown ({:.2f})".format(similarity), (x1, y1-10), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2, cv2.LINE_AA)
                            
                    except Exception as e:
                        print("Error processing face: {}".format(e))
            
            else:
                print("No faces detected")
            
            # Reset auto-detection
            stable_detection_start = None
            face_positions = []
        
        # Display auto-capture message for a few seconds
        if auto_capture_message_timer and (datetime.now() - auto_capture_message_timer).total_seconds() < 3:
            cv2.putText(frame, "AUTO-CAPTURING!", (50, 200), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 0, 0), 3, cv2.LINE_AA)
        
        # UI overlays with improved text quality
        current_time = datetime.now().strftime("%H:%M:%S")
        cv2.putText(frame, "Time: {}".format(current_time), (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
        
        sessions_count = len(current_sessions)
        cv2.putText(frame, "Currently Inside: {}".format(sessions_count), (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
        
        # Continuous recognition status
        if continuous_recognition:
            cv2.putText(frame, "LIVE RECOGNITION: ON", (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
        else:
            cv2.putText(frame, "LIVE RECOGNITION: OFF", (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (128, 128, 128), 2, cv2.LINE_AA)
        
        # Display interface based on mode
        if fullscreen_mode:
            # Unified full-screen interface
            unified_frame = create_unified_fullscreen_interface(
                frame, attendance_log, current_sessions, quality_score, 
                boxes, optimal_face, stable_detection_start, stability_duration
            )
            cv2.namedWindow("Smart Attendance System - Full Screen", cv2.WINDOW_NORMAL)
            cv2.setWindowProperty("Smart Attendance System - Full Screen", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
            cv2.imshow("Smart Attendance System - Full Screen", unified_frame)
            
            # Close other windows if they exist
            try:
                cv2.destroyWindow("Smart Auto-Detection Attendance System")
                cv2.destroyWindow("Attendance Dashboard")
            except:
                pass
        else:
            # Original dual window mode
            display_frame = cv2.resize(frame, (960, 540))
            cv2.imshow("Smart Auto-Detection Attendance System", display_frame)
            
            if show_dashboard:
                dashboard_frame = create_dashboard_window(attendance_log, current_sessions)
                cv2.imshow("Attendance Dashboard", dashboard_frame)
            
            # Close fullscreen window if it exists
            try:
                cv2.destroyWindow("Smart Attendance System - Full Screen")
            except:
                pass
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord("q"):
            break
        
        # Toggle fullscreen mode
        if key == ord("f"):
            fullscreen_mode = not fullscreen_mode
            cv2.destroyAllWindows()
            if fullscreen_mode:
                print("Switched to Full-Screen Mode")
            else:
                print("Switched to Window Mode")
        
        # Toggle dashboard window (only in window mode)
        if key == ord("d"):
            if not fullscreen_mode:
                show_dashboard = not show_dashboard
                if not show_dashboard:
                    cv2.destroyWindow("Attendance Dashboard")
                    print("Dashboard window hidden")
                else:
                    print("Dashboard window shown")
            else:
                print("Dashboard toggle only available in window mode (Press F to switch)")
        
        # Toggle continuous recognition
        if key == ord("c"):
            continuous_recognition = not continuous_recognition
            status = "ON" if continuous_recognition else "OFF"
            print("Continuous face recognition: {}".format(status))
        
        # Backup manual capture with SPACE
        if key == ord(" "):
            print("\nManual capture at {}...".format(current_time))
            
            # Same face recognition code as auto-detection
            if boxes is not None:
                print(f"Detected {len(boxes)} face(s)")
                # (Same processing logic as in auto-detection)
            else:
                print("No faces detected")
        
        if key == ord("a"):
            print("\nAttendance Summary:")
            if attendance_log:
                recent_entries = attendance_log[-10:]
                for entry in recent_entries:
                    duration_text = " - {:.1f}min".format(entry["duration_minutes"]) if entry["duration_minutes"] else ""
                    print("  {} - {} {}{}".format(entry["timestamp"], entry["name"], entry["action"], duration_text))
            else:
                print("  No attendance entries yet")
        
        if key == ord("s"):
            print("\nCurrent Sessions (People Inside):")
            if current_sessions:
                for name, session in current_sessions.items():
                    elapsed = datetime.now() - session["start_time"]
                    elapsed_minutes = elapsed.total_seconds() / 60
                    hours = int(elapsed_minutes // 60)
                    minutes = int(elapsed_minutes % 60)
                    duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
                    print(f"  {name} - Inside for {duration_str}")
            else:
                print("  No one currently inside")

finally:
    cap.release()
    cv2.destroyAllWindows()
    
    # Save attendance log to CSV
    if attendance_log:
        df = pd.DataFrame(attendance_log)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"smart_attendance_{timestamp}.csv"
        df.to_csv(filename, index=False)
        print(f"\nSmart auto-detection attendance log saved to {filename}")
        
        # Write to Firestore when stopping
        write_to_firestore(attendance_log)
        
        # Show summary statistics
        print("\nSession Summary:")
        print(f"Total entries: {len(attendance_log)}")
        
        # Calculate total time spent per person
        person_totals = {}
        for entry in attendance_log:
            if entry["duration_minutes"]:
                name = entry["name"]
                if name not in person_totals:
                    person_totals[name] = 0
                person_totals[name] += entry["duration_minutes"]
        
        if person_totals:
            print("\nTotal time spent:")
            for name, total_minutes in person_totals.items():
                hours = int(total_minutes // 60)
                minutes = int(total_minutes % 60)
                duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
                print(f"  {name}: {duration_str}")
    
    print("\nSmart auto-detection attendance session ended")

