
cat("Smart Auto-Detection Attendance System\n")
cat("=========================================\n")
cat("Features: AI Auto-Capture + Entry/Exit Tracking\n\n")

# Check if face encodings exist
if (!file.exists("face_encodings.pkl")) {
  cat("Face encodings not found. Run quick_setup.R first.\n")
  stop("Face encodings required")
}

cat("Face encodings found!\n")

# Create smart auto-detection script with entry/exit tracking
python_recognition_script <- '
import cv2
import numpy as np
import pickle
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
from datetime import datetime
import pandas as pd

# Firebase Firestore integration
from firebase_admin import credentials, firestore, initialize_app
import threading
import time

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

def create_unified_fullscreen_interface(frame, attendance_log, current_sessions, quality_score, boxes, optimal_face, stable_detection_start, stability_duration):
    # """Create a unified full-screen interface with camera and dashboard"""
    # Create full HD canvas (1920x1080)
    canvas = np.zeros((1080, 1920, 3), dtype=np.uint8)
    
    # Helper function for high-quality text rendering
    def draw_text_hq(img, text, pos, font_scale, color, thickness=2, font=cv2.FONT_HERSHEY_SIMPLEX):
        # """Draw high-quality text with anti-aliasing"""
        cv2.putText(img, text, pos, font, font_scale, color, thickness, cv2.LINE_AA)
    
    # === LEFT SIDE: CAMERA FEED ===
    camera_width = 1200
    camera_height = 900
    
    # Resize camera frame to fit
    camera_frame = cv2.resize(frame, (camera_width, camera_height))
    canvas[90:990, 60:1260] = camera_frame
    
    # Camera frame border
    cv2.rectangle(canvas, (55, 85), (1265, 995), (255, 255, 255), 3)
    draw_text_hq(canvas, "LIVE CAMERA FEED", (60, 75), 0.9, (255, 255, 255), 2)
    
    # === RIGHT SIDE: CONTROL PANEL ===
    panel_x = 1280
    panel_width = 620
    
    # Header
    draw_text_hq(canvas, "ATTENDANCE CONTROL CENTER", (panel_x, 50), 1.1, (0, 255, 255), 3)
    cv2.line(canvas, (panel_x, 60), (panel_x + 580, 60), (0, 255, 255), 2)
    
    # Current time and status
    current_time = datetime.now().strftime("%H:%M:%S")
    current_date = datetime.now().strftime("%A, %B %d, %Y")
    draw_text_hq(canvas, current_date, (panel_x, 90), 0.7, (255, 255, 255), 2)
    draw_text_hq(canvas, f"Time: {current_time}", (panel_x, 115), 0.9, (0, 255, 0), 2)
    
    # System status indicators
    status_y = 150
    draw_text_hq(canvas, "SYSTEM STATUS:", (panel_x, status_y), 0.8, (255, 165, 0), 2)
    
    # AI Status
    cv2.circle(canvas, (panel_x + 20, status_y + 30), 8, (0, 255, 0), -1)
    draw_text_hq(canvas, "AI Recognition: ACTIVE", (panel_x + 40, status_y + 35), 0.6, (255, 255, 255), 2)
    
    # Auto-detection status
    auto_status_color = (0, 255, 0) if stable_detection_start else (255, 100, 100)
    auto_status_text = "DETECTING" if stable_detection_start else "STANDBY"
    cv2.circle(canvas, (panel_x + 20, status_y + 55), 12, auto_status_color, -1)
    draw_text_hq(canvas, f"Auto-Capture: {auto_status_text}", (panel_x + 40, status_y + 60), 0.8, (255, 255, 255), 3)  
    # Firebase status
    firebase_color = (0, 255, 0) if firestore_available else (0, 0, 255)
    firebase_text = "CONNECTED" if firestore_available else "OFFLINE"
    cv2.circle(canvas, (panel_x + 20, status_y + 80), 8, firebase_color, -1)
    draw_text_hq(canvas, f"Cloud Sync: {firebase_text}", (panel_x + 40, status_y + 85), 0.6, (255, 255, 255), 2)
    
    # === CURRENTLY INSIDE SECTION ===
    inside_y = status_y + 130
    cv2.rectangle(canvas, (panel_x - 10, inside_y - 20), (panel_x + 610, inside_y + 160), (40, 40, 40), -1)
    cv2.rectangle(canvas, (panel_x - 10, inside_y - 20), (panel_x + 610, inside_y + 160), (0, 255, 0), 2)
    
    draw_text_hq(canvas, f"PEOPLE INSIDE ({len(current_sessions)})", (panel_x, inside_y), 0.8, (0, 255, 0), 2)
    
    inside_list_y = inside_y + 30
    if current_sessions:
        for i, (name, session) in enumerate(current_sessions.items()):
            if inside_list_y > inside_y + 130:  # Limit display
                draw_text_hq(canvas, "... and more", (panel_x + 20, inside_list_y), 0.5, (128, 128, 128), 1)
                break
                
            elapsed = datetime.now() - session["start_time"]
            elapsed_minutes = elapsed.total_seconds() / 60
            hours = int(elapsed_minutes // 60)
            minutes = int(elapsed_minutes % 60)
            duration_str = f"{hours}h{minutes:02d}m" if hours > 0 else f"{minutes}m"
            
            # Person indicator
            cv2.circle(canvas, (panel_x + 15, inside_list_y - 5), 6, (0, 255, 0), -1)
            draw_text_hq(canvas, f"{name}", (panel_x + 30, inside_list_y), 0.7, (255, 255, 255), 2)
            draw_text_hq(canvas, f"{duration_str}", (panel_x + 450, inside_list_y), 0.6, (200, 200, 200), 2)
            inside_list_y += 25
    else:
        draw_text_hq(canvas, "No one currently inside", (panel_x + 20, inside_list_y), 0.7, (128, 128, 128), 2)
    
    # === RECENT ACTIVITY SECTION ===
    activity_y = inside_y + 200
    cv2.rectangle(canvas, (panel_x - 10, activity_y - 20), (panel_x + 610, activity_y + 200), (30, 30, 50), -1)
    cv2.rectangle(canvas, (panel_x - 10, activity_y - 20), (panel_x + 610, activity_y + 200), (255, 165, 0), 2)
    
    draw_text_hq(canvas, "RECENT ACTIVITY", (panel_x, activity_y), 0.8, (255, 165, 0), 2)
    
    activity_list_y = activity_y + 30
    if attendance_log:
        recent_entries = attendance_log[-6:]  # Last 6 entries
        for entry in recent_entries:
            if activity_list_y > activity_y + 170:
                break
                

            # Entry details
            time_str = entry[\"time\"]
            name_str = entry[\"name\"]
            action_str = entry[\"action\"]
            
            draw_text_hq(canvas, f"{name_str} {action_str}", (panel_x + 35, activity_list_y), 0.6, (255, 255, 255), 2)
            draw_text_hq(canvas, time_str, (panel_x + 450, activity_list_y), 0.5, (200, 200, 200), 2)
            activity_list_y += 25
    else:
        draw_text_hq(canvas, "No recent activity", (panel_x + 20, activity_list_y), 0.7, (128, 128, 128), 2)
    
    # === STATISTICS SECTION ===
    stats_y = activity_y + 240
    cv2.rectangle(canvas, (panel_x - 10, stats_y - 20), (panel_x + 610, stats_y + 80), (50, 30, 30), -1)
    cv2.rectangle(canvas, (panel_x - 10, stats_y - 20), (panel_x + 610, stats_y + 80), (255, 255, 0), 2)
    
    cv2.putText(canvas, "TODAYS STATISTICS", (panel_x, stats_y), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
    
    total_entries = len(attendance_log)
    total_joins = sum(1 for entry in attendance_log if entry[\"action\"] == \"JOIN\")
    total_lefts = sum(1 for entry in attendance_log if entry[\"action\"] == \"LEFT\")
    total_returned = sum(1 for entry in attendance_log if entry[\"action\"] == \"RETURNED\")
    
    cv2.putText(canvas, f"Total Entries: {total_entries}", (panel_x + 20, stats_y + 30), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.putText(canvas, f"Joins: {total_joins}", (panel_x + 20, stats_y + 50), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    cv2.putText(canvas, f"Returns: {total_returned}", (panel_x + 150, stats_y + 50), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
    cv2.putText(canvas, f"Exits: {total_lefts}", (panel_x + 300, stats_y + 50), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 1)
    
    # === TOP STATUS BAR ===
    cv2.rectangle(canvas, (0, 0), (1920, 30), (20, 20, 20), -1)
    cv2.putText(canvas, "SMART ATTENDANCE SYSTEM", (20, 22), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    
    # Quality indicator in top bar
    if quality_score > 0:
        quality_text = f"Position Quality: {quality_score:.0%}"
        if quality_score >= 0.8:
            quality_color = (0, 255, 0)
        elif quality_score >= 0.5:
            quality_color = (0, 255, 255)
        else:
            quality_color = (0, 165, 255)
        cv2.putText(canvas, quality_text, (1500, 22), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, quality_color, 2)
    
    # === CONTROLS INFO ===
    controls_y = 1040
    cv2.rectangle(canvas, (0, 1030), (1920, 1080), (15, 15, 15), -1)
    cv2.putText(canvas, "CONTROLS: Q=Quit | A=Summary | S=Sessions | D=Toggle Mode | SPACE=Manual Capture", 
               (50, 1055), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
    
    return canvas

def create_dashboard_window(attendance_log, current_sessions):
    # """Create a separate dashboard window for dual-screen mode"""
    dashboard = np.ones((600, 800, 3), dtype=np.uint8) * 50  # Dark gray background
    
    # Title
    cv2.putText(dashboard, "ATTENDANCE DASHBOARD", (50, 40), 
               cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.line(dashboard, (50, 60), (750, 60), (255, 255, 255), 2)
    
    # Current time
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(dashboard, f"Time: {current_time}", (50, 90), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 1)
    
    # Currently inside section
    cv2.putText(dashboard, "CURRENTLY INSIDE:", (50, 130), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    
    y_pos = 160
    if current_sessions:
        for name, session in current_sessions.items():
            elapsed = datetime.now() - session["start_time"]
            elapsed_minutes = elapsed.total_seconds() / 60
            hours = int(elapsed_minutes // 60)
            minutes = int(elapsed_minutes % 60)
            duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
            
            cv2.circle(dashboard, (70, y_pos - 5), 8, (0, 255, 0), -1)
            cv2.putText(dashboard, f"{name} - Inside for {duration_str}", (90, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            y_pos += 30
    else:
        cv2.putText(dashboard, "No one currently inside", (70, y_pos), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 1)
    
    # Recent activity section
    y_pos = max(y_pos + 30, 280)
    cv2.putText(dashboard, "RECENT ACTIVITY:", (50, y_pos), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 165, 0), 2)
    y_pos += 40
    
    if attendance_log:
        recent_entries = attendance_log[-8:]
        for entry in recent_entries:
        
            time_str = entry[\"time\"]
            name_str = entry[\"name\"]
            action_str = entry[\"action\"]
            
            text = f"{name_str} {action_str} at {time_str}"
            cv2.putText(dashboard, text, (100, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y_pos += 25
            
            if y_pos > 550:
                break
    else:
        cv2.putText(dashboard, "No recent activity", (70, y_pos), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 1)
    
    # Statistics
    total_entries = len(attendance_log)
    currently_inside = len(current_sessions)
    
    cv2.putText(dashboard, f"Total Entries: {total_entries}", (50, 570), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 1)
    cv2.putText(dashboard, f"Inside: {currently_inside}", (400, 570), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
    
    return dashboard

# Smart auto-detection using face positioning and stability
def detect_face_in_optimal_zone(boxes, frame_shape, stability_threshold=0.02):
    # """Detect if face is in optimal position for auto-capture"""
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
    # """Draw smart positioning guidance with high-quality text"""
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
    draw_text_camera(frame, \"OPTIMAL ZONE\", (zone_left, zone_top - 10), 0.8, (0, 255, 255), 2)
    
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
                    draw_text_camera(frame, "MOVE RIGHT →", (x1, y2 + 25), 0.7, color, 2)
                elif face_center_x > zone_right:
                    draw_text_camera(frame, "← MOVE LEFT", (x1, y2 + 25), 0.7, color, 2)
                
                if face_center_y < zone_top:
                    draw_text_camera(frame, "MOVE DOWN ↓", (x1, y1 - 35), 0.7, color, 2)
                elif face_center_y > zone_bottom:
                    draw_text_camera(frame, "↑ MOVE UP", (x1, y1 - 35), 0.7, color, 2)
                
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

def read_firestore_attendance():
    # """Read all attendance records from Firestore at startup"""
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
            print(f"  {record[\'timestamp\']} - {record[\'name\']} {record[\'action\']}")
        
        return firestore_records
    except Exception as e:
        print(f"Error reading from Firestore: {e}")
        return []

def write_to_firestore(attendance_log):
    # """Write attendance log to Firestore when stopping"""
    if not firestore_available or not attendance_log:
        return
    
    try:
        print("\\n💾 Writing to Firestore...")
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
            
            doc_ref = db.collection("attendance").document()
            batch.set(doc_ref, doc_data)
        
        batch.commit()
        print(f"Successfully wrote {len(attendance_log)} records to Firestore")
        
    except Exception as e:
        print(f"Error writing to Firestore: {e}")

print("Loading smart auto-detection system...")

# Read existing attendance from Firestore
existing_records = read_firestore_attendance()

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

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def find_best_match(face_encoding, threshold=0.45):
    similarities = [cosine_similarity(face_encoding, known_enc) for known_enc in known_encodings]
    best_idx = np.argmax(similarities)
    best_similarity = similarities[best_idx]
    
    if best_similarity >= threshold:
        return known_names[best_idx], best_similarity
    else:
        return "Unknown", best_similarity

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
frame_skip_rate = 1  # Process every 2nd frame for face detection (reduced for better reliability)

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

def get_current_action(person_name):
    # """Determine if this should be JOIN, LEFT, or potential RETURNED"""
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
    duration = end_time - start_time
    return duration.total_seconds() / 60

def is_same_face(pos1, pos2, threshold=50):
    if pos1 is None or pos2 is None:
        return False
    center1_x, center1_y = (pos1[0] + pos1[2]) // 2, (pos1[1] + pos1[3]) // 2
    center2_x, center2_y = (pos2[0] + pos2[2]) // 2, (pos2[1] + pos2[3]) // 2
    distance = ((center1_x - center2_x)**2 + (center1_y - center2_y)**2)**0.5
    return distance < threshold

def log_attendance(name, similarity, action):
    global session_counter
    
    timestamp = datetime.now()
    duration_minutes = None
    session_id = None
    
def log_attendance(name, similarity, action):
    global session_counter
    
    timestamp = datetime.now()
    duration_minutes = None
    session_id = None
    
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
    
    attendance_log.append({
        "name": name,
        "action": action,
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "date": timestamp.strftime("%Y-%m-%d"),
        "time": timestamp.strftime("%H:%M:%S"),
        "similarity": round(similarity, 2),
        "duration_minutes": round(duration_minutes, 1) if duration_minutes else None,
        "session_id": session_id
    })

# Initialize camera
print("\\nInitializing camera...")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot open camera")
    exit(1)

# Set optimized camera resolution for better performance and quality
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
cap.set(cv2.CAP_PROP_FPS, 30)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

print("\\n Smart Auto-Detection Attendance System Started!")
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
            small_frame = cv2.resize(rgb_frame, (0, 0), fx=0.5, fy=0.5)
            boxes, _ = mtcnn.detect(small_frame)
            # Scale boxes back to original size
            if boxes is not None:
                boxes = boxes * 2
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
                    print(\"Analyzing faces - change detected\")
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
                            face_key = \"face_{}\".format(i)
                            current_face_names[face_key] = {
                                \"name\": name if similarity >= 0.35 else \"Unknown\",
                                \"similarity\": similarity,
                                \"box\": (x1, y1, x2, y2)
                            }
                            
                        except Exception as e:
                            continue
                    
                    # Update last_face_positions for next frame comparison
                    last_face_positions = boxes.copy() if boxes is not None else []
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
                        
                        if similarity >= 0.35:  # Lower threshold for continuous recognition
                            current_faces.append({
                                "name": name,
                                "similarity": similarity,
                                "box": (x1, y1, x2, y2),
                                "face_id": i
                            })
                    
                    except Exception as e:
                        continue
                        
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
                face_key = \"face_{}\".format(i)
                if face_key in current_face_names:
                    face_info = current_face_names[face_key]
                    x1, y1, x2, y2 = [int(b) for b in box]
                    name = face_info[\"name\"]
                    similarity = face_info[\"similarity\"]
                    
                    # Choose color based on recognition confidence
                    if name != \"Unknown\" and similarity >= 0.5:
                        color = (0, 255, 0)  # Green for good recognition
                    elif name != \"Unknown\" and similarity >= 0.35:
                        color = (0, 255, 255)  # Yellow for medium recognition
                    else:
                        color = (128, 128, 128)  # Gray for unknown
                    
                    # Draw face rectangle
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    
                    # Display name with clean, large text
                    name_text = name if name != \"Unknown\" else \"Unknown\"
                    
                    # Background rectangle for text visibility
                    text_size = cv2.getTextSize(name_text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)[0]
                    cv2.rectangle(frame, (x1, y1-40), (x1 + text_size[0] + 10, y1-5), color, -1)
                    
                    # Name text - larger and cleaner
                    cv2.putText(frame, name_text, (x1+5, y1-15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2, cv2.LINE_AA)
            for face_info in current_faces:
                x1, y1, x2, y2 = face_info["box"]
                name = face_info["name"]
                similarity = face_info["similarity"]
                
                # Choose color based on recognition confidence
                if name != "Unknown" and similarity >= 0.5:
                    color = (0, 255, 0)  # Green for good recognition
                    confidence_text = "CONFIDENT"
                elif name != "Unknown" and similarity >= 0.35:
                    color = (0, 255, 255)  # Yellow for medium recognition
                    confidence_text = "POSSIBLE"
                else:
                    color = (0, 165, 255)  # Orange for unknown
                    confidence_text = "UNKNOWN"
                
                # Draw face rectangle
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                # Display name with larger, more visible text
                name_text = name if name != "Unknown" else "Unknown Person"
                
                # Background rectangle for text visibility
                text_size = cv2.getTextSize(name_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
                cv2.rectangle(frame, (x1, y1-35), (x1 + text_size[0] + 10, y1-5), color, -1)
                
                # Name text
                cv2.putText(frame, name_text, (x1+5, y1-15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
                
                # Confidence indicator
                conf_text = "({:.0%})".format(similarity)
                cv2.putText(frame, conf_text, (x1, y2+20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
                
                # Real-time speaking indicator (if face is large enough, likely talking)
                face_area = (x2-x1) * (y2-y1)
                if face_area > 15000:  # Large face suggests person is close/talking
                    cv2.putText(frame, "SPEAKING", (x1, y2+45), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2, cv2.LINE_AA)
        
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
                        print(f"\\n Stable position detected! Hold for {stability_duration} seconds...")
                    
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
            # Trigger face capture with better text
            # Add this near the top with other global variables
            auto_capture_message_timer = None

            # In the auto-capture section, replace the putText with:
            if auto_capture_ready:
                auto_capture_message_timer = datetime.now()

            # Then, in the UI overlays section (after the continuous recognition status), add:
            if auto_capture_message_timer and (datetime.now() - auto_capture_message_timer).total_seconds() < 3:
                cv2.putText(frame, "AUTO-CAPTURING!", (50, 200), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 0, 0), 3, cv2.LINE_AA)
            
            # Process face recognition
            current_time_str = datetime.now().strftime("%H:%M:%S")
            print(f"\\nAuto-detection triggered! Scanning faces at {current_time_str}...")
            
            # Use the boxes we already detected
            if boxes is not None:
                print(f"🔍 Detected {len(boxes)} face(s)")
                
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
                print("👤 No faces detected")
            
            # Reset auto-detection
            stable_detection_start = None
            face_positions = []
        
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
        
        # Removed positioning instruction text for cleaner display
        
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
                print("📺 Switched to Full-Screen Mode")
            else:
                print("📱 Switched to Window Mode")
        
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
            print("\\n📸 Manual capture at {}...".format(current_time))
            
            # Same face recognition code as auto-detection
            if boxes is not None:
                print(f"🔍 Detected {len(boxes)} face(s)")
                # (Same processing logic as in auto-detection)
            else:
                print("👤 No faces detected")
        
        if key == ord("a"):
            print("\\n📊 Attendance Summary:")
            if attendance_log:
                recent_entries = attendance_log[-10:]
                for entry in recent_entries:
                    duration_text = " - {:.1f}min".format(entry["duration_minutes"]) if entry["duration_minutes"] else ""
                    print("  {} - {} {}{}".format(entry["timestamp"], entry["name"], entry["action"], duration_text))
            else:
                print("  No attendance entries yet")
        
        if key == ord("s"):
            print("\\n👥 Current Sessions (People Inside):")
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
        print(f"\\n💾 Smart auto-detection attendance log saved to {filename}")
        
        # Write to Firestore when stopping
        write_to_firestore(attendance_log)
        
        # Show summary statistics
        print("\\n📈 Session Summary:")
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
            print("\\nTotal time spent:")
            for name, total_minutes in person_totals.items():
                hours = int(total_minutes // 60)
                minutes = int(total_minutes % 60)
                duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
                print(f"  {name}: {duration_str}")
    
    print("\\nSmart auto-detection attendance session ended")
'

# Write and run the recognition script
writeLines(python_recognition_script, "face_recognition.py")
cat("Created smart auto-detection face_recognition.py\n")

cat("Starting smart auto-detection...\n")


# Add required packages (no extra dependencies needed)
system2("conda", args = c("run", "-n", "faceenv", "pip", "install", "pandas", "firebase-admin"),
        stdout = FALSE, stderr = FALSE)

# Run the recognition script
system2("conda", args = c("run", "-n", "faceenv", "python", "face_recognition.py"))

cat("\nSmart auto-detection completed!\n")