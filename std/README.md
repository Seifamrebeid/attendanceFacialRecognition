# Face Recognition Attendance System

A web-based face recognition attendance system with a Python FastAPI backend and React frontend.

## 🎯 Features

- **Live Webcam Feed**: Capture face directly from browser
- **Face Recognition**: Identify users using FaceNet deep learning model
- **Confirmation Flow**: User confirms their identity before recording attendance
- **Personalized Greeting**: Shows welcome message with name and student ID

## 📁 Project Structure

```
std/
├── backend/
│   ├── main.py              # FastAPI server with face recognition
│   └── requirements.txt     # Python dependencies
├── src/
│   ├── App.jsx              # Main React component
│   ├── App.css              # Styles
│   └── main.jsx             # Entry point
├── index.html
├── vite.config.js
└── README.md
```

## 🚀 Quick Start

### 1. Setup Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment (optional)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy face encodings from the python folder
cp ../../python/encodings.npy ./
cp ../../python/names.npy ./
```

### 2. Start Backend Server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://127.0.0.1:8000`

### 3. Start Frontend

```bash
# From the std folder
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## 📸 How It Works

1. **Start Scanning**: Click the "Start Scanning" button to open your webcam
2. **Position Face**: Center your face in the video frame
3. **Capture**: Click "Capture & Recognize" to process your face
4. **Review**: If recognized, review your name and student ID
5. **Confirm**: Click "Yes, Confirm" to record attendance
6. **Greeting**: See personalized welcome message

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/api/recognize` | POST | Process face image (base64) |
| `/api/confirm` | POST | Confirm attendance |
| `/api/status` | GET | System status |

### Example: Recognize Face

```javascript
const response = await fetch("http://127.0.0.1:8000/api/recognize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image: "data:image/jpeg;base64,..." })
});

// Response:
{
  "success": true,
  "recognized": true,
  "name": "John",
  "student_id": "STD-1234",
  "similarity": 0.87,
  "message": "Face recognized with 87% confidence"
}
```

## 📋 Prerequisites

- Python 3.9+
- Node.js 18+
- Face encodings (run `encode_dataset.py` in the `python/` folder first)

## 🔧 Configuration

The face recognition threshold is set to 0.45 (45% confidence) by default. You can adjust this in `backend/main.py`:

```python
threshold = 0.45  # Adjust as needed
```

## 🎨 Tech Stack

- **Frontend**: React + Vite
- **Backend**: FastAPI (Python)
- **Face Detection**: MTCNN
- **Face Recognition**: FaceNet (InceptionResnetV1)
- **Similarity Search**: scikit-learn NearestNeighbors

## 🐛 Troubleshooting

### "Models not loaded"
- Ensure `encodings.npy` and `names.npy` are in the `backend/` folder
- Check that PyTorch and facenet-pytorch are installed

### "No face detected"
- Ensure good lighting
- Position face clearly in frame
- Try moving closer to camera

### CORS errors
- Make sure backend is running on port 8000
- Check that `http://localhost:5173` is in allowed origins
