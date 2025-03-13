import React, { useEffect, useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

interface StressGameProps {
  landmarks: any;
  faceVisible: boolean;
  onStressUpdate?: (newStressLevel: number) => void;
}

interface GameDefinition {
  id: string;
  name: string;
  description: string;
  durationSecs: number;
  validate: (landmarks: any) => boolean;
  successMessage: string;
  failureMessage: string;
  instructions: string;
  icon: string; // CSS class name for icon
}

const StressGame: React.FC<StressGameProps> = ({ landmarks, faceVisible, onStressUpdate }) => {
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string>("");
  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [gameProgress, setGameProgress] = useState<number>(0);
  const [gameSuccess, setGameSuccess] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [successCounter, setSuccessCounter] = useState<number>(0);
  const [requirementsMet, setRequirementsMet] = useState<boolean>(false);
  
  // References for timers to clean up
  const stressCheckRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  
  // Premium colors
  const TEAL_COLOR = "#00C4B4";
  const GOLD_COLOR = "#FFD700";
  const RED_COLOR = "#FF4A4A";

  // Define the 10 CBT mini-games with specific validation
  const games: GameDefinition[] = [
    {
      id: "smile-snipe",
      name: "Smile Snipe",
      description: "Maintain a wide smile to snipe away stress gremlins",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check mouth width (61-291) > 30px
        const leftCorner = landmarks[61];
        const rightCorner = landmarks[291];
        return Math.abs(leftCorner.x - rightCorner.x) > 0.3; // Normalized (equivalent to >30px)
      },
      successMessage: "Grin's too posh for gremlins—snipe win!",
      failureMessage: "Smile harder, stress is dodging!",
      instructions: "Smile wide to snipe stress gremlins",
      icon: "smile-beam"
    },
    {
      id: "brow-chill",
      name: "Brow Chill",
      description: "Keep your brows relaxed and still to freeze stress",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check brow movement < 10px
        const leftBrow = landmarks[107];
        const rightBrow = landmarks[336];
        const prev = gameStartTime ? JSON.parse(sessionStorage.getItem('prevBrowPos') || '{}') : null;
        
        if (gameStartTime) {
          const current = { leftX: leftBrow.x, leftY: leftBrow.y, rightX: rightBrow.x, rightY: rightBrow.y };
          sessionStorage.setItem('prevBrowPos', JSON.stringify(current));
          
          if (prev) {
            const leftDiff = Math.sqrt(Math.pow(current.leftX - prev.leftX, 2) + Math.pow(current.leftY - prev.leftY, 2));
            const rightDiff = Math.sqrt(Math.pow(current.rightX - prev.rightX, 2) + Math.pow(current.rightY - prev.rightY, 2));
            return leftDiff < 0.01 && rightDiff < 0.01; // Normalized (equivalent to <10px)
          }
        }
        return true; // Default to true on first frame
      },
      successMessage: "Brows on vacay—stress canceled deluxe!",
      failureMessage: "Chill those caterpillars, fam!",
      instructions: "Keep your eyebrows completely still",
      icon: "ice-cube"
    },
    {
      id: "breath-blast",
      name: "Breath Blast",
      description: "Deep breathing to blast away tension",
      durationSecs: 30,
      validate: (_landmarks) => {
        // Placeholder: no chest detection, use timing pattern
        const now = Date.now();
        const elapsed = now - (gameStartTime || now);
        // Using a simple oscillating pattern as placeholder for breathing
        return Math.sin(elapsed / 2000) > 0; // Oscillates between true/false every ~3 seconds
      },
      successMessage: "Blast stress with air power—vibe titan!",
      failureMessage: "Breathe deeper, rookie!",
      instructions: "Take slow, deep breaths (4s in, 4s out)",
      icon: "wind"
    },
    {
      id: "eye-rest",
      name: "Eye Rest",
      description: "Close your eyes for a quick refreshing break",
      durationSecs: 5,
      validate: (landmarks) => {
        // Check if eyes are closed
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];
        
        const leftEyeOpening = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const rightEyeOpening = Math.abs(rightEyeTop.y - rightEyeBottom.y);
        
        return leftEyeOpening < 0.01 && rightEyeOpening < 0.01; // Eyes closed
      },
      successMessage: "Peepers napped—stress got zapped!",
      failureMessage: "Close 'em longer, vibe slacker!",
      instructions: "Close your eyes completely for 5 seconds",
      icon: "eye-slash"
    },
    {
      id: "jaw-jiggle",
      name: "Jaw Jiggle",
      description: "Wiggle your jaw to shake out tension",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check jaw oscillation
        const chin = landmarks[152];
        const prev = gameStartTime ? JSON.parse(sessionStorage.getItem('prevJawPos') || '{}') : null;
        const jiggleCount = parseInt(sessionStorage.getItem('jawJiggleCount') || '0');
        
        if (gameStartTime) {
          const current = { y: chin.y };
          
          if (prev) {
            const yDiff = Math.abs(current.y - prev.y);
            
            if (yDiff > 0.01) { // Normalized (equivalent to >10px)
              const newCount = jiggleCount + 1;
              sessionStorage.setItem('jawJiggleCount', newCount.toString());
              
              // Reset the position after counting a jiggle
              sessionStorage.setItem('prevJawPos', JSON.stringify({ y: current.y - (current.y - prev.y) / 2 }));
              
              return newCount >= 10; // Need 10 jiggles to succeed
            }
          }
          
          sessionStorage.setItem('prevJawPos', JSON.stringify(current));
        }
        
        return jiggleCount >= 10; // Success if 10+ jiggles
      },
      successMessage: "Wiggle master—tension's toast!",
      failureMessage: "Shake it more, stress is clingy!",
      instructions: "Wiggle your jaw up and down 10 times",
      icon: "waveform"
    },
    {
      id: "positive-reframe",
      name: "Positive Reframe",
      description: "Smile to reframe negative thoughts positively",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check if smiling
        const leftCorner = landmarks[61];
        const rightCorner = landmarks[291];
        return Math.abs(leftCorner.x - rightCorner.x) > 0.3; // Normalized (equivalent to >30px)
      },
      successMessage: "Zen boss mode—stress reframed elite!",
      failureMessage: "Smile and reframe, you're halfway!",
      instructions: "Smile wide while thinking positive thoughts",
      icon: "brain"
    },
    {
      id: "cheek-drop",
      name: "Cheek Drop",
      description: "Relax your cheeks to release tension",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check cheek width < 20px (relaxed)
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        return Math.abs(leftCheek.x - rightCheek.x) < 0.2; // Normalized (equivalent to <20px)
      },
      successMessage: "Chipmunk vibes dropped—stress KO'd!",
      failureMessage: "Relax those cheeks, fam!",
      instructions: "Relax your cheeks completely",
      icon: "face-smile-relaxed"
    },
    {
      id: "lip-loosen",
      name: "Lip Loosen",
      description: "Loosen your lips to release facial tension",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check no lip protrusion (z-shift < 5px)
        const upperLip = landmarks[0];
        const lowerLip = landmarks[17];
        const lips = landmarks[13];
        
        // Check if lips are relaxed (not protruding)
        return Math.abs(lips.z - upperLip.z) < 0.005 && Math.abs(lips.z - lowerLip.z) < 0.005;
      },
      successMessage: "Lips too chill for vaults—vibe win!",
      failureMessage: "Loosen up, tension's tight!",
      instructions: "Relax your lips completely",
      icon: "mouth"
    },
    {
      id: "nose-flare",
      name: "Nose Flare",
      description: "Flare your nostrils to release trapped stress",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check nostril flare 5x in 30s
        const leftNostril = landmarks[102];
        const rightNostril = landmarks[331];
        const prev = gameStartTime ? JSON.parse(sessionStorage.getItem('prevNostrilPos') || '{}') : null;
        const flareCount = parseInt(sessionStorage.getItem('nostrilFlareCount') || '0');
        
        if (gameStartTime) {
          const current = { leftX: leftNostril.x, rightX: rightNostril.x };
          
          if (prev) {
            const leftDiff = Math.abs(current.leftX - prev.leftX);
            const rightDiff = Math.abs(current.rightX - prev.rightX);
            
            if (leftDiff > 0.005 && rightDiff > 0.005) { // Normalized (equivalent to >5px)
              const newCount = flareCount + 1;
              sessionStorage.setItem('nostrilFlareCount', newCount.toString());
              
              // Reset position after counting a flare
              sessionStorage.setItem('prevNostrilPos', JSON.stringify({ 
                leftX: current.leftX - (current.leftX - prev.leftX) / 2,
                rightX: current.rightX - (current.rightX - prev.rightX) / 2
              }));
              
              return newCount >= 5; // Need 5 flares to succeed
            }
          }
          
          sessionStorage.setItem('prevNostrilPos', JSON.stringify(current));
        }
        
        return flareCount >= 5; // Success if 5+ flares
      },
      successMessage: "Nostril glow-up—blues flared out!",
      failureMessage: "Flare more, stress is sneaky!",
      instructions: "Flare your nostrils 5 times",
      icon: "nose"
    },
    {
      id: "face-freeze",
      name: "Face Freeze",
      description: "Freeze your face to solidify your calm",
      durationSecs: 15,
      validate: (landmarks) => {
        // Check neutral face (all shifts < 5px)
        const nose = landmarks[4];
        const chin = landmarks[152];
        const leftEye = landmarks[159];
        const rightEye = landmarks[386];
        
        const prev = gameStartTime ? JSON.parse(sessionStorage.getItem('prevFacePos') || '{}') : null;
        
        if (gameStartTime) {
          const current = { 
            noseX: nose.x, noseY: nose.y,
            chinX: chin.x, chinY: chin.y,
            leftEyeX: leftEye.x, leftEyeY: leftEye.y,
            rightEyeX: rightEye.x, rightEyeY: rightEye.y
          };
          
          if (prev) {
            const noseDiff = Math.sqrt(Math.pow(current.noseX - prev.noseX, 2) + Math.pow(current.noseY - prev.noseY, 2));
            const chinDiff = Math.sqrt(Math.pow(current.chinX - prev.chinX, 2) + Math.pow(current.chinY - prev.chinY, 2));
            const leftEyeDiff = Math.sqrt(Math.pow(current.leftEyeX - prev.leftEyeX, 2) + Math.pow(current.leftEyeY - prev.leftEyeY, 2));
            const rightEyeDiff = Math.sqrt(Math.pow(current.rightEyeX - prev.rightEyeX, 2) + Math.pow(current.rightEyeY - prev.rightEyeY, 2));
            
            const allStill = noseDiff < 0.005 && chinDiff < 0.005 && leftEyeDiff < 0.005 && rightEyeDiff < 0.005;
            sessionStorage.setItem('prevFacePos', JSON.stringify(current));
            
            return allStill;
          }
          
          sessionStorage.setItem('prevFacePos', JSON.stringify(current));
        }
        
        return true; // Default to true on first frame
      },
      successMessage: "Statue vibes—stress froze solid!",
      failureMessage: "Hold it, don't crack!",
      instructions: "Keep your entire face completely still",
      icon: "cube"
    }
  ];

  // Load TensorFlow.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        // Load model from the specified path
        const loadedModel = await tf.loadLayersModel('/facevibe/model.json');
        setModel(loadedModel);
        setLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
        setModelError("Model couldn't be loaded. Using placeholder stress detection.");
        setLoading(false);
      }
    };
    
    loadModel();
    
    // Cleanup function
    return () => {
      // Clean up any TensorFlow memory
      if (model) {
        model.dispose();
      }
    };
  }, []);

  // Initialize stress check timer
  useEffect(() => {
    // Clear session storage for game state
    sessionStorage.removeItem('prevBrowPos');
    sessionStorage.removeItem('prevJawPos');
    sessionStorage.removeItem('jawJiggleCount');
    sessionStorage.removeItem('prevNostrilPos');
    sessionStorage.removeItem('nostrilFlareCount');
    sessionStorage.removeItem('prevFacePos');
    
    // Run stress detection every 1 second
    const checkStress = () => {
      if (faceVisible && landmarks) {
        // If model is loaded, use it for prediction
        if (model) {
          try {
            // Extract features from landmarks
            const features = extractFeaturesFromLandmarks(landmarks);
            
            // Make prediction
            const prediction = model.predict(features) as tf.Tensor;
            const stressPrediction = prediction.dataSync()[0];
            
            setStressLevel(stressPrediction);
            
            // Call the onStressUpdate callback if provided
            if (onStressUpdate) {
              onStressUpdate(stressPrediction);
            }
            
            prediction.dispose();
          } catch (error) {
            console.error('Error making prediction:', error);
            // Use placeholder when prediction fails
            setStressLevel(Math.random()); // Placeholder random stress level
          }
        } else {
          // Use placeholder stress detection if model failed to load
          const placeholderStress = calculatePlaceholderStress(landmarks);
          setStressLevel(placeholderStress);
          
          // Call the onStressUpdate callback if provided
          if (onStressUpdate) {
            onStressUpdate(placeholderStress);
          }
        }
      }
    };
    
    // Set up the interval
    stressCheckRef.current = window.setInterval(checkStress, 1000);
    
    // Cleanup function
    return () => {
      if (stressCheckRef.current) {
        clearInterval(stressCheckRef.current);
      }
    };
  }, [landmarks, faceVisible, model]);

  // Monitor stress level and trigger games
  useEffect(() => {
    // Only trigger games if stress is high and no active game
    if (stressLevel > 0.7 && !activeGame && faceVisible) {
      // Randomly select a game
      const randomGame = games[Math.floor(Math.random() * games.length)];
      triggerGame(randomGame);
    }
  }, [stressLevel, activeGame, faceVisible]);

  // Game progress and validation
  useEffect(() => {
    if (activeGame && gameStartTime) {
      // Update progress timer
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      
      progressTimerRef.current = window.setInterval(() => {
        const now = Date.now();
        const elapsed = now - gameStartTime;
        const progress = Math.min(100, (elapsed / (activeGame.durationSecs * 1000)) * 100);
        
        setGameProgress(progress);
        
        // Check if game completed
        if (progress >= 100) {
          completeGame(requirementsMet);
        }
      }, 50);
      
      // Set up game timer
      if (gameTimerRef.current) {
        clearTimeout(gameTimerRef.current);
      }
      
      gameTimerRef.current = window.setTimeout(() => {
        completeGame(requirementsMet);
      }, activeGame.durationSecs * 1000);
    }
    
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      
      if (gameTimerRef.current) {
        clearTimeout(gameTimerRef.current);
      }
    };
  }, [activeGame, gameStartTime, requirementsMet]);

  // Validate game requirements
  useEffect(() => {
    if (activeGame && landmarks && gameStartTime) {
      // Check if current landmarks meet game requirements
      const meetsRequirements = activeGame.validate(landmarks);
      setRequirementsMet(meetsRequirements);
      
      // Update success counter if requirements met
      if (meetsRequirements) {
        setSuccessCounter(prev => prev + 1);
      } else {
        setSuccessCounter(0); // Reset counter if requirements not met
      }
    }
  }, [landmarks, activeGame, gameStartTime]);

  // Helper functions
  
  // Function to extract features from landmarks for model input
  const extractFeaturesFromLandmarks = (landmarks: any) => {
    // Simplified feature extraction - in a real model you'd have proper feature engineering
    // Here we just flatten the first 20 landmarks as an example
    const features = [];
    for (let i = 0; i < Math.min(20, landmarks.length); i++) {
      features.push(landmarks[i].x);
      features.push(landmarks[i].y);
      features.push(landmarks[i].z);
    }
    
    // Normalize and reshape for model input
    const tensor = tf.tensor2d([features]);
    return tensor;
  };
  
  // Placeholder stress calculation when model unavailable
  const calculatePlaceholderStress = (landmarks: any) => {
    // Simple placeholder that detects tension in eyebrows and mouth
    // In a real app, you'd have a much more sophisticated model
    const leftBrow = landmarks[107];
    const rightBrow = landmarks[336];
    const mouth = Math.abs(landmarks[61].x - landmarks[291].x);
    
    // Lower mouth width and higher brow position correlate with stress
    const mouthFactor = 1 - Math.min(1, mouth * 3); // Inverted, narrower mouth = higher stress
    const browFactor = Math.max(0, Math.min(1, (leftBrow.y + rightBrow.y) / 2 - 0.3));
    
    // Combine factors with some randomness for variation
    const stress = (mouthFactor * 0.6 + browFactor * 0.4) * 0.8 + Math.random() * 0.2;
    return stress;
  };
  
  // Trigger a new game
  const triggerGame = (game: GameDefinition) => {
    setActiveGame(game);
    setGameStartTime(Date.now());
    setGameProgress(0);
    setGameSuccess(null);
    setShowModal(true);
    setRequirementsMet(false);
    setSuccessCounter(0);
    
    // Clear any previous game state
    sessionStorage.removeItem('prevBrowPos');
    sessionStorage.removeItem('prevJawPos');
    sessionStorage.removeItem('jawJiggleCount');
    sessionStorage.removeItem('prevNostrilPos');
    sessionStorage.removeItem('nostrilFlareCount');
    sessionStorage.removeItem('prevFacePos');
  };
  
  // Complete the game and determine success
  const completeGame = (success: boolean) => {
    // Clear timers
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    if (gameTimerRef.current) {
      clearTimeout(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    // Set game results
    setGameSuccess(success);
    setGameProgress(100);
    
    // Keep modal open to show results
    setTimeout(() => {
      // Auto close after showing results
      closeGame();
    }, 3000);
  };
  
  // Close the game modal
  const closeGame = () => {
    setShowModal(false);
    
    // Reset game state after animation completes
    setTimeout(() => {
      setActiveGame(null);
      setGameStartTime(null);
      setGameProgress(0);
      setGameSuccess(null);
      setSuccessCounter(0);
      setRequirementsMet(false);
    }, 500);
  };

  return (
    <div className="stress-game">
      {/* Game Modal */}
      {showModal && activeGame && (
        <div 
          className="stress-game-modal"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '200px',
            background: `linear-gradient(135deg, ${TEAL_COLOR}, ${GOLD_COLOR})`,
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            animation: 'fadeIn 0.5s ease-out'
          }}
        >
          {/* Game Header */}
          <div>
            <h3 style={{ 
              margin: '0 0 5px 0', 
              fontSize: '22px',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}>
              {activeGame.name}
            </h3>
            <p style={{ 
              margin: '0', 
              fontSize: '16px',
              opacity: 0.9 
            }}>
              {activeGame.instructions}
            </p>
          </div>
          
          {/* Game Progress */}
          <div style={{ padding: '10px 0' }}>
            {gameSuccess === null ? (
              <>
                <div style={{ 
                  height: '20px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '10px'
                }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${gameProgress}%`, 
                      background: `linear-gradient(90deg, ${TEAL_COLOR}, ${GOLD_COLOR})`,
                      transition: 'width 0.3s ease',
                      borderRadius: '10px',
                    }}
                  />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  Vibe Check: {requirementsMet ? 'Nice work!' : 'Keep trying!'}
                </div>
              </>
            ) : (
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                animation: gameSuccess ? 'successPulse 2s infinite' : 'failureFlicker 0.5s 3',
                color: gameSuccess ? TEAL_COLOR : RED_COLOR,
                textShadow: gameSuccess ? '0 0 10px rgba(0, 196, 180, 0.7)' : '0 0 10px rgba(255, 74, 74, 0.7)',
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '10px'
              }}>
                {gameSuccess ? 'Stress got VIP-slapped!' : 'Stress sneaked the crown!'}
              </div>
            )}
          </div>
          
          {/* Game Controls */}
          <div>
            {gameSuccess !== null && (
              <button 
                onClick={closeGame}
                style={{
                  backgroundColor: gameSuccess ? TEAL_COLOR : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '8px 20px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.3s ease'
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Stress Indicator (only visible when not in a game) */}
      {!activeGame && stressLevel > 0.5 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 15px',
          backgroundColor: stressLevel > 0.7 ? 'rgba(255, 74, 74, 0.9)' : 'rgba(255, 193, 7, 0.9)',
          color: 'white',
          borderRadius: '20px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          animation: stressLevel > 0.7 ? 'pulse 1s infinite' : 'none',
          transition: 'all 0.3s ease',
          zIndex: 100
        }}>
          {stressLevel > 0.7 ? 'Vibe Check Needed!' : 'Stress Rising'}
        </div>
      )}
      
      {/* Global Styles */}
      <style>
        {`
          @keyframes fadeIn {
            0% { opacity: 0; transform: translate(-50%, -60%); }
            100% { opacity: 1; transform: translate(-50%, -50%); }
          }
          
          @keyframes fadeOut {
            0% { opacity: 1; transform: translate(-50%, -50%); }
            100% { opacity: 0; transform: translate(-50%, -60%); }
          }
          
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 74, 74, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255, 74, 74, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 74, 74, 0); }
          }
          
          @keyframes successPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes failureFlicker {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          .stress-game-modal.closing {
            animation: fadeOut 0.5s ease-in forwards;
          }
          
          .stress-game button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
          }
        `}
      </style>
    </div>
  );
};

export default StressGame;