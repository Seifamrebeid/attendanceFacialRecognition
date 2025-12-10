# python_generator_ui.R
# Generate UI rendering Python code (bright AAST blue modern dashboard)

#' Generate UI Python Code
#'
#' @return Character string containing Python code for UI rendering
#' @export
generate_ui_code <- function() {
  code <- '
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

    # ---------- COLORS (AAST BRIGHT BLUE PALETTE, BGR) ----------
    # Background & cards (from hex: #0B1E39, #132A4A)
    BG_DARK      = (57, 30, 11)    # deep blue
    CARD_BG      = (74, 42, 19)    # navy blue
    # Borders & accents (from hex: #1B6FFF, #27C3FF, #00E4A8, etc.)
    BORDER_SOFT  = (255, 111, 27)  # bright AAST blue
    TITLE_BLUE   = (255, 195, 39)  # sky blue
    SKY_BLUE     = (255, 195, 39)  # same as title
    TURQ_GLOW    = (255, 242, 0)   # turquoise glow
    MINT_GREEN   = (168, 228, 0)   # success / active
    AMBER        = (94, 196, 255)  # warning
    ORANGE_SOFT  = (97, 111, 255)  # exits / alerts
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
    # TOP TITLE BAR
    # ==============================
    cv2.rectangle(canvas, (0, 0), (1920, 70), (40, 40, 70), -1)

    # place logo on top-left if available
    if logo_img is not None:
        try:
            logo_h, logo_w = logo_img.shape[:2]
            target_h = 50
            scale = target_h / float(logo_h)
            target_w = int(logo_w * scale)
            logo_resized = cv2.resize(logo_img, (target_w, target_h))
            if logo_resized.shape[2] == 4:
                alpha = logo_resized[:, :, 3] / 255.0
                rgb = logo_resized[:, :, :3]
                roi = canvas[10:10+target_h, 30:30+target_w]
                for c in range(3):
                    roi[:, :, c] = (alpha * rgb[:, :, c] +
                                    (1 - alpha) * roi[:, :, c])
                canvas[10:10+target_h, 30:30+target_w] = roi
            else:
                canvas[10:10+target_h, 30:30+target_w] = logo_resized
        except Exception:
            pass

    draw_text(canvas, "AAST Smart Attendance System", 120, 45, 1.0, TITLE_BLUE, 2)

    # Quality indicator on top-right
    if quality_score > 0:
        qx1, qy1 = 1350, 25
        bar_w = int(190 * min(1.0, max(0.0, quality_score)))
        cv2.rectangle(canvas, (qx1 - 10, qy1 - 20),
                      (qx1 + 230, qy1 + 15), (35, 40, 70), -1)
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
    label_bg = (60, 80, 110)
    cv2.rectangle(canvas, (cam_x, cam_y - 38),
                  (cam_x + 240, cam_y - 10), label_bg, -1)
    dot_color = MINT_GREEN if int(datetime.now().timestamp() * 2) % 2 == 0 else (60, 110, 90)
    cv2.circle(canvas, (cam_x + 20, cam_y - 24), 8, dot_color, -1)
    draw_text(canvas, "LIVE CAMERA FEED", cam_x + 40, cam_y - 20, 0.7, TEXT_MAIN, 2)

    # INFO BAR under camera
    info_y = cam_y + cam_h + 40
    cv2.rectangle(canvas, (cam_x - 10, info_y - 30),
                  (cam_x + cam_w + 10, info_y + 10),
                  (30, 35, 60), -1)
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
                  (35, 60, 80), -1)
    cv2.circle(canvas, (pill_x1 + 18, pill_y1 + 14), 6, MINT_GREEN, -1)
    draw_text(canvas, "Recording \\u2022 Live", pill_x1 + 32, pill_y1 + 19, 0.5, TEXT_MAIN, 1)

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
                      (30, 35, 65), -1)
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
                  (90, 190, 150), 1)
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
                  (120, 160, 230), 1)
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
                  (200, 210, 110), 1)
    draw_text(canvas, "Today\'s Statistics", panel_x + 20, stats_y + 32, 0.7, AMBER, 2)

    total_entries = len(attendance_log)
    joins = sum(1 for e in attendance_log if e.get("action") == "JOIN")
    lefts = sum(1 for e in attendance_log if e.get("action") == "LEFT")
    returns = sum(1 for e in attendance_log if e.get("action") == "RETURNED")

    draw_text(canvas, f"Total: {total_entries}", panel_x + 20, stats_y + 68, 0.55, TEXT_MAIN, 1)
    draw_text(canvas, f"Joins: {joins}", panel_x + 170, stats_y + 68, 0.55, MINT_GREEN, 1)
    draw_text(canvas, f"Returns: {returns}", panel_x + 320, stats_y + 68, 0.55, SKY_BLUE, 1)
    draw_text(canvas, f"Exits: {lefts}", panel_x + 500, stats_y + 68, 0.55, ORANGE_SOFT, 1)

    # --- BOTTOM CONTROLS STRIP ---
    cv2.rectangle(canvas, (0, 1040), (1920, 1080), (25, 25, 45), -1)
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
    dash[:] = (35, 45, 65)

    def draw_text(img, s, x, y, scale, color, thick=2):
        cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                    scale, color, thick, cv2.LINE_AA)

    SKY_BLUE     = (255, 195, 39)
    TEXT_MAIN    = (240, 246, 255)
    TEXT_MUTED   = (185, 192, 210)
    MINT_GREEN   = (168, 228, 0)
    ORANGE_SOFT  = (97, 111, 255)

    draw_text(dash, "AAST Attendance Dashboard", 40, 40, 1.0, SKY_BLUE, 2)
    cv2.line(dash, (40, 55), (860, 55), (120, 140, 210), 1)

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
'
  return(code)
}
