# python_generator_main.R
# Generate main Python application loop code
#
# This module generates the Python code for the main application,
# including camera initialization, the main loop, and cleanup.

#' Generate Python Imports
#'
#' @description Generates the import statements for the Python script
#' @return Character string containing Python import statements
#' @export
generate_imports <- function() {
  code <- '
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
'
  
  return(code)
}

#' Generate Main Python Code
#'
#' @description Generates the main Python application loop code
#'              including camera initialization, frame processing, and cleanup
#' @return Character string containing Python code for main application
#' @export
generate_main_code <- function() {
  code <- '
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
            auto_capture_message_timer = datetime.now()
            
            # Process face recognition
            current_time_str = datetime.now().strftime("%H:%M:%S")
            print(f"\\nAuto-detection triggered! Scanning faces at {current_time_str}...")
            
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
            print("\\n Manual capture at {}...".format(current_time))
            
            # Same face recognition code as auto-detection
            if boxes is not None:
                print(f"Detected {len(boxes)} face(s)")
                # (Same processing logic as in auto-detection)
            else:
                print("No faces detected")
        
        if key == ord("a"):
            print("\\n Attendance Summary:")
            if attendance_log:
                recent_entries = attendance_log[-10:]
                for entry in recent_entries:
                    duration_text = " - {:.1f}min".format(entry["duration_minutes"]) if entry["duration_minutes"] else ""
                    print("  {} - {} {}{}".format(entry["timestamp"], entry["name"], entry["action"], duration_text))
            else:
                print("  No attendance entries yet")
        
        if key == ord("s"):
            print("\\n Current Sessions (People Inside):")
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
        print(f"\\n Smart auto-detection attendance log saved to {filename}")
        
        # Write to Firestore when stopping
        write_to_firestore(attendance_log)
        
        # Show summary statistics
        print("\\n Session Summary:")
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
  
  return(code)
}
