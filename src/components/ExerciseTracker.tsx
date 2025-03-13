import React, { useEffect, useRef, useState } from 'react';
import { ExerciseValidators, getExerciseBenefits, getExerciseInstructions } from '../utils/FacialAnalysis';

// Define global types for MediaPipe
declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
  }
}

type ExerciseName = 
  | "Jaw Dropper" 
  | "Brow Lifter" 
  | "Cheek Puffer" 
  | "Eye Winker" 
  | "Smiley Stretch" 
  | "Nose Scruncher" 
  | "Lip Pucker" 
  | "Chin Jutter" 
  | "Forehead Smoother" 
  | "Tongue Twister";

interface ExerciseTrackerProps {
  videoConstraints?: MediaTrackConstraints;
  onLandmarkUpdate?: (landmarks: any, faceVisible: boolean) => void;
  onExerciseComplete?: () => void;
}

const ExerciseTracker: React.FC<ExerciseTrackerProps> = ({ 
  videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  },
  onLandmarkUpdate,
  onExerciseComplete
}) => {
  // All refs must be declared at the top level
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeMeshRef = useRef<any>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const prevConstraintsRef = useRef(videoConstraints);
  const isFirstMountRef = useRef(true);
  
  // State declarations
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseName>("Jaw Dropper");
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackType, setFeedbackType] = useState<'success' | 'failure' | ''>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [vibePulse, setVibePulse] = useState<number>(0);
  const [actualResolution, setActualResolution] = useState({ width: 0, height: 0 });
  const [successStreak, setSuccessStreak] = useState<number>(0);

  // Premium colors
  const TEAL_COLOR = "#00C4B4";
  const RED_COLOR = "#FF4A4A";

  // Define the 10 required exercises
  const exercises: Record<ExerciseName, {
    name: string;
    validate: (landmarks: any) => boolean;
    successMessage: string;
    failureMessage: string;
  }> = {
    "Jaw Dropper": {
      name: "Jaw Dropper",
      validate: ExerciseValidators.jawDropper,
      successMessage: "Jaw's dropping jaws—elite status unlocked!",
      failureMessage: "Widen it, vibe rookie!"
    },
    "Brow Lifter": {
      name: "Brow Lifter",
      validate: ExerciseValidators.browLifter,
      successMessage: "Brows hit the VIP list—stress is shook!",
      failureMessage: "Lift 'em to the penthouse, fam!"
    },
    "Cheek Puffer": {
      name: "Cheek Puffer",
      validate: ExerciseValidators.cheekPuffer,
      successMessage: "Chipmunk champ—puff power maxed!",
      failureMessage: "Puff harder, glow slacker!"
    },
    "Eye Winker": {
      name: "Eye Winker",
      validate: ExerciseValidators.eyeWinker,
      successMessage: "Wink wizard—eye game on fleek!",
      failureMessage: "One eye's lazy—step it up!"
    },
    "Smiley Stretch": {
      name: "Smiley Stretch",
      validate: ExerciseValidators.smileyStretch,
      successMessage: "Grin king—stress just got dethroned!",
      failureMessage: "Stretch that smile, vibe lord!"
    },
    "Nose Scruncher": {
      name: "Nose Scruncher",
      validate: ExerciseValidators.noseScruncher,
      successMessage: "Scrunched it—wrinkle warrior!",
      failureMessage: "Snout's slacking—crinkle more!"
    },
    "Lip Pucker": {
      name: "Lip Pucker",
      validate: ExerciseValidators.lipPucker,
      successMessage: "Pout power—lips too posh for stress!",
      failureMessage: "Pucker up, you're half there!"
    },
    "Chin Jutter": {
      name: "Chin Jutter",
      validate: ExerciseValidators.chinJutter,
      successMessage: "Chin out, boss—vibe royalty!",
      failureMessage: "Push it forward, champ!"
    },
    "Forehead Smoother": {
      name: "Forehead Smoother",
      validate: ExerciseValidators.foreheadSmoother,
      successMessage: "Zen forehead—stress canceled deluxe!",
      failureMessage: "Smooth it out, tension's lurking!"
    },
    "Tongue Twister": {
      name: "Tongue Twister",
      validate: ExerciseValidators.tongueTwister,
      successMessage: "Tongue titan—vibe beast mode!",
      failureMessage: "Stick it out, don't hide!"
    }
  };

  // Function to set up the camera and FaceMesh
  const setupCamera = async () => {
    if (!videoRef.current) return;
    
    // Stop any previous instances
    await cleanupMediaPipe();
    
    try {
      setLoading(true);
      
      // Get user media with video constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints
      });
      
      // Store stream in ref for cleanup
      activeStreamRef.current = stream;
      
      // Get resolution
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log("Video settings:", settings);
      
      //const width = settings.width || 640;
      //const height = settings.height || 480;
      
      if (settings.width && settings.height) {
        setActualResolution({
          width: settings.width,
          height: settings.height
        });
        
        // Set canvas dimensions
        if (canvasRef.current) {
          canvasRef.current.width = settings.width;
          canvasRef.current.height = settings.height;
        }
      }
      
      // Set video source and play with proper event handling
      videoRef.current.srcObject = stream;

      // Wait for the loadedmetadata event before trying to play
      try {
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not available"));
            return;
          }
          
          // Function to handle successful loadedmetadata event
          const loadHandler = () => {
            videoRef.current?.removeEventListener('loadedmetadata', loadHandler);
            videoRef.current?.removeEventListener('error', errorHandler);
            
            // Now try to play the video
            videoRef.current?.play()
              .then(() => resolve())
              .catch(err => reject(err));
          };
          
          // Function to handle video error events
          const errorHandler = () => {
            videoRef.current?.removeEventListener('loadedmetadata', loadHandler);
            videoRef.current?.removeEventListener('error', errorHandler);
            reject(new Error("Video loading error"));
          };
          
          // Add event listeners
          videoRef.current.addEventListener('loadedmetadata', loadHandler);
          videoRef.current.addEventListener('error', errorHandler);
          
          // If the video is already loaded, resolve immediately
          if (videoRef.current.readyState >= 2) {
            videoRef.current.removeEventListener('loadedmetadata', loadHandler);
            videoRef.current.removeEventListener('error', errorHandler);
            
            videoRef.current.play()
              .then(() => resolve())
              .catch(err => reject(err));
          }
        });
      } catch (playError) {
        console.error("Error playing video:", playError);
        setError("Camera permission granted but couldn't start video. Try refreshing.");
        setLoading(false);
        return;
      }
      
      try {
        // Make sure FaceMesh is available
        if (!window.FaceMesh) {
          throw new Error("MediaPipe FaceMesh not available");
        }
        
        // Initialize FaceMesh with careful error handling and WASM workaround
        // First, manually define a Module object on window to fix the WASM error
        // This addresses the "Module.arguments has been replaced" error
        (window as any).Module = {
          arguments_: [],
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
          }
        };
        
        // Create the FaceMesh instance with the same locateFile function
        const mesh = new window.FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
          }
        });
        
        // Store mesh in ref
        activeMeshRef.current = mesh;
        
        // Configure with await
        await mesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        // Set up result handler
        mesh.onResults(onResults);
        
        // Initialize the model with a short timeout to allow WASM initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        await mesh.initialize();
        
        // Create a canvas context for grabbing frames
        if (!canvasRef.current) {
          throw new Error("Canvas not available");
        }
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }
        
        // Create our own frame processor using requestAnimationFrame
        const processFrame = async () => {
          if (!videoRef.current || !activeMeshRef.current || !canvasRef.current || !ctx) {
            // If component is unmounted or resources cleaned up
            return;
          }
          
          // Check if video is playing and ready
          if (videoRef.current.paused || videoRef.current.ended || videoRef.current.readyState < 2) {
            // Try again on next frame
            animationFrameIdRef.current = requestAnimationFrame(processFrame);
            return;
          }
          
          try {
            // Draw the current frame to the canvas
            ctx.drawImage(
              videoRef.current, 
              0, 
              0, 
              canvasRef.current.width, 
              canvasRef.current.height
            );
            
            // CRITICAL FIX: Use the video element directly instead of ImageData
            // This avoids WASM memory issues with ImageData processing
            if (activeMeshRef.current && videoRef.current) {
              try {
                // Try direct video element first
                await activeMeshRef.current.send({image: videoRef.current});
              } catch (directError) {
                console.log('Trying alternative approach with ImageData');
                // Fallback to ImageData if direct approach fails
                const imageData = ctx.getImageData(
                  0, 
                  0, 
                  canvasRef.current.width, 
                  canvasRef.current.height
                );
                await activeMeshRef.current.send({image: imageData});
              }
            }
          } catch (e) {
            // Log but don't throw to keep animation frame running
            console.error('Error processing frame:', e);
          }
          
          // Process next frame
          animationFrameIdRef.current = requestAnimationFrame(processFrame);
        };
        
        // Start processing frames
        animationFrameIdRef.current = requestAnimationFrame(processFrame);
        
        // We're ready!
        setLoading(false);
        
      } catch (meshError) {
        console.error("Error initializing FaceMesh:", meshError);
        cleanupMediaPipe();
        setError("Failed to initialize facial tracking. Please try refreshing.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error setting up camera:", error);
      cleanupMediaPipe();
      setError("Camera shy? Allow access!");
      setLoading(false);
    }
  };

  // Improved cleanup function
  const cleanupMediaPipe = async () => {
    console.log("Cleaning up MediaPipe resources");
    
    // Cancel any animation frames first
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    
    // Close mesh
    if (activeMeshRef.current) {
      try {
        console.log("Closing FaceMesh");
        activeMeshRef.current.close();
      } catch (e) {
        console.error("Error closing FaceMesh:", e);
      }
      activeMeshRef.current = null;
    }
    
    // Stop media stream
    if (activeStreamRef.current) {
      try {
        console.log("Stopping media tracks");
        activeStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {
        console.error("Error stopping media tracks:", e);
      }
      activeStreamRef.current = null;
    }
    
    // Clear video source if still connected to component
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        console.error("Error clearing video source:", e);
      }
    }
    
    console.log("MediaPipe cleanup complete");
  };
  
  // Load MediaPipe dependencies and setup
  const loadMediaPipe = async () => {
    // Prevent duplicate initialization
    if (activeMeshRef.current) {
      console.log("MediaPipe already initialized, skipping setup");
      setLoading(false);
      return;
    }
    
    // Check if scripts are loaded and proceed
    if (window.FaceMesh) {
      console.log("MediaPipe libraries available, setting up camera");
      setupCamera();
    } else {
      console.error("MediaPipe libraries not available");
      setError("Required libraries not loaded. Please refresh the page.");
      setLoading(false);
    }
  };

  // Function to reset and restart camera
  const resetCamera = async () => {
    // Prevent resets while loading
    if (loading) {
      console.log("Camera already resetting, ignoring reset request");
      return;
    }
    
    console.log("Resetting camera with new constraints");
    setLoading(true);
    setError("");
    
    // Do a full cleanup first
    await cleanupMediaPipe();
    
    // Wait for cleanup to finalize with a slightly longer delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reinitialize
    setupCamera();
  };

  // Add camera permission error handling with retry
  const retrySetupCamera = () => {
    if (error) {
      setError("");
      setLoading(true);
      
      // Short delay before retry to break potential loops
      setTimeout(() => {
        loadMediaPipe();
      }, 500);
    }
  };

  // EFFECTS SECTION - All useEffect hooks must be called at the component's top level

  // Initial setup effect
  useEffect(() => {
    // Track whether component is mounted
    let isMounted = true;
    
    // Initial setup with a small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      if (isMounted) {
        loadMediaPipe();
        isFirstMountRef.current = false;
      }
    }, 500);
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      console.log("Component unmounting, cleaning up MediaPipe");
      clearTimeout(initTimer);
      cleanupMediaPipe();
    };
  }, []);

  // Video constraints change effect
  useEffect(() => {
    // Skip the first render
    if (isFirstMountRef.current) {
      return;
    }
    
    // Compare current constraints with previous ones
    const constraintsChanged = JSON.stringify(prevConstraintsRef.current) !== JSON.stringify(videoConstraints);
    
    // Only reset camera if constraints actually changed and not loading
    if (constraintsChanged && !loading && videoRef.current && videoRef.current.srcObject) {
      console.log("Video constraints changed, resetting camera");
      resetCamera();
    }
    
    // Update the previous constraints ref
    prevConstraintsRef.current = videoConstraints;
  }, [videoConstraints, loading]);

  // Error notification effect
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
    if (!canvasRef.current || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        // No face detected
        if (onLandmarkUpdate) {
          onLandmarkUpdate(null, false);
        }
        return;
      }
    
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
    
    // Call onLandmarkUpdate callback if provided
    if (onLandmarkUpdate) {
      onLandmarkUpdate(landmarks, true);
    }
    
    const currentExercise = exercises[selectedExercise];
    
    if (currentExercise) {
      const isSuccessful = currentExercise.validate(landmarks);
      
      // Update feedback based on exercise success
      if (isSuccessful) {
        setFeedback(currentExercise.successMessage);
        setFeedbackType('success');
        setVibePulse(prev => Math.min(100, prev + 5)); // Increase vibe pulse
        setSuccessStreak(prev => prev + 1);
        
        // If success streak reaches threshold, consider exercise complete
        if (successStreak >= 15 && onExerciseComplete) {
          onExerciseComplete();
          // Reset streak after completion
          setSuccessStreak(0);
          
          // Show special completion feedback
          const completionFeedback = document.createElement('div');
          completionFeedback.style.position = 'fixed';
          completionFeedback.style.top = '50%';
          completionFeedback.style.left = '50%';
          completionFeedback.style.transform = 'translate(-50%, -50%)';
          completionFeedback.style.backgroundColor = 'rgba(0, 196, 180, 0.9)';
          completionFeedback.style.color = 'white';
          completionFeedback.style.padding = '20px';
          completionFeedback.style.borderRadius = '10px';
          completionFeedback.style.zIndex = '9999';
          completionFeedback.style.textAlign = 'center';
          completionFeedback.innerHTML = `<h3>Exercise Complete!</h3><p>You've mastered the ${selectedExercise}!</p>`;
          document.body.appendChild(completionFeedback);
          
          // Remove after 3 seconds
          setTimeout(() => {
            if (document.body.contains(completionFeedback)) {
              document.body.removeChild(completionFeedback);
            }
          }, 3000);
        }
      } else {
        setFeedback(currentExercise.failureMessage);
        setFeedbackType('failure');
        setVibePulse(prev => Math.max(0, prev - 1)); // Decrease vibe pulse
        setSuccessStreak(0); // Reset streak on failure
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
      
      // Draw streak counter if > 0
      if (successStreak > 0) {
        ctx.fillStyle = "rgba(0, 196, 180, 0.8)";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`Streak: ${successStreak}`, 10, 10);
      }
      
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
    setSelectedExercise(e.target.value as ExerciseName);
    setFeedback("");
    setFeedbackType('');
    setShowFeedback(false);
    setSuccessStreak(0);
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
        
        {/* Exercise instruction tooltip */}
        <div
          style={{
            position: 'absolute',
            top: '150px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '15px',
            fontFamily: 'Arial',
            fontSize: '14px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
            width: 'auto',
            maxWidth: '300px',
            textAlign: 'center',
            backdropFilter: 'blur(5px)',
            zIndex: 25
          }}
        >
          {getExerciseInstructions(selectedExercise)}
        </div>
        
        {/* Resolution display */}
        {actualResolution.width > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '10px',
            fontSize: '12px',
            zIndex: 15
          }}>
            {actualResolution.width}×{actualResolution.height}
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
          <span style={{ color: TEAL_COLOR, fontWeight: 'bold' }}>CBT Insight:</span> {getExerciseBenefits(selectedExercise)}
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