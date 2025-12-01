import { useState, useRef, useCallback, useEffect } from "react";
import "./App.css";

/**
 * Face Recognition Attendance App
 * 
 * Flow:
 * 1. Open webcam and scan face
 * 2. Show loading state while processing
 * 3. Display recognized name and ID
 * 4. Confirm button to finalize
 * 5. Show greeting message
 */

const API_URL = "http://127.0.0.1:8000";

// App states
const STATES = {
  IDLE: "idle",
  SCANNING: "scanning",
  LOADING: "loading",
  RECOGNIZED: "recognized",
  NOT_RECOGNIZED: "not_recognized",
  CONFIRMED: "confirmed",
  ERROR: "error"
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [appState, setAppState] = useState(STATES.IDLE);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      
      setAppState(STATES.SCANNING);
      setError("");
    } catch (err) {
      setError("Could not access camera. Please allow camera permissions.");
      setAppState(STATES.ERROR);
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Capture frame and send for recognition
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    setIsProcessing(true);
    setAppState(STATES.LOADING);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      
      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      
      // Send to API
      const response = await fetch(`${API_URL}/api/recognize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData })
      });
      
      const result = await response.json();
      
      if (result.success && result.recognized) {
        setRecognitionResult(result);
        setAppState(STATES.RECOGNIZED);
      } else {
        setRecognitionResult(result);
        setAppState(STATES.NOT_RECOGNIZED);
      }
      
    } catch (err) {
      setError(`Recognition failed: ${err.message}`);
      setAppState(STATES.ERROR);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // Confirm attendance
  const confirmAttendance = useCallback(async () => {
    if (!recognitionResult) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_URL}/api/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: recognitionResult.student_id,
          name: recognitionResult.name,
          similarity: recognitionResult.similarity
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGreeting(result.greeting);
        setAppState(STATES.CONFIRMED);
        stopCamera();
      } else {
        setError(result.message);
        setAppState(STATES.ERROR);
      }
      
    } catch (err) {
      setError(`Confirmation failed: ${err.message}`);
      setAppState(STATES.ERROR);
    } finally {
      setIsProcessing(false);
    }
  }, [recognitionResult, stopCamera]);

  // Reset to initial state
  const resetApp = useCallback(() => {
    setAppState(STATES.IDLE);
    setRecognitionResult(null);
    setGreeting("");
    setError("");
    stopCamera();
  }, [stopCamera]);

  // Retry scanning
  const retryScan = useCallback(() => {
    setRecognitionResult(null);
    setError("");
    setAppState(STATES.SCANNING);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="app-container">
      <h1 className="app-title">🎯 Face Recognition Attendance</h1>
      
      {/* IDLE State - Start Button */}
      {appState === STATES.IDLE && (
        <div className="state-container idle-state">
          <div className="welcome-icon">👤</div>
          <h2>Welcome!</h2>
          <p>Click the button below to start face recognition</p>
          <button className="primary-btn" onClick={startCamera}>
            📷 Start Scanning
          </button>
        </div>
      )}
      
      {/* SCANNING State - Camera Feed */}
      {(appState === STATES.SCANNING || appState === STATES.LOADING) && (
        <div className="state-container scanning-state">
          <div className="video-container">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="video-feed"
            />
            {appState === STATES.LOADING && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Recognizing face...</p>
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} style={{ display: "none" }} />
          
          <div className="scan-instructions">
            <p>Position your face in the center of the frame</p>
            <p className="hint">Make sure your face is well-lit</p>
          </div>
          
          <div className="button-group">
            <button 
              className="primary-btn" 
              onClick={captureAndRecognize}
              disabled={isProcessing || appState === STATES.LOADING}
            >
              {isProcessing ? "⏳ Processing..." : "📸 Capture & Recognize"}
            </button>
            <button className="secondary-btn" onClick={resetApp}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* RECOGNIZED State - Show Result */}
      {appState === STATES.RECOGNIZED && recognitionResult && (
        <div className="state-container recognized-state">
          <div className="success-icon">✅</div>
          <h2>Face Recognized!</h2>
          
          <div className="result-card">
            <div className="result-item">
              <span className="label">Name:</span>
              <span className="value">{recognitionResult.name}</span>
            </div>
            <div className="result-item">
              <span className="label">Student ID:</span>
              <span className="value">{recognitionResult.student_id}</span>
            </div>
            <div className="result-item">
              <span className="label">Confidence:</span>
              <span className="value confidence">
                {(recognitionResult.similarity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          
          <p className="confirm-prompt">Is this you?</p>
          
          <div className="button-group">
            <button 
              className="primary-btn confirm-btn" 
              onClick={confirmAttendance}
              disabled={isProcessing}
            >
              {isProcessing ? "⏳ Confirming..." : "✓ Yes, Confirm"}
            </button>
            <button className="secondary-btn" onClick={retryScan}>
              ↩ No, Try Again
            </button>
          </div>
        </div>
      )}
      
      {/* NOT RECOGNIZED State */}
      {appState === STATES.NOT_RECOGNIZED && (
        <div className="state-container not-recognized-state">
          <div className="warning-icon">⚠️</div>
          <h2>Face Not Recognized</h2>
          <p>{recognitionResult?.message || "Your face was not found in the database."}</p>
          
          {recognitionResult?.similarity && (
            <p className="similarity-info">
              Best match confidence: {(recognitionResult.similarity * 100).toFixed(0)}%
              <br />
              <small>(Needs at least 45% to recognize)</small>
            </p>
          )}
          
          <div className="button-group">
            <button className="primary-btn" onClick={retryScan}>
              🔄 Try Again
            </button>
            <button className="secondary-btn" onClick={resetApp}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* CONFIRMED State - Show Greeting */}
      {appState === STATES.CONFIRMED && (
        <div className="state-container confirmed-state">
          <div className="celebration-icon">🎉</div>
          <div className="greeting-box">
            <pre>{greeting}</pre>
          </div>
          <p className="success-message">Your attendance has been recorded!</p>
          <button className="primary-btn" onClick={resetApp}>
            🏠 Done
          </button>
        </div>
      )}
      
      {/* ERROR State */}
      {appState === STATES.ERROR && (
        <div className="state-container error-state">
          <div className="error-icon">❌</div>
          <h2>Something went wrong</h2>
          <p className="error-message">{error}</p>
          <button className="primary-btn" onClick={resetApp}>
            🔄 Start Over
          </button>
        </div>
      )}
      
      {/* Footer */}
      <footer className="app-footer">
        <p>Face Recognition Attendance System v1.0</p>
      </footer>
    </div>
  );
}

export default App;
