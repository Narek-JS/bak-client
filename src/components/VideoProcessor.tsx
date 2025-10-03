import React, { useEffect, useRef, useState } from "react";

interface DetectionResult {
  id: number;
  label: string;
  box: [number, number, number, number]; // [x, y, width, height]
  confidence?: number;
}

interface VideoProcessorState {
  isCameraActive: boolean;
  isWebSocketConnected: boolean;
  error: string | null;
  detectionResults: DetectionResult[];
}

const VideoProcessor: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [state, setState] = useState<VideoProcessorState>({
    isCameraActive: false,
    isWebSocketConnected: false,
    error: null,
    detectionResults: [],
  });

  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setState((prev) => ({ ...prev, isCameraActive: true, error: null }));

        // Start MediaRecorder
        startMediaRecorder(stream);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Camera access denied or not available",
        isCameraActive: false,
      }));
      console.error("Camera initialization failed:", error);
    }
  };

  // Start MediaRecorder
  const startMediaRecorder = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          webSocketRef.current?.readyState === WebSocket.OPEN
        ) {
          webSocketRef.current.send(event.data);
        }
      };

      mediaRecorder.start(500); // Send chunks every 500ms
    } catch (error) {
      console.error("MediaRecorder initialization failed:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to initialize video recording",
      }));
    }
  };

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    try {
      const ws = new WebSocket("ws://localhost:5000/ws");
      webSocketRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({
          ...prev,
          isWebSocketConnected: true,
          error: null,
        }));
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            setState((prev) => ({ ...prev, detectionResults: data }));
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        setState((prev) => ({ ...prev, isWebSocketConnected: false }));
        console.log("WebSocket disconnected");
      };

      ws.onerror = (error) => {
        setState((prev) => ({
          ...prev,
          error: "WebSocket connection failed",
          isWebSocketConnected: false,
        }));
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to establish WebSocket connection",
      }));
      console.error("WebSocket initialization failed:", error);
    }
  };

  // Canvas rendering loop
  const renderCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw detection results
    drawDetections(ctx, state.detectionResults, canvas.width, canvas.height);

    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(renderCanvas);
  };

  // Draw bounding boxes and labels
  const drawDetections = (
    ctx: CanvasRenderingContext2D,
    detections: DetectionResult[],
    canvasWidth: number,
    canvasHeight: number
  ) => {
    detections.forEach((detection) => {
      const [x, y, width, height] = detection.box;

      // Scale coordinates to canvas size
      const scaledX = (x / 640) * canvasWidth; // Assuming model outputs 640x640
      const scaledY = (y / 640) * canvasHeight;
      const scaledWidth = (width / 640) * canvasWidth;
      const scaledHeight = (height / 640) * canvasHeight;

      // Draw bounding box
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw label background
      const label = `${detection.label}${
        detection.confidence
          ? ` (${(detection.confidence * 100).toFixed(1)}%)`
          : ""
      }`;
      const labelWidth = ctx.measureText(label).width + 8;
      const labelHeight = 20;

      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      ctx.fillRect(scaledX, scaledY - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = "#000000";
      ctx.font = "12px Arial";
      ctx.fillText(label, scaledX + 4, scaledY - 6);
    });
  };

  // Cleanup function
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
  };

  // Initialize everything on mount
  useEffect(() => {
    initializeCamera();
    initializeWebSocket();

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start rendering loop when camera is active
  useEffect(() => {
    if (state.isCameraActive && videoRef.current && canvasRef.current) {
      videoRef.current.onloadedmetadata = () => {
        renderCanvas();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isCameraActive]);

  // Handle back navigation
  const handleBack = () => {
    cleanup();
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Live Camera Processing
          </h1>
          <p className="text-gray-400 mt-1">Real-time AI object detection</p>
        </div>

        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center space-x-6 mb-6">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              state.isCameraActive ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm">
            Camera: {state.isCameraActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              state.isWebSocketConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm">
            WebSocket:{" "}
            {state.isWebSocketConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm">
            Detections: {state.detectionResults.length}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-400">{state.error}</p>
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        {/* Overlay when camera is not active */}
        {!state.isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-400">Camera not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Detection Results */}
      {state.detectionResults.length > 0 && (
        <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Detection Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.detectionResults.map((detection, index) => (
              <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-400">
                    {detection.label}
                  </span>
                  {detection.confidence && (
                    <span className="text-sm text-gray-400">
                      {(detection.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  <div>ID: {detection.id}</div>
                  <div>Box: [{detection.box.join(", ")}]</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>Allow camera access to start real-time processing</p>
        <p>Make sure the backend server is running on localhost:5000</p>
      </div>
    </div>
  );
};

export default VideoProcessor;

