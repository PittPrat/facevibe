import React, { useState, useEffect, useCallback, useRef } from 'react';
import ExerciseTracker from './components/ExerciseTracker';
import StressGame from './components/StressGame';
import TrainerChat from './components/TrainerChat';
import ResilienceTracker from './components/ResilienceTracker';
import SocialStreaks from './components/SocialStreaks';

// Logo component with stylized face
const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <img 
      src={`./assets/Logo.png`} 
      alt="FaceVibe Logo" 
      style={{ width: '30px', height: 'auto' }} 
    />
    <span style={{ 
      fontFamily: 'serif', 
      fontSize: '28px',
      fontWeight: 300,
      cursor: 'pointer',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(90deg, #8D8D8D, #C49A7E)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }}>FaceVibe</span>
  </div>
);

const App: React.FC = () => {
  // Core state
  const [exerciseCount, setExerciseCount] = useState<number>(0);
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [exerciseDoneToday, setExerciseDoneToday] = useState<boolean>(false);
  const [landmarks, setLandmarks] = useState<any>(null);
  const [faceVisible, setFaceVisible] = useState<boolean>(false);
  const [exerciseProgress, setExerciseProgress] = useState<number>(0);
  const [currentExercise, setCurrentExercise] = useState<string>('');
  const [trainerChatMinimized, setTrainerChatMinimized] = useState<boolean>(true);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  
  // Prevent infinite loop by using ref for previous minimized state
  const prevMinimizedRef = useRef(trainerChatMinimized);
  
  // Handle trainer chat minimization state
  const handleTrainerChatMinimized = useCallback((minimized: boolean) => {
    if (minimized !== prevMinimizedRef.current) {
      prevMinimizedRef.current = minimized;
      setTrainerChatMinimized(minimized);
    }
  }, []);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'exercise' | 'progress'>('exercise');
  const [appStarted, setAppStarted] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'default' | 'calm' | 'energy'>('default');
  const [showIntro, setShowIntro] = useState<boolean>(true);
  
  // Premium colors - updated to match Figma design
  const getThemeColors = () => {
    switch (theme) {
      case 'calm':
        return {
          primary: "#8D8D8D", // Gray
          secondary: "#C49A7E", // Beige
          accent: "#E1DDD1", // Light beige
          background: "#F8F6F2", // Off-white
          text: "#2E2E2E" // Dark gray
        };
      case 'energy':
        return {
          primary: "#C49A7E", // Beige
          secondary: "#8D8D8D", // Gray
          accent: "#E1DDD1", // Light beige
          background: "#F8F6F2", // Off-white
          text: "#2E2E2E" // Dark gray
        };
      default:
        return {
          primary: "#8D8D8D", // Gray
          secondary: "#C49A7E", // Beige
          accent: "#E1DDD1", // Light beige
          background: "#F8F6F2", // Off-white
          text: "#2E2E2E" // Dark gray
        };
    }
  };
  
  const themeColors = getThemeColors();

  // Handle landmark data from ExerciseTracker
  const handleLandmarkUpdate = useCallback((newLandmarks: any, visible: boolean) => {
    setLandmarks(newLandmarks);
    setFaceVisible(visible);
  }, []);

  // Handle exercise completion
  const handleExerciseComplete = useCallback(() => {
    console.log(completedExercises);
    // Only increment the count if this is a unique exercise
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      // If this exercise wasn't already completed, add it and increment the count
      if (!prev.has(currentExercise)) {
        newSet.add(currentExercise);
        setExerciseCount(Math.min(10, newSet.size));
      }
      return newSet;
    });
    
    setExerciseDoneToday(true);
    
    // Update localStorage to mark exercise as done today
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('last_exercise_date', today);
  }, [currentExercise]);

  // Handle stress level updates
  const handleStressUpdate = useCallback((newStressLevel: number) => {
    setStressLevel(newStressLevel);
  }, []);

  // Handle exercise selection
  const handleExerciseSelection = useCallback((exercise: string) => {
    setCurrentExercise(exercise);
  }, []);

  // Handle progress update
  const handleProgressUpdate = useCallback((progress: number) => {
    setExerciseProgress(progress);
  }, []);

  // Load user preferences and check exercise status
  useEffect(() => {
    // Check if exercise was done today
    const today = new Date().toISOString().split('T')[0];
    const lastExerciseDate = localStorage.getItem('last_exercise_date');
    
    if (lastExerciseDate === today) {
      setExerciseDoneToday(true);
    }
    
    // Check screen size for responsive design
    const handleResize = () => {
      setIsFullScreen(window.innerWidth < 600);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Add debug info to track camera status
  useEffect(() => {
    if (appStarted) {
      // Add a small debugging element to show camera status
      const debugElement = document.createElement('div');
      debugElement.id = 'camera-debug';
      debugElement.style.position = 'fixed';
      debugElement.style.bottom = '70px';
      debugElement.style.right = '10px';
      debugElement.style.backgroundColor = 'rgba(0,0,0,0.6)';
      debugElement.style.color = 'white';
      debugElement.style.padding = '5px 8px';
      debugElement.style.fontSize = '12px';
      debugElement.style.borderRadius = '4px';
      debugElement.style.zIndex = '9999';
      debugElement.innerHTML = 'Camera: Initializing...';
      document.body.appendChild(debugElement);
      
      // Check camera status every second
      const interval = setInterval(() => {
        navigator.mediaDevices.enumerateDevices()
          .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            if (videoDevices.length > 0) {
              debugElement.innerHTML = `Camera: Available (${videoDevices.length})`;
              debugElement.style.backgroundColor = 'rgba(141,141,141,0.6)';
              // Remove after 5 seconds if camera is working
              setTimeout(() => {
                if (document.body.contains(debugElement)) {
                  document.body.removeChild(debugElement);
                }
              }, 5000);
              clearInterval(interval);
            }
          })
          .catch(err => {
            debugElement.innerHTML = `Camera Error: ${err.name}`;
            debugElement.style.backgroundColor = 'rgba(255,0,0,0.6)';
          });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        if (document.body.contains(debugElement)) {
          document.body.removeChild(debugElement);
        }
      };
    }
  }, [appStarted]);

  // Toggle fullscreen mode
  // const toggleFullScreen = () => {
  //   if (!document.fullscreenElement) {
  //     document.documentElement.requestFullscreen().catch(err => {
  //       console.error(`Error attempting to enable fullscreen: ${err.message}`);
  //     });
  //   } else {
  //     if (document.exitFullscreen) {
  //       document.exitFullscreen();
  //     }
  //   }
  // };
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);
  
  useEffect(() => {
    // Load MediaPipe scripts once at app startup
    const loadMediaPipeScripts = async () => {
      try {
        // Check if already loaded
        if ((window as any).FaceMesh && (window as any).Camera) {
          console.log("MediaPipe scripts already loaded");
          return;
        }
        
        console.log("Loading MediaPipe scripts globally");
        
        // Setup the Module object to prevent WASM error
        (window as any).Module = { 
          arguments_: [],
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          }
        };
        
        // Load Face Mesh script
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
        
        // Load Camera Utils script
        await new Promise((resolve, reject) => {
          const cameraScript = document.createElement('script');
          cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js';
          cameraScript.async = true;
          cameraScript.onload = resolve;
          cameraScript.onerror = reject;
          document.body.appendChild(cameraScript);
        });
        
        console.log("MediaPipe scripts loaded successfully");
      } catch (error) {
        console.error("Error loading MediaPipe scripts:", error);
      }
    };
    
    loadMediaPipeScripts();
  }, []);

  // Start the app
  const startApp = () => {
    try {
      // Force request camera permissions immediately
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          setAppStarted(true);
          setShowIntro(false);
        })
        .catch(err => {
          console.error('Camera permission error:', err);
          alert('FaceVibe needs your face—allow camera access in your browser settings!');
        });
    } catch (error) {
      console.error('Error starting FaceVibe:', error);
      alert('FaceVibe needs your face—allow camera access!');
    }
  };

  // Render landing page based on Figma design
  if (showIntro) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        background: themeColors.background,
        color: themeColors.text,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'flex-start',
          padding: '0 40px',
          marginBottom: '40px'
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 'normal',
            fontFamily: 'serif',
          }}>
            <Logo />
          </div>
        </div>
        
        {/* Main content area */}
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px',
          gap: '40px',
          padding: '0 20px'
        }}>
          {/* Face illustration */}
          <div style={{
            width: window.innerWidth < 768 ? '280px' : '380px',
            height: window.innerWidth < 768 ? '280px' : '380px',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
          }}>
            <img 
              src={'./assets/face-illustration-colored.jpg'} 
              alt="Face Illustration" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                objectPosition: 'center'
              }} 
            />
          </div>
          
          {/* Text content */}
          <div style={{
            maxWidth: '500px',
            textAlign: 'left',
            padding: window.innerWidth < 768 ? '0 20px' : '0'
          }}>
            <h1 style={{
              fontSize: window.innerWidth < 768 ? '32px' : '48px',
              fontWeight: 'normal',
              marginBottom: '16px',
              fontFamily: 'serif',
              letterSpacing: '1px',
              color: themeColors.text
            }}>
              Relieve Stress through Facial Exercises
            </h1>
            
            <h2 style={{
              fontSize: window.innerWidth < 768 ? '18px' : '24px',
              fontWeight: 'normal',
              marginBottom: '40px',
              fontFamily: 'serif',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: themeColors.text
            }}>
              Stress Relief & Mindfulness
            </h2>
            
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 40px 0'
            }}>
              {[
                {text: 'Train Your Face', color: themeColors.primary},
                {text: 'Calm Your Mind', color: themeColors.secondary},
                {text: 'Build Resilience', color: '#E1DDD1'}
              ].map((item, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  fontFamily: 'serif',
                  fontSize: '22px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    marginRight: '16px'
                  }}></div>
                  {item.text}
                </li>
              ))}
            </ul>
            
            <button
              onClick={startApp}
              style={{
                backgroundColor: '#A3B1AB',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                padding: '16px 40px',
                fontSize: '18px',
                fontWeight: 'normal',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                fontFamily: 'serif'
              }}
            >
              VIBE UP !
            </button>
          </div>
        </div>
        
        {/* Theme selector - subtly positioned at the bottom */}
        <div style={{
          position: 'absolute',
          bottom: '30px',
          display: 'flex',
          gap: '15px'
        }}>
          <div
            onClick={() => setTheme('default')}
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#8D8D8D',
              borderRadius: '50%',
              cursor: 'pointer',
              border: theme === 'default' ? '2px solid #2E2E2E' : 'none',
              opacity: 0.7
            }}
          />
          <div
            onClick={() => setTheme('calm')}
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#A3B1AB',
              borderRadius: '50%',
              cursor: 'pointer',
              border: theme === 'calm' ? '2px solid #2E2E2E' : 'none',
              opacity: 0.7
            }}
          />
          <div
            onClick={() => setTheme('energy')}
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#C49A7E',
              borderRadius: '50%',
              cursor: 'pointer',
              border: theme === 'energy' ? '2px solid #2E2E2E' : 'none', 
              opacity: 0.7
            }}
          />
        </div>
      </div>
    );
  }

  // Rest of the app remains the same as before with small theme updates
  return (
    <div className="facevibe-app" style={{
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '0',
      fontFamily: 'sans-serif',
      backgroundColor: themeColors.background,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* App Header */}
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: 'rgba(248, 246, 242, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(141, 141, 141, 0.2)',
        zIndex: 900
      }}>
        <h1 style={{
          color: themeColors.text,
          fontSize: '24px',
          margin: 0,
          fontWeight: 'normal',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Logo />
        </h1>
        
        {/* <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={toggleFullScreen}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: themeColors.text,
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '20px', marginRight: '5px' }}>
              {isFullScreen ? '↙️' : '↗️'}
            </span>
          </button>
        </div> */}
      </header>
      
      {/* Navigation Tabs */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        backgroundColor: 'rgba(248, 246, 242, 0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(141, 141, 141, 0.2)',
        zIndex: 900
      }}>
        <div
          onClick={() => setActiveTab('exercise')}
          style={{
            padding: '15px 20px',
            fontSize: '16px',
            fontWeight: 'normal',
            color: activeTab === 'exercise' ? themeColors.secondary : themeColors.text,
            borderBottom: activeTab === 'exercise' ? `2px solid ${themeColors.secondary}` : 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            textAlign: 'center',
            flex: 1,
            fontFamily: 'serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img 
            src={`./assets/Exercise.png`} 
            alt="Exercise" 
            style={{ 
              width: '20px', 
              height: '20px', 
              marginRight: '8px',
              opacity: activeTab === 'exercise' ? 1 : 0.7
            }} 
          />
          Exercises
        </div>
        
        <div
          onClick={() => setActiveTab('progress')}
          style={{
            padding: '15px 20px',
            fontSize: '16px',
            fontWeight: 'normal',
            color: activeTab === 'progress' ? themeColors.secondary : themeColors.text,
            borderBottom: activeTab === 'progress' ? `2px solid ${themeColors.secondary}` : 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            textAlign: 'center',
            flex: 1,
            fontFamily: 'serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img 
            src={`./assets/Progress.png`} 
            alt="Progress" 
            style={{ 
              width: '20px', 
              height: '20px', 
              marginRight: '8px',
              opacity: activeTab === 'progress' ? 1 : 0.7
            }} 
          />
          Progress
        </div>
      </div>
      {/* Main content area */}
      {activeTab === 'exercise' ? (
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          backgroundColor: '#000',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <ExerciseTracker
            videoConstraints={{
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              facingMode: "user"
            }}
            onLandmarkUpdate={handleLandmarkUpdate}
            onExerciseComplete={handleExerciseComplete}
            onExerciseSelection={handleExerciseSelection}
            onProgressUpdate={handleProgressUpdate}
            exerciseCount={exerciseCount}
          />
          <StressGame
            landmarks={landmarks}
            faceVisible={faceVisible}
            onStressUpdate={handleStressUpdate}
            isFullScreen={isFullScreen}
          />
          <TrainerChat
            exerciseProgress={exerciseProgress}
            currentExercise={currentExercise}
            isInSidePanel={true}
            onMinimizedChange={handleTrainerChatMinimized}
          />
        </div>
      ) : (
        // Progress tab content
        <div style={{
          position: 'absolute',
          top: '80px',
          bottom: '60px',
          left: 0,
          right: 0,
          overflowY: 'auto',
          padding: '15px',
          backgroundColor: themeColors.background
        }}>
          {/* Main container with specific column layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            maxWidth: '1400px',
            margin: '0 auto',
            height: '100%'
          }}>
            {/* Column 1 - Persona, slogan and wellness tips */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: 'auto',
              padding: '10px 0',
              order: 1
            }}>
              <div style={{
                marginBottom: '20px'
              }}>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  color: themeColors.text,
                  fontWeight: 'normal',
                  margin: '0',
                  paddingBottom: '15px',
                  borderBottom: `1px solid ${themeColors.accent}`,
                  marginBottom: '15px'
                }}>
                  Hello Leonard,
                </h2>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: 'clamp(20px, 3vw, 26px)',
                  color: themeColors.text,
                  fontWeight: 'normal',
                  margin: '0 0 5px 0',
                  lineHeight: '1.4',
                  letterSpacing: '0.5px'
                }}>
                  Awaken Your Face.
                </h3>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: 'clamp(20px, 3vw, 26px)',
                  color: themeColors.text,
                  fontWeight: 'normal',
                  margin: '0',
                  lineHeight: '1.4',
                  letterSpacing: '0.5px'
                }}>
                  Awaken Your Mind.
                </h3>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                padding: '10px',
                marginTop: '10px',
                marginBottom: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                maxHeight: '180px'
              }}>
                <img 
                  src="./assets/Persona.png"
                  alt="Meditation Persona" 
                  style={{
                    width: '100%',
                    maxWidth: '200px',
                    objectFit: 'contain'
                  }}
                />
              </div>
              
              {/* Wellness Tips - moved to first column */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '15px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                border: `1px solid ${themeColors.accent}`,
                marginBottom: '10px'
              }}>
                <h3 style={{
                  margin: '0 0 10px 0',
                  color: themeColors.text,
                  fontSize: 'clamp(18px, 2.5vw, 22px)',
                  borderBottom: `1px solid ${themeColors.accent}`,
                  paddingBottom: '10px',
                  fontFamily: 'serif',
                  fontWeight: 'normal',
                  textAlign: 'center',
                  letterSpacing: '0.5px'
                }}>
                  Wellness Tips
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  <p style={{
                    margin: '0 0 10px 0',
                    fontSize: '15px',
                    fontWeight: 'normal',
                    color: '#A3B1AB',
                    fontFamily: 'serif'
                  }}>
                    <span style={{ fontWeight: 'bold', color: themeColors.text }}>Tip:</span> Practice facial exercises for 5 minutes daily to reduce tension and improve circulation.
                  </p>
                  <p style={{
                    margin: '0',
                    fontSize: '15px',
                    fontWeight: 'normal',
                    color: '#A3B1AB',
                    fontFamily: 'serif'
                  }}>
                    <span style={{ fontWeight: 'bold', color: themeColors.text }}>Insight:</span> Facial exercises can reduce stress by releasing tension in jaw and forehead muscles.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Column 2 - Resilience Tracker */}
            <div style={{
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              order: 2
            }}>
              <div style={{
                flex: '1',
                minHeight: '200px',
                maxHeight: '500px'
              }}>
                <ResilienceTracker
                  exerciseCount={exerciseCount}
                  stress={stressLevel}
                />
              </div>
            </div>
            
            {/* Column 3 - Vibe Streaks */}
            <div style={{
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              order: 3
            }}>
              <SocialStreaks
                exerciseDoneToday={exerciseDoneToday}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Start Button (only when not started) */}
      {!appStarted && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 100
        }}>
          <button
            onClick={startApp}
            style={{
              backgroundColor: themeColors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              fontSize: '24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
              cursor: 'pointer'
            }}
          >
            ▶️
          </button>
        </div>
      )}
      
      {/* Global animations */}
      <style>
        {`
          @keyframes fadeIn {
            0% { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
          
          @keyframes pulse {
            0% { box-shadow: 0 0 5px rgba(196, 154, 126, 0.7); }
            50% { box-shadow: 0 0 20px rgba(196, 154, 126, 0.9); }
            100% { box-shadow: 0 0 5px rgba(196, 154, 126, 0.7); }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default App;