import React, { useState, useEffect, useCallback } from 'react';
import ExerciseTracker from './components/ExerciseTracker';
import StressGame from './components/StressGame';
import ResilienceTracker from './components/ResilienceTracker';
import SocialStreaks from './components/SocialStreaks';

// Logo component with massage emoji
const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <span role="img" aria-label="Face massage" style={{ fontSize: '28px', marginRight: '10px' }}>💆</span>
    <span>FaceVibe</span>
  </div>
);

const App: React.FC = () => {
  // Core state
  const [exerciseCount, setExerciseCount] = useState<number>(0);
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [exerciseDoneToday, setExerciseDoneToday] = useState<boolean>(false);
  const [landmarks, setLandmarks] = useState<any>(null);
  const [faceVisible, setFaceVisible] = useState<boolean>(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'exercise' | 'progress'>('exercise');
  const [appStarted, setAppStarted] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'default' | 'calm' | 'energy'>('default');
  const [showIntro, setShowIntro] = useState<boolean>(true);
  
  // Premium colors - dynamically adjusted based on theme
  const getThemeColors = () => {
    switch (theme) {
      case 'calm':
        return {
          primary: "#4682B4", // Steel Blue
          secondary: "#87CEEB", // Sky Blue
          accent: "#B0E0E6", // Powder Blue
          text: "#2C3E50" // Dark Blue
        };
      case 'energy':
        return {
          primary: "#FF6B6B", // Coral Red
          secondary: "#FFE66D", // Bright Yellow
          accent: "#4ECDC4", // Turquoise
          text: "#1A535C" // Dark Teal
        };
      default:
        return {
          primary: "#00C4B4", // Teal
          secondary: "#FFD700", // Gold
          accent: "rgba(0, 196, 180, 0.2)", // Light Teal
          text: "#333333" // Dark Grey
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
    setExerciseCount(prev => Math.min(10, prev + 1));
    setExerciseDoneToday(true);
    
    // Update localStorage to mark exercise as done today
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('last_exercise_date', today);
  }, []);

  // Handle stress level updates
  const handleStressUpdate = useCallback((newStressLevel: number) => {
    setStressLevel(newStressLevel);
  }, []);

  // Check if exercise was done today on app load
  useEffect(() => {
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
              debugElement.style.backgroundColor = 'rgba(0,196,180,0.6)';
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
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const [videoQuality, setVideoQuality] = useState<'low' | 'medium' | 'high'>('high');

  // Add this function to App.tsx
  const getVideoConstraints = () => {
    switch(videoQuality) {
      case 'low':
        return {
          width: { ideal: 320, max: 480 },
          height: { ideal: 240, max: 360 },
          facingMode: "user"
        };
      case 'medium':
        return {
          width: { ideal: 640, max: 720 },
          height: { ideal: 480, max: 540 },
          facingMode: "user"
        };
      case 'high':
        return {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user"
        };
    }
  };

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
      alert('FaceVibe needs your face—allow camera!');
    }
  };

  // Reset the app
  const resetApp = () => {
    setExerciseCount(0);
    setStressLevel(0);
    setActiveTab('exercise');
  };

  // Render intro screen
  if (showIntro) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{
          fontSize: '42px',
          fontWeight: 'bold',
          marginBottom: '20px',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span role="img" aria-label="Face massage" style={{ fontSize: '48px', marginRight: '15px' }}>💆</span>
          FaceVibe
        </div>
        
        <div style={{
          fontSize: '18px',
          maxWidth: '600px',
          margin: '0 auto 40px auto',
          lineHeight: 1.6
        }}>
          Premium facial exercises for stress relief and mindfulness.
          Train your face, calm your mind, build resilience.
        </div>
        
        <button
          onClick={startApp}
          style={{
            backgroundColor: 'white',
            color: themeColors.primary,
            border: 'none',
            borderRadius: '30px',
            padding: '15px 30px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          Vibe up your face, fam!
        </button>
        
        <div style={{
          marginTop: '40px',
          display: 'flex',
          gap: '15px'
        }}>
          <div
            onClick={() => setTheme('default')}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: '#00C4B4',
              borderRadius: '50%',
              cursor: 'pointer',
              border: theme === 'default' ? '2px solid white' : 'none',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)'
            }}
          />
          <div
            onClick={() => setTheme('calm')}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: '#4682B4',
              borderRadius: '50%',
              cursor: 'pointer',
              border: theme === 'calm' ? '2px solid white' : 'none',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)'
            }}
          />
          <div
            onClick={() => setTheme('energy')}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: '#FF6B6B',
              borderRadius: '50%',
              cursor: 'pointer',
              border: theme === 'energy' ? '2px solid white' : 'none',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="facevibe-app" style={{
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '0',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9f9f9',
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        zIndex: 900
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '24px',
          margin: 0,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Logo />
        </h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={toggleFullScreen}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
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
          
          <div style={{ marginRight: '10px' }}>
            <select
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value as 'low' | 'medium' | 'high')}
              style={{
                padding: '8px 15px',
                borderRadius: '20px',
                border: `1px solid ${themeColors.primary}`,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                appearance: 'none',
                paddingRight: '30px'
              }}
            >
              <option value="low">Low Quality</option>
              <option value="medium">Medium Quality</option>
              <option value="high">High Quality</option>
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'default' | 'calm' | 'energy')}
              style={{
                padding: '8px 15px',
                borderRadius: '20px',
                border: `1px solid ${themeColors.primary}`,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                appearance: 'none',
                paddingRight: '30px'
              }}
            >
              <option value="default">Classic Vibe</option>
              <option value="calm">Chill Vibe</option>
              <option value="energy">Hype Vibe</option>
            </select>
            <span style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'white'
            }}>
              ▼
            </span>
          </div>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        zIndex: 900
      }}>
        <div
          onClick={() => setActiveTab('exercise')}
          style={{
            padding: '15px 20px',
            fontSize: '16px',
            fontWeight: activeTab === 'exercise' ? 'bold' : 'normal',
            color: activeTab === 'exercise' ? themeColors.primary : 'white',
            borderBottom: activeTab === 'exercise' ? `2px solid ${themeColors.primary}` : 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            textAlign: 'center',
            flex: 1
          }}
        >
          <span style={{ marginRight: '5px' }}>🏋️</span> Exercises
        </div>
        
        <div
          onClick={() => setActiveTab('progress')}
          style={{
            padding: '15px 20px',
            fontSize: '16px',
            fontWeight: activeTab === 'progress' ? 'bold' : 'normal',
            color: activeTab === 'progress' ? themeColors.primary : 'white',
            borderBottom: activeTab === 'progress' ? `2px solid ${themeColors.primary}` : 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            textAlign: 'center',
            flex: 1
          }}
        >
          <span style={{ marginRight: '5px' }}>📊</span> Progress
        </div>
      </div>
      
      {/* Exercise Tab Content */}
      {activeTab === 'exercise' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }}>
          {appStarted ? (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              position: 'relative' 
            }}>
              <ExerciseTracker videoConstraints={getVideoConstraints()}/>
              
              {/* Overlay stats at the bottom center */}
              <div style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: '30px',
                padding: '10px 20px',
                backdropFilter: 'blur(5px)',
                zIndex: 100
              }}>
                <div style={{
                  fontSize: '16px',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  Exercises today: <span style={{ fontWeight: 'bold', color: themeColors.primary }}>{exerciseCount}/10</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
            }}>
              <button
                onClick={startApp}
                style={{
                  backgroundColor: 'white',
                  color: themeColors.primary,
                  border: 'none',
                  borderRadius: '30px',
                  padding: '15px 30px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }}
              >
                Start FaceVibe
              </button>
            </div>
          )}
          
          {/* Stress Meter - overlay on left */}
          {appStarted && (
            <div style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '15px',
              width: '100px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
              display: isFullScreen ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              zIndex: 100
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
                background: `conic-gradient(${themeColors.primary} ${stressLevel * 360}deg, rgba(255,255,255,0.2) 0deg)`
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
                  Stress Level
                </h4>
              </div>
            </div>
          )}
          
          {/* Side panel for benefits - position on right */}
          {appStarted && (
            <div style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '200px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '15px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
              display: isFullScreen ? 'none' : 'block',
              zIndex: 100
            }}>
              <h3 style={{
                margin: '0 0 10px 0',
                color: 'white',
                fontSize: '16px',
                textAlign: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                paddingBottom: '5px'
              }}>
                <span style={{ color: themeColors.primary, marginRight: '5px' }}>✦</span>
                Benefits
              </h3>
              
              <ul style={{
                margin: 0,
                padding: 0,
                listStyleType: 'none'
              }}>
                {[
                  'Reduces stress',
                  'Improves muscle tone',
                  'Enhances mood',
                  'Builds resilience',
                  'Mind-body connection'
                ].map((benefit, index) => (
                  <li key={index} style={{
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: index < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}>
                    <span style={{ 
                      color: themeColors.primary,
                      marginRight: '8px',
                      fontSize: '14px'
                    }}>✓</span>
                    <span style={{ fontSize: '13px', color: 'white' }}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Reset button - floating in top right */}
          {appStarted && (
            <button
              onClick={resetApp}
              style={{
                position: 'absolute',
                top: '80px',
                right: '20px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '16px',
                cursor: 'pointer',
                backdropFilter: 'blur(5px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                zIndex: 100
              }}
            >
              ↺
            </button>
          )}
        </div>
      )}
      
      {/* Progress Tab Content */}
      {activeTab === 'progress' && (
        <div style={{
          position: 'absolute',
          top: '80px', // Below header
          bottom: '60px', // Above tabs
          left: 0,
          right: 0,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center'
        }}>
          <ResilienceTracker
            exerciseCount={exerciseCount}
            stress={stressLevel}
          />
          
          <SocialStreaks
            exerciseDoneToday={exerciseDoneToday}
          />
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              color: themeColors.primary,
              fontSize: '18px',
              borderBottom: `1px solid ${themeColors.accent}`,
              paddingBottom: '10px'
            }}>
              Wellness Tips
            </h3>
            
            <div style={{
              padding: '10px',
              backgroundColor: 'rgba(0, 196, 180, 0.05)',
              borderRadius: '10px',
              marginBottom: '15px'
            }}>
              <p style={{
                margin: '0 0 10px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: themeColors.primary
              }}>
                CBT Insight of the Day
              </p>
              
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: themeColors.text,
                lineHeight: 1.6
              }}>
                Notice how facial expressions can influence emotions. Smiling, even when forced, 
                can trigger positive feelings by activating the same neural pathways as genuine happiness.
              </p>
            </div>
            
            <div style={{
              padding: '10px',
              borderLeft: `3px solid ${themeColors.primary}`,
              backgroundColor: '#f9f9f9',
              borderRadius: '0 10px 10px 0'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontStyle: 'italic',
                color: themeColors.text
              }}>
                "Your face is the messenger of your mind. Train it to deliver messages of calm and joy."
              </p>
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
              backgroundColor: themeColors.primary,
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
      
      {/* StressGame Component */}
      {landmarks && faceVisible && (
        <StressGame
          landmarks={landmarks}
          faceVisible={faceVisible}
          onStressUpdate={handleStressUpdate}
        />
      )}
    </div>
  );
};

export default App;