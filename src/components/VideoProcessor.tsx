import React, { useState, useRef, useEffect, useCallback } from "react";

interface VideoProcessorProps {
  onStop?: () => void;
}

const VideoProcessor: React.FC<VideoProcessorProps> = ({ onStop }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);

  const WEBSOCKET_URL =
    import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:5000/ws";

  const initializeMediaSource = useCallback(() => {
    if (!remoteVideoRef.current) return;

    try {
      // Clean up existing MediaSource if any
      if (mediaSourceRef.current) {
        try {
          if (mediaSourceRef.current.readyState === "open") {
            mediaSourceRef.current.endOfStream();
          }
        } catch (err) {
          console.warn("Error cleaning up existing MediaSource:", err);
        }
        mediaSourceRef.current = null;
      }

      // Create MediaSource
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;

      // Set up video element
      remoteVideoRef.current.src = URL.createObjectURL(mediaSource);

      // Wait for MediaSource to be ready
      mediaSource.addEventListener("sourceopen", () => {
        try {
          // Create source buffer for WebM video
          const sourceBuffer = mediaSource.addSourceBuffer(
            'video/webm; codecs="vp8"'
          );
          sourceBufferRef.current = sourceBuffer;
          console.log("MediaSource ready and source buffer created");
        } catch (err) {
          console.error("Error creating source buffer:", err);
          setError("Failed to create video source buffer");
        }
      });

      mediaSource.addEventListener("error", (e) => {
        console.error("MediaSource error:", e);
        setError("MediaSource error occurred");
      });

      mediaSource.addEventListener("sourceended", () => {
        console.log("MediaSource ended");
      });

      mediaSource.addEventListener("sourceclose", () => {
        console.log("MediaSource closed");
      });
    } catch (err) {
      console.error("Error initializing MediaSource:", err);
      setError("Failed to initialize video playback");
    }
  }, []);

  const initializeWebSocket = useCallback(() => {
    // Close existing connection if any
    if (websocketRef.current) {
      websocketRef.current.close();
    }

    try {
      console.log("Creating WebSocket connection to:", WEBSOCKET_URL);
      const ws = new WebSocket(WEBSOCKET_URL);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setConnectionStatus("Connected");
        setError(null);
      };

      ws.onmessage = (event) => {
        console.log("📥 WebSocket message received, size:", event.data.length);
        if (event.data instanceof ArrayBuffer) {
          // Handle binary video data
          const chunk = event.data;
          if (
            sourceBufferRef.current &&
            !sourceBufferRef.current.updating &&
            mediaSourceRef.current?.readyState === "open"
          ) {
            try {
              sourceBufferRef.current.appendBuffer(chunk);
              console.log("✅ Appended video chunk to source buffer");
            } catch (err) {
              console.error("❌ Error appending to source buffer:", err);
            }
          } else {
            console.warn("❌ Cannot append buffer - source buffer not ready");
          }
        } else if (event.data instanceof Blob) {
          // Convert Blob to ArrayBuffer
          event.data.arrayBuffer().then((arrayBuffer) => {
            if (
              sourceBufferRef.current &&
              !sourceBufferRef.current.updating &&
              mediaSourceRef.current?.readyState === "open"
            ) {
              try {
                sourceBufferRef.current.appendBuffer(arrayBuffer);
                console.log("✅ Appended video chunk to source buffer");
              } catch (err) {
                console.error("❌ Error appending to source buffer:", err);
              }
            }
          });
        } else {
          // Handle text messages
          try {
            const message = JSON.parse(event.data);
            console.log("📨 WebSocket message:", message);
          } catch (err) {
            console.log("📨 WebSocket text message:", event.data);
          }
        }
      };

      ws.onclose = (event) => {
        console.log(
          "🔌 WebSocket disconnected, code:",
          event.code,
          "reason:",
          event.reason
        );
        setConnectionStatus("Disconnected");
        setIsStreaming(false);

        // Attempt to reconnect after a delay
        if (event.code !== 1000) {
          // Not a normal closure
          console.log("🔄 Attempting to reconnect WebSocket in 3 seconds...");
          setTimeout(() => {
            if (isStreaming) {
              console.log("🔄 Reconnecting WebSocket...");
              initializeWebSocket();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setError("WebSocket connection failed");
        setConnectionStatus("Error");
      };
    } catch (err) {
      console.error("❌ Error creating WebSocket:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [WEBSOCKET_URL, isStreaming]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      // Set up local video display
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch((err) => {
          console.error("Error playing local video:", err);
        });
      }

      // Wait for video to be ready
      await new Promise((resolve) => {
        if (localVideoRef.current) {
          localVideoRef.current.onloadedmetadata = () => {
            console.log(
              "Video metadata loaded, dimensions:",
              localVideoRef.current!.videoWidth,
              "x",
              localVideoRef.current!.videoHeight
            );
            resolve(void 0);
          };
        } else {
          resolve(void 0);
        }
      });

      // Initialize MediaSource for remote video
      initializeMediaSource();

      // Initialize WebSocket connection
      initializeWebSocket();

      // Wait for WebSocket to connect
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, 5000);

        const checkConnection = () => {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            clearTimeout(timeout);
            resolve(void 0);
          } else if (websocketRef.current?.readyState === WebSocket.CLOSED) {
            clearTimeout(timeout);
            reject(new Error("WebSocket connection failed"));
          } else {
            setTimeout(checkConnection, 100);
          }
        };

        checkConnection();
      });

      // Check if MediaRecorder supports the desired MIME type
      const mimeType = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(
          `MediaRecorder does not support ${mimeType}, trying fallback`
        );
        const fallbackMimeType = "video/webm";
        if (MediaRecorder.isTypeSupported(fallbackMimeType)) {
          console.log(`Using fallback MIME type: ${fallbackMimeType}`);
        } else {
          console.error("No supported MIME type found for MediaRecorder");
          setError("Browser does not support video recording");
          return;
        }
      }

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType)
          ? mimeType
          : "video/webm",
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log(
          "MediaRecorder data available, size:",
          event.data.size,
          "type:",
          event.data.type
        );
        console.log("MediaRecorder state:", mediaRecorder.state);
        console.log("WebSocket ready state:", websocketRef.current?.readyState);

        if (event.data.size > 0) {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            // Convert Blob to ArrayBuffer for better handling
            event.data
              .arrayBuffer()
              .then((arrayBuffer) => {
                if (arrayBuffer.byteLength > 0) {
                  websocketRef.current!.send(arrayBuffer);
                  console.log(
                    "✅ Sent video chunk to server, size:",
                    arrayBuffer.byteLength
                  );
                } else {
                  console.warn("❌ Empty arrayBuffer after conversion");
                }
              })
              .catch((err) => {
                console.error("Error converting blob to arraybuffer:", err);
              });
          } else {
            console.warn(
              "WebSocket not ready, state:",
              websocketRef.current?.readyState
            );
          }
        } else {
          console.warn("❌ Received empty video chunk from MediaRecorder");
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error("MediaRecorder error:", error);
        setError("Video recording error");
      };

      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started");
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped");
      };

      // Verify WebSocket is still connected before starting MediaRecorder
      if (websocketRef.current?.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }

      // Start recording with larger time slices for better video quality
      mediaRecorder.start(200); // 200ms chunks
      setIsStreaming(true);

      console.log("✅ Camera and streaming started successfully");

      // Add a timeout to check if MediaRecorder is working
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          console.log("✅ MediaRecorder is recording");
        } else {
          console.warn(
            "❌ MediaRecorder is not recording, state:",
            mediaRecorder.state
          );
        }

        // Check WebSocket status
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          console.log("✅ WebSocket is still connected");
        } else {
          console.warn(
            "❌ WebSocket is not connected, state:",
            websocketRef.current?.readyState
          );
        }
      }, 2000);
    } catch (err) {
      console.error("Error starting camera:", err);
      setError("Failed to access camera. Please check permissions.");
    }
  }, [initializeMediaSource, initializeWebSocket]);

  const stopStreaming = useCallback(() => {
    try {
      // Stop MediaRecorder
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      // Stop camera stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      // Close WebSocket
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.src = "";
      }

      // Clean up MediaSource
      if (mediaSourceRef.current) {
        try {
          if (mediaSourceRef.current.readyState === "open") {
            mediaSourceRef.current.endOfStream();
          }
        } catch (err) {
          console.warn("Error ending MediaSource stream:", err);
        }
        mediaSourceRef.current = null;
      }
      sourceBufferRef.current = null;

      setIsStreaming(false);
      setConnectionStatus("Disconnected");
      console.log("Streaming stopped");
    } catch (err) {
      console.error("Error stopping stream:", err);
    }
  }, []);

  const handleStop = () => {
    stopStreaming();
    if (onStop) {
      onStop();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Real-time Video Processing
          </h1>
          <p className="text-gray-400 text-lg">
            Live camera feed with grayscale processing
          </p>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-8 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  connectionStatus === "Connected"
                    ? "bg-green-500"
                    : connectionStatus === "Error"
                    ? "bg-red-500"
                    : "bg-gray-500"
                }`}
              ></div>
              <span className="text-sm text-gray-300">
                Status: {connectionStatus}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              {isStreaming ? "Streaming Active" : "Streaming Inactive"}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
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
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Video Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Local Video (Color) */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">
              Original Feed (Color)
            </h3>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <div className="text-center">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-2"
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
                    <p className="text-gray-400">
                      Camera feed will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remote Video (Grayscale) */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">
              Processed Feed (Grayscale)
            </h3>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <div className="text-center">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-400">
                      Processed video will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {!isStreaming ? (
            <button
              onClick={startCamera}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Start Processing
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Stop Processing
            </button>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => window.history.back()}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back to Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoProcessor;
