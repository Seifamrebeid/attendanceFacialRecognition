# api_server.R
# REST API Server for React Integration
#
# This script creates a production-ready REST API that connects to your
# face recognition system and Firestore, allowing React to:
# - Start/stop face recognition sessions
# - Get real-time attendance data
# - Query attendance records from Firestore
#
# Run with: Rscript api_server.R
# Or: plumber::pr_run(plumber::pr("R/api_server.R"), port=8000)

library(plumber)
library(jsonlite)

# ============================================================================
# CONFIGURATION
# ============================================================================

#' @apiTitle Face Recognition Attendance API
#' @apiDescription REST API for React website integration with face recognition
#' @apiVersion 1.0.0

# Global configuration
API_PORT <- 8000
PYTHON_SCRIPT_PATH <- "generated/face_recognition_api.py"
SERVICE_JSON_PATH <- "service.json"
FACE_ENCODINGS_PATH <- "face_encodings.pkl"

# ============================================================================
# CORS SETTINGS (Allow React to connect)
# ============================================================================

#* @filter cors
cors <- function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  
  plumber::forward()
}

# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

#* Health check endpoint
#* @get /api/health
function() {
  list(
    status = "healthy",
    timestamp = Sys.time(),
    service = "Face Recognition API",
    version = "1.0.0"
  )
}

#* Check system readiness (face encodings, Firebase, etc.)
#* @get /api/ready
function() {
  checks <- list(
    face_encodings = file.exists(FACE_ENCODINGS_PATH),
    firebase_credentials = file.exists(SERVICE_JSON_PATH),
    python_available = system2("python", "--version", stdout = TRUE, stderr = TRUE) != ""
  )
  
  all_ready <- all(unlist(checks))
  
  list(
    ready = all_ready,
    checks = checks,
    timestamp = Sys.time()
  )
}

# ============================================================================
# COURSE ENDPOINTS
# ============================================================================

#* Get all courses from Firestore
#* @get /api/courses
function(res) {
  tryCatch({
    # Execute Python script to fetch courses
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import firebase_admin\n",
        "from firebase_admin import credentials, firestore\n",
        "import json\n",
        "try:\n",
        "    cred = credentials.Certificate('", SERVICE_JSON_PATH, "')\n",
        "    if not firebase_admin._apps:\n",
        "        firebase_admin.initialize_app(cred)\n",
        "    db = firestore.client()\n",
        "    docs = db.collection('courses').stream()\n",
        "    courses = []\n",
        "    for doc in docs:\n",
        "        data = doc.to_dict()\n",
        "        data['id'] = doc.id\n",
        "        courses.append(data)\n",
        "    print(json.dumps(courses))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    courses <- fromJSON(result)
    list(success = TRUE, data = courses)
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

#* Get a specific course by ID
#* @param id Course document ID
#* @get /api/courses/<id>
function(id, res) {
  tryCatch({
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import firebase_admin\n",
        "from firebase_admin import credentials, firestore\n",
        "import json\n",
        "try:\n",
        "    cred = credentials.Certificate('", SERVICE_JSON_PATH, "')\n",
        "    if not firebase_admin._apps:\n",
        "        firebase_admin.initialize_app(cred)\n",
        "    db = firestore.client()\n",
        "    doc = db.collection('courses').document('", id, "').get()\n",
        "    if doc.exists:\n",
        "        data = doc.to_dict()\n",
        "        data['id'] = doc.id\n",
        "        print(json.dumps(data))\n",
        "    else:\n",
        "        print(json.dumps({'error': 'Course not found'}))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    course <- fromJSON(result)
    
    if (!is.null(course$error)) {
      res$status <- 404
      return(list(success = FALSE, error = course$error))
    }
    
    list(success = TRUE, data = course)
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

#* Validate lecturer credentials
#* @param courseId Course document ID
#* @param username Lecturer username
#* @param password Lecturer password
#* @post /api/auth/login
function(courseId, username, password, res) {
  tryCatch({
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import firebase_admin\n",
        "from firebase_admin import credentials, firestore\n",
        "import json\n",
        "try:\n",
        "    cred = credentials.Certificate('", SERVICE_JSON_PATH, "')\n",
        "    if not firebase_admin._apps:\n",
        "        firebase_admin.initialize_app(cred)\n",
        "    db = firestore.client()\n",
        "    doc = db.collection('courses').document('", courseId, "').get()\n",
        "    if doc.exists:\n",
        "        data = doc.to_dict()\n",
        "        if data.get('lecturerUsername') == '", username, "' and data.get('lecturerPassword') == '", password, "':\n",
        "            print(json.dumps({'authenticated': True, 'lecturerName': data.get('lecturerName'), 'courseCode': data.get('courseCode'), 'courseName': data.get('courseName')}))\n",
        "        else:\n",
        "            print(json.dumps({'authenticated': False, 'error': 'Invalid credentials'}))\n",
        "    else:\n",
        "        print(json.dumps({'authenticated': False, 'error': 'Course not found'}))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'authenticated': False, 'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    auth_result <- fromJSON(result)
    
    if (!auth_result$authenticated) {
      res$status <- 401
    }
    
    list(success = auth_result$authenticated, data = auth_result)
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

# ============================================================================
# ATTENDANCE ENDPOINTS
# ============================================================================

#* Get attendance records with optional filters
#* @param courseCode Optional filter by course code
#* @param weekNumber Optional filter by week number
#* @param date Optional filter by date (YYYY-MM-DD)
#* @param limit Maximum records to return (default 100)
#* @get /api/attendance
function(courseCode = NULL, weekNumber = NULL, date = NULL, limit = 100, res) {
  tryCatch({
    # Build filter conditions
    filters <- ""
    if (!is.null(courseCode)) {
      filters <- paste0(filters, ".where('courseCode', '==', '", courseCode, "')")
    }
    if (!is.null(weekNumber)) {
      filters <- paste0(filters, ".where('weekNumber', '==', ", weekNumber, ")")
    }
    if (!is.null(date)) {
      filters <- paste0(filters, ".where('date', '==', '", date, "')")
    }
    
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import firebase_admin\n",
        "from firebase_admin import credentials, firestore\n",
        "import json\n",
        "try:\n",
        "    cred = credentials.Certificate('", SERVICE_JSON_PATH, "')\n",
        "    if not firebase_admin._apps:\n",
        "        firebase_admin.initialize_app(cred)\n",
        "    db = firestore.client()\n",
        "    query = db.collection('attendance')", filters, ".limit(", limit, ")\n",
        "    docs = query.stream()\n",
        "    records = []\n",
        "    for doc in docs:\n",
        "        data = doc.to_dict()\n",
        "        data['id'] = doc.id\n",
        "        records.append(data)\n",
        "    print(json.dumps(records, default=str))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    records <- fromJSON(result)
    list(success = TRUE, data = records, count = length(records))
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

#* Record a single attendance entry (real-time)
#* @param studentName Name of the student
#* @param courseId Course document ID
#* @param courseCode Course code
#* @param courseName Course name
#* @param weekNumber Week number (1-16)
#* @param action Action type (JOIN, LEFT, RETURNED)
#* @param similarity Face match similarity score
#* @post /api/attendance
function(studentName, courseId, courseCode, courseName, weekNumber, action, similarity, res) {
  tryCatch({
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import firebase_admin\n",
        "from firebase_admin import credentials, firestore\n",
        "from datetime import datetime\n",
        "import json\n",
        "try:\n",
        "    cred = credentials.Certificate('", SERVICE_JSON_PATH, "')\n",
        "    if not firebase_admin._apps:\n",
        "        firebase_admin.initialize_app(cred)\n",
        "    db = firestore.client()\n",
        "    now = datetime.now()\n",
        "    doc_data = {\n",
        "        'studentName': '", studentName, "',\n",
        "        'courseId': '", courseId, "',\n",
        "        'courseCode': '", courseCode, "',\n",
        "        'courseName': '", courseName, "',\n",
        "        'weekNumber': ", weekNumber, ",\n",
        "        'action': '", action, "',\n",
        "        'similarity': ", similarity, ",\n",
        "        'timestamp': now.isoformat(),\n",
        "        'date': now.strftime('%Y-%m-%d'),\n",
        "        'time': now.strftime('%H:%M:%S'),\n",
        "        'dayOfWeek': now.strftime('%A'),\n",
        "        'createdAt': now.isoformat()\n",
        "    }\n",
        "    doc_ref = db.collection('attendance').add(doc_data)\n",
        "    print(json.dumps({'success': True, 'id': doc_ref[1].id}))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'success': False, 'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    save_result <- fromJSON(result)
    
    if (!save_result$success) {
      res$status <- 500
      return(list(success = FALSE, error = save_result$error))
    }
    
    list(success = TRUE, data = save_result)
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

# ============================================================================
# FACE RECOGNITION ENDPOINTS
# ============================================================================

#* Start a face recognition session
#* @param courseId Course document ID
#* @param weekNumber Week number (1-16)
#* @post /api/recognition/start
function(courseId, weekNumber, res) {
  tryCatch({
    # Check prerequisites
    if (!file.exists(FACE_ENCODINGS_PATH)) {
      res$status <- 400
      return(list(success = FALSE, error = "Face encodings not found. Run setup first."))
    }
    
    # Generate session ID
    session_id <- format(Sys.time(), "%Y%m%d_%H%M%S")
    
    # Store session info (in production, use Redis or similar)
    Sys.setenv(
      CURRENT_SESSION_ID = session_id,
      CURRENT_COURSE_ID = courseId,
      CURRENT_WEEK = weekNumber
    )
    
    list(
      success = TRUE,
      data = list(
        sessionId = session_id,
        courseId = courseId,
        weekNumber = weekNumber,
        status = "ready",
        message = "Recognition session initialized. Use /api/recognition/frame to process frames."
      )
    )
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

#* Process a single frame for face recognition
#* @param image Base64 encoded image from webcam
#* @post /api/recognition/frame
#* @serializer unboxedJSON
function(req, res) {
  tryCatch({
    # Get the image data from request body
    body <- req$body
    image_data <- body$image
    
    if (is.null(image_data)) {
      res$status <- 400
      return(list(success = FALSE, error = "No image data provided"))
    }
    
    # Process frame with Python face recognition
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import cv2\n",
        "import numpy as np\n",
        "import pickle\n",
        "import torch\n",
        "import base64\n",
        "import json\n",
        "from facenet_pytorch import MTCNN, InceptionResnetV1\n",
        "from PIL import Image\n",
        "import io\n",
        "\n",
        "def cosine_similarity(a, b):\n",
        "    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))\n",
        "\n",
        "try:\n",
        "    # Decode base64 image\n",
        "    image_data = '", gsub("\n", "", image_data), "'\n",
        "    if ',' in image_data:\n",
        "        image_data = image_data.split(',')[1]\n",
        "    image_bytes = base64.b64decode(image_data)\n",
        "    nparr = np.frombuffer(image_bytes, np.uint8)\n",
        "    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)\n",
        "    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)\n",
        "    \n",
        "    # Load face encodings\n",
        "    with open('", FACE_ENCODINGS_PATH, "', 'rb') as f:\n",
        "        data = pickle.load(f)\n",
        "        known_encodings = data['encodings']\n",
        "        known_names = data['names']\n",
        "    \n",
        "    # Initialize models\n",
        "    device = 'cuda' if torch.cuda.is_available() else 'cpu'\n",
        "    mtcnn = MTCNN(keep_all=True, device=device)\n",
        "    resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)\n",
        "    \n",
        "    # Detect faces\n",
        "    boxes, _ = mtcnn.detect(rgb_frame)\n",
        "    \n",
        "    results = []\n",
        "    if boxes is not None:\n",
        "        for box in boxes:\n",
        "            x1, y1, x2, y2 = [int(b) for b in box]\n",
        "            x1, y1 = max(0, x1), max(0, y1)\n",
        "            x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)\n",
        "            \n",
        "            face_img = rgb_frame[y1:y2, x1:x2]\n",
        "            face_pil = Image.fromarray(face_img)\n",
        "            \n",
        "            face_tensor = mtcnn(face_pil)\n",
        "            if face_tensor is None:\n",
        "                continue\n",
        "            \n",
        "            if len(face_tensor.shape) == 3:\n",
        "                face_tensor = face_tensor.unsqueeze(0)\n",
        "            \n",
        "            face_tensor = face_tensor.to(device)\n",
        "            \n",
        "            with torch.no_grad():\n",
        "                emb = resnet(face_tensor)\n",
        "            \n",
        "            emb_array = emb.squeeze(0).cpu().numpy()\n",
        "            emb_norm = emb_array / (np.linalg.norm(emb_array) + 1e-10)\n",
        "            \n",
        "            # Find best match\n",
        "            similarities = [cosine_similarity(emb_norm, known_enc) for known_enc in known_encodings]\n",
        "            best_idx = np.argmax(similarities)\n",
        "            best_similarity = similarities[best_idx]\n",
        "            \n",
        "            if best_similarity >= 0.45:\n",
        "                name = known_names[best_idx]\n",
        "            else:\n",
        "                name = 'Unknown'\n",
        "            \n",
        "            results.append({\n",
        "                'name': name,\n",
        "                'similarity': float(best_similarity),\n",
        "                'box': [x1, y1, x2, y2],\n",
        "                'recognized': best_similarity >= 0.45\n",
        "            })\n",
        "    \n",
        "    print(json.dumps({'success': True, 'faces': results, 'faceCount': len(results)}))\n",
        "    \n",
        "except Exception as e:\n",
        "    print(json.dumps({'success': False, 'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    recognition_result <- fromJSON(result)
    
    if (!recognition_result$success) {
      res$status <- 500
      return(list(success = FALSE, error = recognition_result$error))
    }
    
    list(
      success = TRUE,
      data = recognition_result
    )
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

#* Get list of known faces (enrolled students)
#* @get /api/recognition/known-faces
function(res) {
  tryCatch({
    if (!file.exists(FACE_ENCODINGS_PATH)) {
      res$status <- 400
      return(list(success = FALSE, error = "Face encodings not found"))
    }
    
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import pickle\n",
        "import json\n",
        "try:\n",
        "    with open('", FACE_ENCODINGS_PATH, "', 'rb') as f:\n",
        "        data = pickle.load(f)\n",
        "        names = data['names']\n",
        "    print(json.dumps({'success': True, 'names': list(set(names)), 'count': len(set(names))}))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'success': False, 'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    known_faces <- fromJSON(result)
    list(success = TRUE, data = known_faces)
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

# ============================================================================
# REPORTS ENDPOINTS
# ============================================================================

#* Get attendance report for a course/week
#* @param courseCode Course code
#* @param weekNumber Week number
#* @get /api/reports/weekly
function(courseCode, weekNumber, res) {
  tryCatch({
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import firebase_admin\n",
        "from firebase_admin import credentials, firestore\n",
        "import json\n",
        "from collections import defaultdict\n",
        "try:\n",
        "    cred = credentials.Certificate('", SERVICE_JSON_PATH, "')\n",
        "    if not firebase_admin._apps:\n",
        "        firebase_admin.initialize_app(cred)\n",
        "    db = firestore.client()\n",
        "    docs = db.collection('attendance').where('courseCode', '==', '", courseCode, "').where('weekNumber', '==', ", weekNumber, ").stream()\n",
        "    \n",
        "    students = defaultdict(lambda: {'joins': 0, 'lefts': 0, 'times': []})\n",
        "    for doc in docs:\n",
        "        data = doc.to_dict()\n",
        "        name = data.get('studentName', 'Unknown')\n",
        "        action = data.get('action', '')\n",
        "        if action == 'JOIN':\n",
        "            students[name]['joins'] += 1\n",
        "        elif action == 'LEFT':\n",
        "            students[name]['lefts'] += 1\n",
        "        students[name]['times'].append(data.get('time', ''))\n",
        "    \n",
        "    report = {\n",
        "        'courseCode': '", courseCode, "',\n",
        "        'weekNumber': ", weekNumber, ",\n",
        "        'totalStudents': len(students),\n",
        "        'students': dict(students)\n",
        "    }\n",
        "    print(json.dumps(report, default=str))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    report <- fromJSON(result)
    list(success = TRUE, data = report)
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

#* Get attendance summary for entire semester
#* @param courseCode Course code
#* @get /api/reports/semester
function(courseCode, res) {
  tryCatch({
    result <- system2(
      "python",
      args = c("-c", shQuote(paste0(
        "import firebase_admin\n",
        "from firebase_admin import credentials, firestore\n",
        "import json\n",
        "from collections import defaultdict\n",
        "try:\n",
        "    cred = credentials.Certificate('", SERVICE_JSON_PATH, "')\n",
        "    if not firebase_admin._apps:\n",
        "        firebase_admin.initialize_app(cred)\n",
        "    db = firestore.client()\n",
        "    docs = db.collection('attendance').where('courseCode', '==', '", courseCode, "').stream()\n",
        "    \n",
        "    weekly_data = defaultdict(lambda: defaultdict(int))\n",
        "    students = set()\n",
        "    total_records = 0\n",
        "    \n",
        "    for doc in docs:\n",
        "        data = doc.to_dict()\n",
        "        week = data.get('weekNumber', 0)\n",
        "        name = data.get('studentName', 'Unknown')\n",
        "        action = data.get('action', '')\n",
        "        \n",
        "        students.add(name)\n",
        "        total_records += 1\n",
        "        \n",
        "        if action == 'JOIN':\n",
        "            weekly_data[week][name] = 1  # Mark as present\n",
        "    \n",
        "    # Calculate attendance percentage per student\n",
        "    student_attendance = {}\n",
        "    for student in students:\n",
        "        weeks_present = sum(1 for week_data in weekly_data.values() if student in week_data)\n",
        "        student_attendance[student] = {\n",
        "            'weeksPresent': weeks_present,\n",
        "            'totalWeeks': len(weekly_data),\n",
        "            'percentage': round(weeks_present / max(len(weekly_data), 1) * 100, 1)\n",
        "        }\n",
        "    \n",
        "    report = {\n",
        "        'courseCode': '", courseCode, "',\n",
        "        'totalWeeks': len(weekly_data),\n",
        "        'totalStudents': len(students),\n",
        "        'totalRecords': total_records,\n",
        "        'studentAttendance': student_attendance\n",
        "    }\n",
        "    print(json.dumps(report, default=str))\n",
        "except Exception as e:\n",
        "    print(json.dumps({'error': str(e)}))\n"
      ))),
      stdout = TRUE,
      stderr = FALSE
    )
    
    report <- fromJSON(result)
    list(success = TRUE, data = report)
    
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = e$message)
  })
}

# ============================================================================
# RUN THE SERVER
# ============================================================================

# Main entry point when script is run directly
if (!interactive()) {
  cat("===========================================\n")
  cat("Face Recognition Attendance API Server\n")
  cat("===========================================\n")
  cat(sprintf("Starting server on port %d...\n", API_PORT))
  cat("\nAPI Endpoints:\n")
  cat("  GET  /api/health              - Health check\n")
  cat("  GET  /api/ready               - System readiness check\n")
  cat("  GET  /api/courses             - List all courses\n")
  cat("  GET  /api/courses/<id>        - Get course by ID\n")
  cat("  POST /api/auth/login          - Validate lecturer credentials\n")
  cat("  GET  /api/attendance          - Get attendance records\n")
  cat("  POST /api/attendance          - Record attendance entry\n")
  cat("  POST /api/recognition/start   - Start recognition session\n")
  cat("  POST /api/recognition/frame   - Process webcam frame\n")
  cat("  GET  /api/recognition/known-faces - List enrolled students\n")
  cat("  GET  /api/reports/weekly      - Weekly attendance report\n")
  cat("  GET  /api/reports/semester    - Semester attendance summary\n")
  cat("\n")
  cat(sprintf("React can connect at: http://localhost:%d\n", API_PORT))
  cat("===========================================\n\n")
  
  # Create and run the API
  pr <- plumber::pr("api_server.R")
  pr$run(port = API_PORT, host = "0.0.0.0")
}
