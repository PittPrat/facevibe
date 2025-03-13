import React, { useEffect, useRef, useState } from 'react';

// Define global types for MediaPipe
declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
  }
}

interface Exercise {
  name: string;
  validate: (landmarks: any) => boolean;
  successMessage: string;
  failureMessage: string;
}

interface ExerciseTrackerProps {
    videoConstraints?: MediaTrackConstraints;
  }

const ExerciseTracker: React.FC<ExerciseTrackerProps> = ({ videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  }  }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [faceMesh, setFaceMesh] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>("Jaw Dropper");
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackType, setFeedbackType] = useState<'success' | 'failure' | ''>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [vibePulse, setVibePulse] = useState<number>(0);
  
  // Premium colors
  const TEAL_COLOR = "#00C4B4";
  const RED_COLOR = "#FF4A4A";
  const DARK_TEAL = "#008B82";

  // Define the 10 required exercises with specific landmark validation
  const exercises: Record<string, Exercise> = {
    "Jaw Dropper": {
      name: "Jaw Dropper",
      validate: (landmarks) => {
        // Check if jaw is dropped by measuring distance between chin (152) and top (0)
        const chin = landmarks[152];
        const top = landmarks[0];
        return Math.abs(chin.y - top.y) > 0.2; // Normalized value (equivalent to >20px)
      },
      successMessage: "Jaw's dropping jaws—elite status unlocked!",
      failureMessage: "Widen it, vibe rookie!"
    },
    "Brow Lifter": {
      name: "Brow Lifter",
      validate: (landmarks) => {
        // Check if brow (107) is lifted compared to top (0)
        const brow = landmarks[107];
        const top = landmarks[0];
        return Math.abs(brow.y - top.y) < 0.15; // Normalized (equivalent to >15px)
      },
      successMessage: "Brows hit the VIP list—stress is shook!",
      failureMessage: "Lift 'em to the penthouse, fam!"
    },
    "Cheek Puffer": {
      name: "Cheek Puffer",
      validate: (landmarks) => {
        // Check cheek width (234-454) exceeds threshold
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        return Math.abs(leftCheek.x - rightCheek.x) > 0.25; // Normalized (equivalent to >25px)
      },
      successMessage: "Chipmunk champ—puff power maxed!",
      failureMessage: "Puff harder, glow slacker!"
    },
    "Eye Winker": {
      name: "Eye Winker",
      validate: (landmarks) => {
        // Check eye asymmetry (133-263 vs. 362-398)
        const leftEyeTop = landmarks[133];
        const leftEyeBottom = landmarks[263];
        const rightEyeTop = landmarks[362];
        const rightEyeBottom = landmarks[398];
        
        const leftEyeOpening = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const rightEyeOpening = Math.abs(rightEyeTop.y - rightEyeBottom.y);
        
        // Check if one eye is significantly more closed than the other (winking)
        return Math.abs(leftEyeOpening - rightEyeOpening) > 0.02;
      },
      successMessage: "Wink wizard—eye game on fleek!",
      failureMessage: "One eye's lazy—step it up!"
    },
    "Smiley Stretch": {
      name: "Smiley Stretch",
      validate: (landmarks) => {
        // Check mouth corners (61-291) width exceeds threshold
        const leftCorner = landmarks[61];
        const rightCorner = landmarks[291];
        return Math.abs(leftCorner.x - rightCorner.x) > 0.3; // Normalized (equivalent to >30px)
      },
      successMessage: "Grin king—stress just got dethroned!",
      failureMessage: "Stretch that smile, vibe lord!"
    },
    "Nose Scruncher": {
      name: "Nose Scruncher",
      validate: (landmarks) => {
        // Check nose wrinkles (y-shift > 10px)
        const noseTip = landmarks[4];
        const noseBridge = landmarks[6];
        const normalDistance = 0.03; // Normal distance between points
        return Math.abs(noseTip.y - noseBridge.y) < normalDistance; // Scrunched nose has reduced distance
      },
      successMessage: "Scrunched it—wrinkle warrior!",
      failureMessage: "Snout's slacking—crinkle more!"
    },
    "Lip Pucker": {
      name: "Lip Pucker",
      validate: (landmarks) => {
        // Check lip protrusion (z-shift > 10px)
        const upperLip = landmarks[0];
        const lowerLip = landmarks[17];
        const lips = landmarks[13];
        // Pucker detection: lips protrude forward in z-axis
        return lips.z < (upperLip.z - 0.01) && lips.z < (lowerLip.z - 0.01);
      },
      successMessage: "Pout power—lips too posh for stress!",
      failureMessage: "Pucker up, you're half there!"
    },
    "Chin Jutter": {
      name: "Chin Jutter",
      validate: (landmarks) => {
        // Check chin (152) forward > 15px
        const chin = landmarks[152];
        const nose = landmarks[4];
        return chin.z < (nose.z - 0.015); // Chin jutting forward (negative z direction)
      },
      successMessage: "Chin out, boss—vibe royalty!",
      failureMessage: "Push it forward, champ!"
    },
    "Forehead Smoother": {
      name: "Forehead Smoother",
      validate: (landmarks) => {
        // Check forehead smoothness (flatness < 5px)
        const foreheadTop = landmarks[10];
        const foreheadMid = landmarks[151];
        const foreheadLow = landmarks[9];
        
        // Calculate variation in y positions
        const variation = Math.max(
          Math.abs(foreheadTop.y - foreheadMid.y),
          Math.abs(foreheadMid.y - foreheadLow.y),
          Math.abs(foreheadTop.y - foreheadLow.y)
        );
        
        return variation < 0.005; // Smooth forehead has minimal variation
      },
      successMessage: "Zen forehead—stress canceled deluxe!",
      failureMessage: "Smooth it out, tension's lurking!"
    },
    "Tongue Twister": {
      name: "Tongue Twister",
      validate: (landmarks) => {
        // Check tongue below chin (152)
        // Since MediaPipe doesn't track tongue directly, we look for a wide open mouth
        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        const chin = landmarks[152];
        
        // Very open mouth indicates tongue might be out
        return Math.abs(upperLip.y - lowerLip.y) > 0.1 && lowerLip.y > chin.y;
      },
      successMessage: "Tongue titan—vibe beast mode!",
      failureMessage: "Stick it out, don't hide!"
    }
  };

  // Handle camera mount/unmount more carefully
  useEffect(() => {
    // Add a fallback dark background
    document.body.style.backgroundColor = '#111';
    
    // Cleanup function
    return () => {
      if (faceMesh) {
        faceMesh.close();
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error('Error stopping tracks:', e);
        }
      }
      
      // Reset background
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Define setupCamera outside useEffect to avoid recreation on each render
  // Update the setupCamera function in ExerciseTracker.tsx to handle resolution better

  const setupCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      setLoading(true);
      // Use provided constraints or fallback to defaults
      const constraints = videoConstraints || {
        width: 640,
        height: 480,
        facingMode: "user"
      };
      
      // Get user media with video constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints
      });
      
      // Get actual resolution
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log("Actual video settings:", settings);
      
      // Set canvas dimensions to match video
      if (canvasRef.current && settings.width && settings.height) {
        canvasRef.current.width = settings.width;
        canvasRef.current.height = settings.height;
      };
      
      // Set video source and play with error handling
      videoRef.current.srcObject = stream;
      
      try {
        // Add a small delay before playing to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
        await videoRef.current.play();
      } catch (playError) {
        console.error("Error playing video:", playError);
        setError("Camera permission granted but couldn't start video. Try refreshing.");
        setLoading(false);
        return;
      }
      
      // Initialize FaceMesh
      if (!window.FaceMesh) {
        setError("MediaPipe FaceMesh not available");
        setLoading(false);
        return;
      }
      
      const mesh = new window.FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });
      
      mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      mesh.onResults(onResults);
      
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await mesh.send({ image: videoRef.current });
          }
        },
        width: settings.width, // Use actual video width
        height: settings.height // Use actual video height
      });
      
      camera.start();
      setFaceMesh(mesh);
      setLoading(false);
    } catch (error) {
      console.error("Error setting up camera:", error);
      setError("Camera shy? Allow access!");
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Load MediaPipe dependencies
    const loadMediaPipe = async () => {
      try {
        // Add a fallback background color to ensure visibility if video hasn't loaded
        if (videoRef.current) {
          videoRef.current.style.backgroundColor = "#333"; 
        }
        
        // Check if scripts are already loaded
        if (window.FaceMesh && window.Camera) {
          setupCamera();
          return;
        }
        
        // Load scripts sequentially to avoid race conditions
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
        
        await new Promise((resolve, reject) => {
          const cameraScript = document.createElement('script');
          cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
          cameraScript.async = true;
          cameraScript.onload = resolve;
          cameraScript.onerror = reject;
          document.body.appendChild(cameraScript);
        });
        
        // Now that both scripts are loaded, set up the camera
        setupCamera();
      } catch (error) {
        console.error("Error loading MediaPipe scripts:", error);
        setError("Couldn't load required resources. Try refreshing the page.");
        setLoading(false);
      }
    };
    
    loadMediaPipe();
  }, []);

  // Add camera permission error handling with retry
  const retrySetupCamera = () => {
    if (error) {
      setError("");
      setLoading(true);
      setupCamera();
    }
  };
  
  useEffect(() => {
    if (error.includes("Camera shy")) {
      // Add a notification that's more visible
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.top = '50%';
      notification.style.left = '50%';
      notification.style.transform = 'translate(-50%, -50%)';
      notification.style.backgroundColor = 'rgba(0,0,0,0.8)';
      notification.style.color = 'white';
      notification.style.padding = '20px';
      notification.style.borderRadius = '10px';
      notification.style.zIndex = '9999';
      notification.innerHTML = `<p>${error}</p><button style="background:${TEAL_COLOR};border:none;padding:10px;border-radius:5px;color:white;cursor:pointer;">Retry</button>`;
      document.body.appendChild(notification);
      
      // Add click handler to the retry button
      const button = notification.querySelector('button');
      if (button) {
        button.addEventListener('click', () => {
          document.body.removeChild(notification);
          retrySetupCamera();
        });
      }
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 10000);
    }
  }, [error]);
  
  // Handle FaceMesh results and provide premium feedback
  const onResults = (results: any) => {
    if (!canvasRef.current || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with each frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    // Get landmarks for selected exercise validation
    const landmarks = results.multiFaceLandmarks[0];
    const currentExercise = exercises[selectedExercise];
    
    if (currentExercise) {
      const isSuccessful = currentExercise.validate(landmarks);
      
      // Update feedback based on exercise success
      if (isSuccessful) {
        setFeedback(currentExercise.successMessage);
        setFeedbackType('success');
        setVibePulse(prev => Math.min(100, prev + 5)); // Increase vibe pulse
      } else {
        setFeedback(currentExercise.failureMessage);
        setFeedbackType('failure');
        setVibePulse(prev => Math.max(0, prev - 1)); // Decrease vibe pulse
      }
      
      setShowFeedback(true);
      
      // Draw face landmarks with premium styling
      ctx.save();
      ctx.fillStyle = isSuccessful ? TEAL_COLOR : RED_COLOR;
      
      // Draw facial mesh landmarks with elegant visualization
      for (const landmark of landmarks) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Draw elegant dots for landmarks
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw Vibe Pulse meter - premium visualization
      drawVibePulse(ctx, canvas.width - 30, 30, vibePulse);
      
      ctx.restore();
    }
  };
  
  // Premium Vibe Pulse visualization
  const drawVibePulse = (ctx: CanvasRenderingContext2D, x: number, y: number, value: number) => {
    const radius = 20;
    const pulseRadius = radius + (value / 10);
    
    // Draw outer pulse circle
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(0, 196, 180, ${value / 200})`;
    ctx.fill();
    
    // Draw inner circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(0, 196, 180, ${value / 100 + 0.3})`;
    ctx.fill();
    
    // Add pulse text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${value}%`, x, y);
  };
  
  // Handle exercise selection change
  const handleExerciseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedExercise(e.target.value);
    setFeedback("");
    setFeedbackType('');
    setShowFeedback(false);
  };
  
  return (
    <div className="exercise-tracker" style={{ 
      position: 'relative',
      width: '100%', 
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Premium title */}
      <div style={{ 
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        padding: '15px',
        color: 'white', 
        textAlign: 'center',
        zIndex: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{
          fontFamily: 'Arial', 
          fontSize: '24px',
          margin: '0',
          textShadow: '0 0 10px rgba(0, 196, 180, 0.5), 0 0 20px rgba(0, 0, 0, 0.5)'
        }}>
          FaceVibe Exercise Tracker
        </h2>
      </div>
      
      {/* Luxe exercise selector */}
      <div style={{
        position: 'absolute',
        top: '90px',
        left: '0',
        right: '0',
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
        opacity: loading ? 0.5 : 1,
        transition: 'opacity 0.3s ease'
      }}>
        <select
          value={selectedExercise}
          onChange={handleExerciseChange}
          disabled={loading}
          style={{
            width: 'auto',
            minWidth: '200px',
            padding: '8px 15px',
            fontFamily: 'Arial',
            fontSize: '18px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            border: `2px solid ${TEAL_COLOR}`,
            borderRadius: '30px',
            color: 'white',
            outline: 'none',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(5px)'
          }}
        >
          {Object.keys(exercises).map((exercise) => (
            <option key={exercise} value={exercise}>
              {exercise}
            </option>
          ))}
        </select>
      </div>
      
      {/* Video with teal glow border */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Loading spinner */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 20,
            borderRadius: '20px'
          }}>
            <div className="vibe-check-spinner"></div>
            <p style={{
              color: TEAL_COLOR,
              fontFamily: 'Arial',
              fontSize: '18px',
              marginLeft: '15px'
            }}>Vibe Check...</p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 20,
            borderRadius: '20px',
            flexDirection: 'column',
            padding: '20px'
          }}>
            <p style={{
              color: RED_COLOR,
              fontFamily: 'Arial',
              fontSize: '18px',
              textAlign: 'center'
            }}>
              {error}
            </p>
            <button 
              onClick={retrySetupCamera}
              style={{
                backgroundColor: TEAL_COLOR,
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '30px',
                fontFamily: 'Arial',
                fontSize: '16px',
                marginTop: '15px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Video element */}
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirror video for better user experience
            zIndex: 1 // Ensure video is above the background but below overlays
          }}
        />
        
        {/* Canvas overlay */}
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)', // Mirror canvas to match video
            zIndex: 2 // Above video but below UI elements
          }}
        />
        
        {/* Premium feedback animation */}
        {showFeedback && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: feedbackType === 'success' ? `rgba(0, 196, 180, 0.8)` : 'rgba(255, 74, 74, 0.8)',
              color: 'white',
              padding: '8px 15px',
              borderRadius: '30px',
              fontFamily: 'Arial',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
              animation: 'slideIn 0.5s forwards',
              width: 'auto',
              maxWidth: '280px',
              textAlign: 'center',
              backdropFilter: 'blur(5px)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              zIndex: 30
            }}
          >
            {feedback}
          </div>
        )}
      </div>
      
      {/* Science-backed guidance */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        padding: '10px 15px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(5px)',
        borderRadius: '10px',
        zIndex: 10
      }}>
        <p style={{
          fontFamily: 'Arial',
          fontSize: '14px',
          color: 'white',
          margin: '0'
        }}>
          <span style={{ color: TEAL_COLOR, fontWeight: 'bold' }}>CBT Insight:</span> This exercise helps reframe negative thought patterns by activating facial muscles linked to positive emotions. Complete 3 sets for optimal results.
        </p>
      </div>
      
      {/* Global styles for premium animations */}
      <style>
        {`
          @keyframes slideIn {
            0% { transform: translateX(-50%) translateY(20px); opacity: 0; }
            100% { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
          
          @keyframes pulse {
            0% { box-shadow: 0 0 5px rgba(0, 196, 180, 0.7); }
            50% { box-shadow: 0 0 20px rgba(0, 196, 180, 0.9); }
            100% { box-shadow: 0 0 5px rgba(0, 196, 180, 0.7); }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .exercise-tracker select:hover {
            border-color: ${TEAL_COLOR};
            box-shadow: 0 0 15px rgba(0, 196, 180, 0.3);
          }
          
          .exercise-tracker select:focus {
            border-color: ${TEAL_COLOR};
            box-shadow: 0 0 20px rgba(0, 196, 180, 0.5);
          }
          
          .vibe-check-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 196, 180, 0.3);
            border-radius: 50%;
            border-top-color: ${TEAL_COLOR};
            animation: spin 1s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
};

export default ExerciseTracker;