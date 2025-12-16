import { useState, useRef, useCallback, useEffect } from "react";
import "./App.css";
import AttendancePage from "./attendancePage";

/**
 * Face Recognition Attendance App (fixed)
 *
 * Fixes:
 * - More robust startCamera: prefers a detected device, uses `ideal` deviceId, waits for loadedmetadata & play()
 * - Better capture: checks readyState and video dimensions, fallback canvas sizing
 * - Safer cleanup and retry handling
 */

const API_URL = "http://127.0.0.1:8000";

const STATES = {
  IDLE: "idle",
  SCANNING: "scanning",
  LOADING: "loading",
  RECOGNIZED: "recognized",
  NOT_RECOGNIZED: "not_recognized",
  CONFIRMED: "confirmed",
  ERROR: "error",
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [appState, setAppState] = useState(STATES.IDLE);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [studentNameID, setStudentNameID] = useState(null);
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraInfo, setCameraInfo] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Helper: choose a good video device (prefer known label if available)
  const choosePreferredDevice = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      // Try to prefer a camera with 'HP Full-HD Camera' label (adjust as needed)
      const preferred = videoInputs.find(
        (d) => d.label && d.label.includes("HP Full-HD Camera")
      );
      return preferred || videoInputs[0] || null;
    } catch (err) {
      // enumerateDevices may fail before permissions are granted
      return null;
    }
  }, []);

  const startCamera = useCallback(async (attemptNumber = 0) => {
    const maxRetries = 3;
    setVideoReady(false);
    setRetryAttempts(attemptNumber);

    const progressiveConstraints = [
      { video: { width: 640, height: 480, facingMode: "user" }, audio: false },
      { video: { width: 320, height: 240, facingMode: "user" }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ];

    const currentConstraint =
      progressiveConstraints[
        Math.min(attemptNumber, progressiveConstraints.length - 1)
      ];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support getUserMedia");
      }

      // Clean up any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Try to pick a specific deviceId (ideal) if available
      let finalConstraints = currentConstraint;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        const preferred = videoInputs.find(
          (d) => d.label && d.label.includes("HP Full-HD Camera")
        );
        if (preferred && preferred.deviceId) {
          finalConstraints = {
            video: {
              ...(currentConstraint.video || {}),
              deviceId: { ideal: preferred.deviceId },
            },
            audio: false,
          };
          if (currentConstraint.video && currentConstraint.video.width) {
            finalConstraints.video.width = currentConstraint.video.width;
          }
          if (currentConstraint.video && currentConstraint.video.height) {
            finalConstraints.video.height = currentConstraint.video.height;
          }
        }
      } catch (e) {
        // ignore enumerate errors
      }

      // Request permission / stream (with timeout)
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia(finalConstraints),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Camera timeout")), 10000)
        ),
      ]);

      // IMPORTANT: switch UI to SCANNING first so the <video> element is mounted
      setAppState(STATES.SCANNING);

      // Wait for the video element to be available (it is rendered only in SCANNING)
      // Poll for videoRef.current - timeout after ~3s
      const waitForVideo = async (timeoutMs = 3000) => {
        const start = Date.now();
        while (!videoRef.current && Date.now() - start < timeoutMs) {
          // small delay to let React mount the element
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, 50));
        }
        return !!videoRef.current;
      };

      const mounted = await waitForVideo(3000);
      if (!mounted) {
        // If video DOM not present, clean up and throw to trigger retry/failure handling
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("Video element did not mount in time");
      }

      // Now attach stream to the mounted video element
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        streamRef.current = stream;

        video.muted = true;
        video.playsInline = true;

        // make the element visible (you control CSS visibility via videoReady too)
        video.style.visibility = "visible";
        video.style.opacity = "1";
        video.style.zIndex = "999";

        // Detect first frame: prefer requestVideoFrameCallback, fallback to events
        let frameSeen = false;
        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback(() => {
            frameSeen = true;
            setVideoReady(true);
            console.log("requestVideoFrameCallback: first frame seen");
          });
        } else {
          const onFrame = () => {
            if (frameSeen) return;
            frameSeen = true;
            setVideoReady(true);
            console.log("video event: frame-like event seen");
          };
          video.addEventListener("loadeddata", onFrame, { once: true });
          video.addEventListener("canplay", onFrame, { once: true });
          video.addEventListener("playing", onFrame, { once: true });
        }

        // Try to play (handle rejection)
        try {
          const p = video.play();
          if (p && typeof p.then === "function") {
            p.catch((e) => console.warn("video.play() rejected:", e));
          }
        } catch (e) {
          console.warn("video.play() error:", e);
        }

        // Final fallback: if no frame after 700ms, check track state and mark ready if live
        setTimeout(() => {
          if (!frameSeen) {
            const track = stream.getVideoTracks()[0];
            const maybeActive = track && track.readyState === "live";
            console.warn(
              "no frame seen yet; track readyState:",
              track?.readyState
            );
            if (maybeActive) {
              setVideoReady(true);
              console.log(
                "fallback: marking videoReady=true because track is live"
              );
            }
          }
        }, 700);
      }

      setError("");
      setRetryAttempts(0);
    } catch (err) {
      console.error(`Camera attempt ${attemptNumber + 1} failed:`, err);
      setVideoReady(false);

      // Cleanup on failure
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Retry if attempts left
      if (attemptNumber < 3) {
        setError(`Camera failed, retrying... (attempt ${attemptNumber + 1}/4)`);
        setTimeout(() => startCamera(attemptNumber + 1), 1000);
        return;
      }

      // Final error message
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setError(
          "Camera access denied. Please allow camera in site settings and refresh the page."
        );
      } else if (err.name === "NotFoundError") {
        setError(
          "No camera found. Please check device connection and refresh the page."
        );
      } else if (err.message && err.message.includes("timeout")) {
        setError("Camera timeout. Please refresh the page and try again.");
      } else {
        setError(`Camera error: ${err.message || err.name || err}`);
      }
      setAppState(STATES.ERROR);
    }
  }, []);

  // Diagnostic: check mediaDevices and permissions
  const diagnoseCamera = useCallback(async () => {
    const info = {
      supported: !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ),
      permissionState: null,
      details: null,
    };

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: "camera" });
        info.permissionState = perm.state;
        perm.onchange = () =>
          setCameraInfo((prev) => ({ ...prev, permissionState: perm.state }));
      } catch (e) {
        try {
          const perm2 = await navigator.permissions.query({
            name: "microphone",
          });
          info.permissionState = `${perm2.state} (queried microphone as fallback)`;
        } catch (e2) {
          info.details = e.message || String(e2 || e);
        }
      }
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      info.details = info.details
        ? `${info.details} | devices enumerated`
        : "devices enumerated";
      setCameraInfo(info);
      console.log("Devices:", devices);
    } catch (e) {
      setCameraInfo(info);
    }

    return info;
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    setVideoReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Capture frame and send for recognition
  const captureAndRecognize = useCallback(
    async (e) => {
      if (!videoRef.current || !canvasRef.current || isProcessing) return;

      setIsProcessing(true);
      setAppState(STATES.LOADING);

      try {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        // Wait a tick if video isn't quite ready
        if (video.readyState < 2) {
          // readyState 2 = HAVE_CURRENT_DATA
          // give a short grace period
          await new Promise((res) => setTimeout(res, 250));
        }

        // Validate readiness and dimensions
        if (video.readyState < 2) {
          throw new Error("Video not ready. Please wait for camera to load.");
        }
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        if (!width || !height) {
          throw new Error(
            "Video dimensions not available. Camera may not be working."
          );
        }

        // Set canvas to video size
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw mirrored frame if video is mirrored in CSS - drawing image takes the actual pixels
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Generate base64 data URL
        const imageData = canvas.toDataURL("image/jpeg", 0.9);

        if (!imageData || imageData === "data:," || imageData.length < 100) {
          throw new Error("Failed to capture valid image from video");
        }

        console.log("Captured image length:", imageData.length);

        const response = await fetch(`${API_URL}/api/recognize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData }),
        });

        const result = await response.json();

        console.log("Recognition success:", result.image_filename);
        if (result.success && result.recognized) {
          setRecognitionResult(result);
          setStudentNameID(result.image_filename);
          setAppState(STATES.RECOGNIZED);
          console.log("Recognized student:", studentNameID);
        } else {
          setRecognitionResult(result);
          setAppState(STATES.NOT_RECOGNIZED);
        }
      } catch (err) {
        console.error("captureAndRecognize error:", err);
        setError(`Recognition failed: ${err.message || err}`);
        setAppState(STATES.ERROR);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing]
  );

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
          similarity: recognitionResult.similarity,
        }),
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
      setError(`Confirmation failed: ${err.message || err}`);
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
      {/* <h1 className="app-title"> Student portal </h1> */}

      {appState === STATES.IDLE && (
        <div className="state-container idle-state">
          <div className="welcome-icon">👤</div>
          <h2>Welcome!</h2>
          <p>Click the button below to start face recognition</p>

          {cameraInfo && (
            <div className="camera-info">
              <h3>Camera Status:</h3>
              <ul>
                <li>Supported: {cameraInfo.supported ? "✅ Yes" : "❌ No"}</li>
                {cameraInfo.permissionState && (
                  <li>Permission: {cameraInfo.permissionState}</li>
                )}
                {cameraInfo.details && <li>Details: {cameraInfo.details}</li>}
              </ul>
            </div>
          )}

          <div className="button-group">
            <button className="primary-btn" onClick={() => startCamera(0)}>
              📷 Start Scanning
            </button>
            <button className="secondary-btn" onClick={diagnoseCamera}>
              🔍 Check Camera
            </button>
          </div>
        </div>
      )}

      {(appState === STATES.SCANNING || appState === STATES.LOADING) && (
        <div className="state-container scanning-state">
          <div
            className="video-container"
            style={{ width: "640px", maxWidth: "100%" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-feed"
              style={{
                width: "100%",
                height: "360px",
                objectFit: "cover",
                backgroundColor: "#000",
                transform: "scaleX(-1)", // mirror for UX
                visibility: videoReady ? "visible" : "hidden",
                opacity: videoReady ? 1 : 0.25,
              }}
              onError={(e) => console.error("Video element error:", e)}
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
            <p className={`video-status ${videoReady ? "ready" : "loading"}`}>
              Camera:{" "}
              {videoReady
                ? "✅ Ready"
                : `⏳ Loading...${
                    retryAttempts ? ` (Attempt ${retryAttempts + 1})` : ""
                  }`}
            </p>
          </div>

          <div className="button-group">
            <button
              className="primary-btn"
              onClick={captureAndRecognize}
              disabled={
                isProcessing || appState === STATES.LOADING || !videoReady
              }
            >
              {isProcessing ? "⏳ Processing..." : "📸 Capture & Recognize"}
            </button>
            <button className="secondary-btn" onClick={resetApp}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

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

      {appState === STATES.NOT_RECOGNIZED && (
        <div className="state-container not-recognized-state">
          <div className="warning-icon">⚠️</div>
          <h2>Face Not Recognized</h2>
          <p>
            {recognitionResult?.message ||
              "Your face was not found in the database."}
          </p>

          {recognitionResult?.similarity && (
            <p className="similarity-info">
              Best match confidence:{" "}
              {(recognitionResult.similarity * 100).toFixed(0)}%
              <br />
              <small>(Needs at least 45% to recognize)</small>
            </p>
          )}

          <div className="button-group">
            <button className="primary-btn" onClick={() => startCamera(0)}>
              🔄 Try Again
            </button>
            <button className="secondary-btn" onClick={resetApp}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {appState === STATES.CONFIRMED && (
        <AttendancePage studentNameID={studentNameID} />
      )}

      {appState === STATES.ERROR && (
        <div className="state-container error-state">
          <div className="error-icon">❌</div>
          <h2>Something went wrong</h2>
          <p className="error-message">{error}</p>

          <div className="button-group">
            <button className="primary-btn" onClick={resetApp}>
              🔄 Start Over
            </button>
            {error.includes("Camera") && (
              <button className="secondary-btn" onClick={() => startCamera(0)}>
                📷 Retry Camera
              </button>
            )}
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>Face Recognition Attendance System v1.0</p>
      </footer>
    </div>
  );
}

export default App;
