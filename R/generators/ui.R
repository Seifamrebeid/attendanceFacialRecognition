# python_generator_ui.R
# Generate UI rendering Python code
#
# This module generates the Python code for user interface elements
# including the unified fullscreen interface and dashboard window.

#' Generate UI Python Code
#'
#' @description Generates the complete UI rendering Python code
#'              including fullscreen interface and dashboard functions
#' @return Character string containing Python code for UI rendering
#' @export
generate_ui_code <- function() {
  code <- '
def create_unified_fullscreen_interface(frame, attendance_log, current_sessions, quality_score, boxes, optimal_face, stable_detection_start, stability_duration):
    """Create a unified full-screen interface with camera and dashboard"""
    # Create full HD canvas (1920x1080)
    canvas = np.zeros((1080, 1920, 3), dtype=np.uint8)
    
    # Helper function for high-quality text rendering
    def draw_text_hq(img, text, pos, font_scale, color, thickness=2, font=cv2.FONT_HERSHEY_SIMPLEX):
        """Draw high-quality text with anti-aliasing"""
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
    
    # Course and Week Info - NEW
    session_info = get_session_info_text()
    draw_text_hq(canvas, session_info, (panel_x, 85), 0.8, (255, 255, 0), 2)
    
    # Current time and status
    current_time = datetime.now().strftime("%H:%M:%S")
    current_date = datetime.now().strftime("%A, %B %d, %Y")
    draw_text_hq(canvas, current_date, (panel_x, 110), 0.7, (255, 255, 255), 2)
    draw_text_hq(canvas, f"Time: {current_time}", (panel_x, 135), 0.9, (0, 255, 0), 2)
    
    # System status indicators
    status_y = 165
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
            time_str = entry["time"]
            name_str = entry["name"]
            action_str = entry["action"]
            
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
    total_joins = sum(1 for entry in attendance_log if entry["action"] == "JOIN")
    total_lefts = sum(1 for entry in attendance_log if entry["action"] == "LEFT")
    total_returned = sum(1 for entry in attendance_log if entry["action"] == "RETURNED")
    
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
    """Create a separate dashboard window for dual-screen mode"""
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
            time_str = entry["time"]
            name_str = entry["name"]
            action_str = entry["action"]
            
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
'
  
  return(code)
}
