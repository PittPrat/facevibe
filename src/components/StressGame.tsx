import React, { useEffect, useState, useRef, useCallback } from 'react';
import { calculateStressLevel, ExerciseValidators } from '../utils/FacialAnalysis';

// ML Model class placeholder for future implementation
class StressMLModel {
  //private model: any = null;
  private facialBuffer: any[] = [];
  private bufferSize: number = 30; // Store 30 frames for temporal analysis
  private stressHistory: Array<{timestamp: number, score: number}> = [];
  
  constructor() {
    // Will load pre-trained model in future implementation
    this.initModel();
  }
  
  private async initModel() {
    // Placeholder for loading TensorFlow.js or similar ML model
    // this.model = await tf.loadLayersModel('stress_detection_model/model.json');
    console.log('ML model would be initialized here in future implementation');
  }
  
  //to be implemented
  //private preprocessLandmarks(landmarks: any) {
    // Extract relevant features from face landmarks
    // Will convert to tensor format expected by model
    // Example features: distance ratios, normalized positions, etc.
    //return landmarks;
  //}
  
  private updateBuffer(landmarks: any) {
    // Add new landmarks to buffer for temporal analysis
    this.facialBuffer.push(landmarks);
    
    // Keep buffer at fixed size
    if (this.facialBuffer.length > this.bufferSize) {
      this.facialBuffer.shift();
    }
  }
  
  //to be implemented
  //private extractTemporalFeatures() {
    // Extract features that capture changes over time
    // Movement speeds, expression transitions, etc.
    //return {
      //temporalFeatures: this.facialBuffer.length > 0 ? 'temporal_features_extracted' : null
    //};
  //}
  
  async detectStress(faceMeshLandmarks: any): Promise<{stressLevel: number, confidence: number, timePattern: any} | null> {
    if (!faceMeshLandmarks) return null;
    
    // Update buffer with new landmarks
    this.updateBuffer(faceMeshLandmarks);
    
    // In an actual implementation, we would:
    // 1. Process the current frame
    // 2. Process temporal features
    // 3. Combine features and run inference
    // 4. Update stress history
    
    // For now, fall back to heuristic calculation
    const stressScore = calculateStressLevel(faceMeshLandmarks);
    
    // Update stress history
    this.stressHistory.push({
      timestamp: Date.now(),
      score: stressScore
    });
    
    // Keep history length reasonable
    if (this.stressHistory.length > 100) {
      this.stressHistory = this.stressHistory.slice(-100);
    }
    
    return {
      stressLevel: stressScore * 100,
      confidence: 0.7, // Placeholder confidence
      timePattern: this.analyzeStressOverTime()
    };
  }
  
  private analyzeStressOverTime() {
    // Analyze patterns in stress history
    // Detect sustained stress, stress spikes, etc.
    
    if (this.stressHistory.length < 5) return { trend: 'insufficient_data' };
    
    const recentStress = this.stressHistory.slice(-5);
    const avgRecentStress = recentStress.reduce((a, b) => a + b.score, 0) / recentStress.length;
    const firstHalf = recentStress.slice(0, Math.floor(recentStress.length / 2));
    const secondHalf = recentStress.slice(Math.floor(recentStress.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b.score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b.score, 0) / secondHalf.length;
    
    return {
      trend: secondHalfAvg > firstHalfAvg ? 'increasing' : secondHalfAvg < firstHalfAvg ? 'decreasing' : 'stable',
      sustainedStress: avgRecentStress > 0.7,
      variability: 'medium' // Placeholder
    };
  }
}

interface StressGameProps {
  landmarks: any;
  faceVisible: boolean;
  onStressUpdate?: (newStressLevel: number) => void;
  isFullScreen?: boolean;
  useMLModel?: boolean; // Flag to switch between heuristic and ML models
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
  category?: string; // Added for categorization (relaxation, mindfulness, etc.)
  difficulty?: 'easy' | 'medium' | 'hard'; // Added for difficulty levels
}

const StressGame: React.FC<StressGameProps> = ({ 
  landmarks, 
  faceVisible, 
  onStressUpdate, 
  isFullScreen = false,
  useMLModel = false // Default to heuristic model
}) => {
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  //const [gameProgress, setGameProgress] = useState<number>(0);
  //const [gameSuccess, setGameSuccess] = useState<boolean | null>(null);
  //const [showModal, setShowModal] = useState<boolean>(false);
  const [requirementsMet, setRequirementsMet] = useState<boolean>(false);
  const [stressHistory, setStressHistory] = useState<number[]>([]);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [mlModelReady, setMlModelReady] = useState<boolean>(false);
  
  // References for timers to clean up
  const stressCheckRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  // ML model reference
  const mlModelRef = useRef<StressMLModel | null>(null);
  
  // Premium colors
  const TEAL_COLOR = "#C49A7E"; // Changed from "#00C4B4" to match app's beige/warm color scheme
  // const GOLD_COLOR = "#FFD700";
  // const RED_COLOR = "#FF4A4A"; 

  // Define the 10 CBT mini-games with specific validation
  const games: GameDefinition[] = [
    {
      id: "smile-snipe",
      name: "Smile Snipe",
      description: "Maintain a wide smile to snipe away stress gremlins",
      durationSecs: 30,
      validate: ExerciseValidators.smileyStretch,
      successMessage: "Grin's too posh for gremlins—snipe win!",
      failureMessage: "Smile harder, stress is dodging!",
      instructions: "Smile wide to snipe stress gremlins",
      icon: "smile-beam",
      category: "positive-affect",
      difficulty: "easy"
    },
    {
      id: "brow-chill",
      name: "Brow Chill",
      description: "Keep your brows relaxed and still to freeze stress",
      durationSecs: 30,
      validate: (landmarks) => {
        // Modified validation for relaxed, not raised brows
        return !ExerciseValidators.browLifter(landmarks);
      },
      successMessage: "Brows on vacay—stress canceled deluxe!",
      failureMessage: "Chill those caterpillars, fam!",
      instructions: "Relax your eyebrows completely",
      icon: "ice-cube",
      category: "relaxation",
      difficulty: "medium"
    },
    {
      id: "breath-blast",
      name: "Breath Blast",
      description: "Deep breathing to blast away tension",
      durationSecs: 30,
      validate: (landmarks) => {
        // Placeholder: no chest detection, use mouth and jaw movement as proxy
        const jawDropAmount = ExerciseValidators.jawDropper(landmarks);
        
        // Get time since start
        const now = Date.now();
        const elapsed = now - (gameStartTime || now);
        
        // We want to see oscillation between open and closed mouth
        // This simulates breathing rhythm
        const cycleTime = 4000; // 4 seconds per breath cycle
        const phase = (elapsed % cycleTime) / cycleTime;
        
        // In first half of cycle, jaw should be dropped (inhale)
        // In second half, jaw should be closed (exhale)
        if (phase < 0.5) {
          return jawDropAmount; // Jaw should be open during inhale
        } else {
          return !jawDropAmount; // Jaw should be closed during exhale
        }
      },
      successMessage: "Blast stress with air power—vibe titan!",
      failureMessage: "Breathe deeper, rookie!",
      instructions: "Take slow, deep breaths (4s in, 4s out)",
      icon: "wind",
      category: "breathing",
      difficulty: "medium"
    },
    {
      id: "eye-rest",
      name: "Eye Rest",
      description: "Close your eyes for a quick refreshing break",
      durationSecs: 5,
      validate: (landmarks) => {
        // Check if eyes are closed - invert the eye winker validation
        const leftEyeOpening = Math.abs(
          landmarks[159].y - landmarks[145].y
        );
        const rightEyeOpening = Math.abs(
          landmarks[386].y - landmarks[374].y
        );
        
        // Return true if both eyes are nearly closed
        return leftEyeOpening < 0.01 && rightEyeOpening < 0.01;
      },
      successMessage: "Peepers napped—stress got zapped!",
      failureMessage: "Close 'em longer, vibe slacker!",
      instructions: "Close your eyes completely for 5 seconds",
      icon: "eye-slash",
      category: "relaxation",
      difficulty: "easy"
    },
    {
      id: "jaw-jiggle",
      name: "Jaw Jiggle",
      description: "Wiggle your jaw to shake out tension",
      durationSecs: 30,
      validate: (landmarks) => {
        // We need to track jaw movement over time
        const chin = landmarks[152];
        const prev = gameStartTime ? JSON.parse(sessionStorage.getItem('prevJawPos') || '{}') : null;
        const jiggleCount = parseInt(sessionStorage.getItem('jawJiggleCount') || '0');
        
        if (gameStartTime) {
          const current = { y: chin.y };
          
          if (prev && prev.y) {
            const yDiff = Math.abs(current.y - prev.y);
            
            if (yDiff > 0.02) { // Significant movement threshold
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
      icon: "waveform",
      category: "physical-release",
      difficulty: "medium"
    },
    {
      id: "positive-reframe",
      name: "Positive Reframe",
      description: "Smile to reframe negative thoughts positively",
      durationSecs: 30,
      validate: ExerciseValidators.smileyStretch, // Same as smile snipe but with different context
      successMessage: "Zen boss mode—stress reframed elite!",
      failureMessage: "Smile and reframe, you're halfway!",
      instructions: "Smile wide while thinking positive thoughts",
      icon: "brain",
      category: "cognitive",
      difficulty: "medium"
    },
    {
      id: "cheek-drop",
      name: "Cheek Drop",
      description: "Relax your cheeks to release tension",
      durationSecs: 30,
      validate: (landmarks) => {
        // Opposite of cheek puffer - we want relaxed, not puffed cheeks
        return !ExerciseValidators.cheekPuffer(landmarks);
      },
      successMessage: "Chipmunk vibes dropped—stress KO'd!",
      failureMessage: "Relax those cheeks, fam!",
      instructions: "Relax your cheeks completely",
      icon: "face-smile-relaxed",
      category: "relaxation",
      difficulty: "easy"
    },
    {
      id: "lip-loosen",
      name: "Lip Loosen",
      description: "Loosen your lips to release facial tension",
      durationSecs: 30,
      validate: (landmarks) => {
        // Check for relaxed lips (not pursed)
        return !ExerciseValidators.lipPucker(landmarks);
      },
      successMessage: "Lips too chill for vaults—vibe win!",
      failureMessage: "Loosen up, tension's tight!",
      instructions: "Relax your lips completely",
      icon: "mouth",
      category: "relaxation",
      difficulty: "easy"
    },
    {
      id: "nose-flare",
      name: "Nose Flare",
      description: "Flare your nostrils to release trapped stress",
      durationSecs: 30,
      validate: (landmarks) => {
        // Need to track movement over time
        const leftNostril = landmarks[102];
        const rightNostril = landmarks[331];
        const prev = gameStartTime ? JSON.parse(sessionStorage.getItem('prevNostrilPos') || '{}') : null;
        const flareCount = parseInt(sessionStorage.getItem('nostrilFlareCount') || '0');
        
        if (gameStartTime) {
          const current = { leftX: leftNostril.x, rightX: rightNostril.x };
          
          if (prev && prev.leftX && prev.rightX) {
            const leftDiff = Math.abs(current.leftX - prev.leftX);
            const rightDiff = Math.abs(current.rightX - prev.rightX);
            
            if (leftDiff > 0.005 && rightDiff > 0.005) { // Threshold for nostril flare
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
      icon: "nose",
      category: "physical-release",
      difficulty: "hard"
    },
    {
      id: "face-freeze",
      name: "Face Freeze",
      description: "Freeze your face to solidify your calm",
      durationSecs: 15,
      validate: (landmarks) => {
        // Check for minimal movement across all facial features
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
          
          if (prev && prev.noseX) { // Check if we have previous data
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
      icon: "cube",
      category: "mindfulness",
      difficulty: "hard"
    }
  ];

  // Initialize ML model if enabled
  useEffect(() => {
    if (useMLModel && !mlModelRef.current) {
      mlModelRef.current = new StressMLModel();
      
      // In a real implementation, we would wait for model to load
      // For now, just set as ready after a short delay
      setTimeout(() => {
        setMlModelReady(true);
      }, 1000);
    }
    
    // Clear session storage for game state
    sessionStorage.removeItem('prevBrowPos');
    sessionStorage.removeItem('prevJawPos');
    sessionStorage.removeItem('jawJiggleCount');
    sessionStorage.removeItem('prevNostrilPos');
    sessionStorage.removeItem('nostrilFlareCount');
    sessionStorage.removeItem('prevFacePos');
    
    // Cleanup function
    return () => {
      if (stressCheckRef.current) {
        clearInterval(stressCheckRef.current);
      }
      
      if (gameTimerRef.current) {
        clearTimeout(gameTimerRef.current);
      }
      
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [useMLModel]);

  // Stress check function - implemented as useCallback to avoid recreating on every render
  const checkStress = useCallback(async () => {
    const now = Date.now();
    // Only check if 30 seconds have passed since last check, or if it's the initial check
    if (now - lastCheckTimeRef.current < 30000 && lastCheckTimeRef.current !== 0) {
      return;
    }
  
    // Update the last check time
    lastCheckTimeRef.current = now;
    
    if (faceVisible && landmarks) {
      let newStressLevel: number;
      
      if (useMLModel && mlModelRef.current) {
        // Use ML model if enabled and ready
        const mlResult = await mlModelRef.current.detectStress(landmarks);
        newStressLevel = mlResult ? mlResult.stressLevel / 100 : 0.3;
      } else {
        // Use heuristic-based stress calculation
        newStressLevel = calculateStressLevel(landmarks);
      }
      
      setStressLevel(newStressLevel);
      
      // Update stress history for trend analysis
      setStressHistory(prev => {
        const updated = [...prev, newStressLevel];
        // Keep only the last 30 readings
        if (updated.length > 30) {
          return updated.slice(-30);
        }
        return updated;
      });
      
      // Call the onStressUpdate callback if provided
      if (onStressUpdate) {
        onStressUpdate(newStressLevel);
      }
    } else {
      // If no landmarks data, set a default stress level to ensure component is visible
      const defaultStressLevel = 0.3; // Low default stress level
      setStressLevel(defaultStressLevel);
      
      if (onStressUpdate) {
        onStressUpdate(defaultStressLevel);
      }
    }
  }, [landmarks, faceVisible, useMLModel, onStressUpdate]);

  // Initialize stress check timer and run initial check
  useEffect(() => {
    // Run initial check immediately
    checkStress();
    
    // Set up the interval for every 30 seconds
    stressCheckRef.current = window.setInterval(checkStress, 5000);
    
    // Cleanup function
    return () => {
      if (stressCheckRef.current) {
        clearInterval(stressCheckRef.current);
        stressCheckRef.current = null;
      }
    };
  }, [checkStress]);
  
  // Add state for tracking game cooldown
  const [lastGameEndTime, setLastGameEndTime] = useState<number>(0);
  const GAME_COOLDOWN_MS = 60000; // 1 minute cooldown between games

  // Helper function to determine stress trend
  const getStressTrend = (history: number[]): string => {
    if (history.length < 5) return 'Monitoring...';
    
    // Get last few measurements
    const recent = history.slice(-5);
    const first = recent.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const last = recent.slice(-2).reduce((a, b) => a + b, 0) / 2;
    
    if (last - first > 0.1) return '↑ Rising';
    if (first - last > 0.1) return '↓ Declining';
    return '→ Stable';
  };

  // Then update this useEffect:
  useEffect(() => {
    // Check cooldown period first
    const now = Date.now();
    const cooldownElapsed = now - lastGameEndTime > GAME_COOLDOWN_MS;

    // Only trigger games if outside cooldown period and other conditions are met
    if (stressLevel > 0.7 && !activeGame && faceVisible && cooldownElapsed) {
      // Analyze stress trend to confirm consistent high stress
      const recentStress = stressHistory.slice(-5); // Last 5 seconds
      if (recentStress.length >= 5) {
        const avgRecentStress = recentStress.reduce((a, b) => a + b, 0) / recentStress.length;
        // Make threshold higher (0.7 instead of 0.65)
        if (avgRecentStress > 0.7) {
          // Add randomness (50% chance)
          if (Math.random() > 0.5) {
            // Get appropriate games based on stress level
            let eligibleGames = [...games];
            
            // Filter games by difficulty based on stress level
            if (stressLevel > 0.9) {
              // For very high stress, prefer easier games
              eligibleGames = eligibleGames.filter(g => g.difficulty === 'easy');
            } else if (stressLevel > 0.8) {
              // For high stress, avoid hard games
              eligibleGames = eligibleGames.filter(g => g.difficulty !== 'hard');
            }
            
            // If we filtered out all games, fall back to the full list
            if (eligibleGames.length === 0) {
              eligibleGames = games;
            }
            
            // Randomly select a game from eligible games
            const randomGame = eligibleGames[Math.floor(Math.random() * eligibleGames.length)];
            triggerGame(randomGame);
          }
        }
      }
    }
  }, [stressLevel, activeGame, faceVisible, stressHistory, lastGameEndTime]);

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
        
        //setGameProgress(progress);
        
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
    }
  }, [landmarks, activeGame, gameStartTime]);

  // Helper functions
  
  // Trigger a new game
  const triggerGame = (game: GameDefinition) => {
    setActiveGame(game);
    setGameStartTime(Date.now());
    //setGameProgress(0);
    //setGameSuccess(null);
    //setShowModal(true);
    setRequirementsMet(false);
    
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
    //setGameSuccess(success);
    //setGameProgress(100);
    
    // If game was successful, reduce stress level slightly
    if (success) {
      setStressLevel(prev => Math.max(0, prev - 0.2));
      
      // Update parent component if callback provided
      if (onStressUpdate) {
        onStressUpdate(Math.max(0, stressLevel - 0.2));
      }
    }
    
    // Keep modal open to show results
    setTimeout(() => {
      // Auto close after showing results
      closeGame();
    }, 3000);
  };
  
  // Close the game modal
  const closeGame = () => {
    //setShowModal(false);
    
    // Set the last game end time to now
    setLastGameEndTime(Date.now());
    
    setTimeout(() => {
      setActiveGame(null);
      setGameStartTime(null);
      //setGameProgress(0);
      //setGameSuccess(null);
      setRequirementsMet(false);
    }, 500);
  };
  
  // Toggle minimized state
  const toggleMinimized = () => {
    setMinimized(!minimized);
  };

  return (
    <div className="stress-game">
      {/* Loading indicator for ML model */}
      {useMLModel && !mlModelReady && (
        <div style={{
          position: 'fixed',
          left: '20px',
          top: isFullScreen ? '80px' : '50%',
          transform: isFullScreen ? 'none' : 'translateY(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '20px',
          fontSize: '14px',
          zIndex: 200
        }}>
          Loading ML model...
        </div>
      )}
    
      {/* Minimized stress tracker - Removed as requested */}
      {/* {minimized && !activeGame && (
        <div 
          onClick={toggleMinimized}
          style={{
            position: 'fixed',
            left: '20px',
            top: isFullScreen ? '80px' : '50%',
            transform: isFullScreen ? 'none' : 'translateY(-50%)',
            backgroundColor: stressLevel > 0.7 ? 'rgba(255, 74, 74, 0.9)' : 'rgba(0, 196, 180, 0.9)',
            color: 'white',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '22px',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            zIndex: 200,
            transition: 'all 0.3s ease',
            animation: stressLevel > 0.7 ? 'pulse 1.5s infinite' : 'none',
          }}
        >
          <div style={{
            fontSize: '22px',
            fontWeight: 'bold',
          }}>
            {Math.round(stressLevel * 100)}%
          </div>
        </div>
      )} */}
      
      {/* Expanded stress tracker - always show even when stressLevel is 0 */}
      {!minimized && !activeGame && (
        <div style={{
          position: 'fixed',
          left: '20px',
          top: isFullScreen ? '80px' : '50%',
          transform: isFullScreen ? 'none' : 'translateY(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '15px',
          width: '120px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100,
          transition: 'all 0.3s ease',
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            background: `conic-gradient(${TEAL_COLOR} ${stressLevel * 360}deg, rgba(255,255,255,0.2) 0deg)`
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '16px',
              color: 'white'
            }}>
              {Math.round(stressLevel * 100)}%
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h4 style={{
              margin: '0',
              fontSize: '14px',
              color: 'white'
            }}>
              {useMLModel ? 'ML Stress' : 'Stress Level'}
            </h4>
            
            {/* Stress trend indicator */}
            {stressHistory.length > 5 && (
              <div style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                marginTop: '5px'
              }}>
                {getStressTrend(stressHistory)}
              </div>
            )}
          </div>
          
          {/* Minimize button */}
          <button
            onClick={toggleMinimized}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '14px',
              cursor: 'pointer',
              position: 'absolute',
              top: '5px',
              right: '5px'
            }}
          >
            -
          </button>
        </div>
      )}
    </div>
  );
};

export default StressGame;