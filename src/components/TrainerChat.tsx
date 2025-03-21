import React, { useState, useEffect, useRef } from 'react';
import { Anthropic } from '@anthropic-ai/sdk';
import { getExerciseBenefits } from '../utils/FacialAnalysis';

interface TrainerChatProps {
  exerciseProgress: number;
  currentExercise: string;
  isInSidePanel?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TrainerChat: React.FC<TrainerChatProps> = ({ exerciseProgress, currentExercise, isInSidePanel = true, onMinimizedChange }) => {
  // Initialize minimized state separately from props to avoid circular dependency
  const [minimized, setMinimized] = useState<boolean>(false);
  
  // Set initial minimized state from props only on mount
  useEffect(() => {
    if (isInSidePanel) {
      setMinimized(true);
    }
  }, []); // Empty dependency array ensures this only runs once on mount
  
  // UI states
  const [trainerAnimation, setTrainerAnimation] = useState<string>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'Ready to vibe up your face, fam? Ask me about your exercise routine!' 
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProgress, setLastProgress] = useState<number>(0);
  //const [lastProgressTime, setLastProgressTime] = useState<number>(0);
  // Track exercise changes and notifications
  const [lastExercise, setLastExercise] = useState<string>('');
  const [hasNotification, setHasNotification] = useState<boolean>(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Premium colors
  const TEAL_COLOR = "#C49A7E"; // Changed from "#00C4B4" to match app's beige/warm color scheme
  const BEIGE_COLOR = "#F5F5DC"; // Light beige color
  const WARM_BG_COLOR = "rgba(196, 154, 126, 0.2)"; // Warm background color
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  
  // Generate response using Claude API
  const generateResponse = async (userMessage: string, isAutoFeedback = false): Promise<string> => {
    try {
      // Access the API key from environment variables
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('API key is missing');
      }
      
      const anthropic = new Anthropic({
        apiKey
      });
      
      // Create the system prompt
      const systemPrompt = 'You are a motivational gym trainer and CBT therapist with a Gen Z vibe for *FaceVibe*, guiding users through 10 facial exercises: Jaw Dropper (>20px), Brow Lifter (>15px), Cheek Puffer (>25px), Eye Winker (>10px asymmetry), Smiley Stretch (>30px), Nose Scruncher (>10px y-shift), Lip Pucker (>10px z-shift), Chin Jutter (>15px), Forehead Smoother (<5px variance), Tongue Twister (>5px). Encourage progress (e.g., "Yo, fam, 75% on Jaw Dropper—slay it!") and suggest next steps.';
      
      // Combine user message with current exercise and progress info
      const fullPrompt = isAutoFeedback 
        ? userMessage 
        : `User: ${userMessage}\nCurrent Exercise: ${currentExercise}, Progress: ${exerciseProgress}%`;
      
      // Make API request
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: fullPrompt }]
      });
      
      if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
        return response.content[0].text;
      }
      
      return "I couldn't generate a response right now. Try again?";
    } catch (error) {
      console.error('Error generating response:', error);
      return "Trainer's mic broke—try again!";
    }
  };
  
  // Provide real-time feedback when progress changes significantly
  const provideProgressFeedback = async () => {
    try {
      const tempMessage: ChatMessage = {
        role: 'assistant',
        content: `Analyzing your ${currentExercise} progress...`
      };
      
      setChatMessages(prev => [...prev, tempMessage]);
      
      // Create a prompt about the current exercise and progress
      const prompt = `Current Exercise: ${currentExercise}, Progress: ${exerciseProgress}%`;
      
      // Get feedback from Claude
      const feedback = await generateResponse(prompt, true);
      
      // Remove the temporary message and add the real feedback
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove temp message
        return [...newMessages, { role: 'assistant', content: feedback }];
      });
    } catch (err) {
      setError('Feedback generation failed. Try again later.');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Provide real-time feedback when progress changes significantly
  useEffect(() => {
    // Only trigger if progress has changed by at least 10%
    if (Math.abs(exerciseProgress - lastProgress) >= 10 && currentExercise) {
      setLastProgress(exerciseProgress);
      
      // Don't send automatic messages if there was a recent error
      if (!error) {
        provideProgressFeedback();
      }
    }
  }, [exerciseProgress, currentExercise, lastProgress, error]);
  
  // Provide CBT insights when exercise changes and set notification
  useEffect(() => {
    // Only send message when exercise changes and it's not empty
    if (currentExercise && currentExercise !== lastExercise && currentExercise.trim() !== '') {
      setLastExercise(currentExercise);
      
      // Get CBT benefits for this exercise
      const benefits = getExerciseBenefits(currentExercise);
      
      // Set notification for the new exercise
      setHasNotification(true);
      
      // Only add message if we have benefits information
      if (benefits) {
        // Create a CBT insight message but don't add it to chat yet
        // It will be added when user opens the chat
        const insightMessage: ChatMessage = {
          role: 'assistant',
          content: `CBT Insight for ${currentExercise}: ${benefits}`
        };
        
        // Store this message for when user clicks the icon
        sessionStorage.setItem('pendingTrainerMessage', JSON.stringify(insightMessage));
      }
    }
  }, [currentExercise, lastExercise]);

  // Animation states: 'idle', 'talking', 'encouraging', 'thinking'
  useEffect(() => {
    // Transition animations based on messages or state changes
    if (isLoading) {
      setTrainerAnimation('thinking');
    } else if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant') {
      setTrainerAnimation('talking');
      // Return to idle after a delay
      const timer = setTimeout(() => {
        setTrainerAnimation('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, isLoading]);
  
  // Additional animation when exercise progress changes
  useEffect(() => {
    if (exerciseProgress > lastProgress + 10) {
      setTrainerAnimation('encouraging');
      const timer = setTimeout(() => {
        setTrainerAnimation('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [exerciseProgress, lastProgress]);
  
  // Notify parent when minimized state changes, with protection against infinite loops
  useEffect(() => {
    if (onMinimizedChange) {
      onMinimizedChange(minimized);
    }
  }, [minimized, onMinimizedChange]);
  
  // Toggle minimized state
  const toggleMinimized = () => {
    const newMinimizedState = !minimized;
    setMinimized(newMinimizedState);
    // Call onMinimizedChange callback if provided
    if (onMinimizedChange) {
      onMinimizedChange(newMinimizedState);
    }
  };
  
  // Handle click on trainer icon - show the pending message if available
  const handleTrainerIconClick = () => {
    // Clear notification
    setHasNotification(false);
    
    // Check for pending message
    const pendingMessageJson = sessionStorage.getItem('pendingTrainerMessage');
    if (pendingMessageJson) {
      try {
        const pendingMessage = JSON.parse(pendingMessageJson);
        // Add to chat messages
        setChatMessages(prev => [...prev, pendingMessage]);
        
        // Clear the pending message
        sessionStorage.removeItem('pendingTrainerMessage');
        
        // Change animation to talking briefly
        setTrainerAnimation('talking');
        setTimeout(() => {
          setTrainerAnimation('idle');
        }, 3000);
      } catch (err) {
        console.error('Error processing pending message:', err);
      }
    }
    
    // Toggle minimized state
    toggleMinimized();
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (isLoading || !input.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim()
    };
    setInput('');
    
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    
    // Start loading state
    setIsLoading(true);
    setError('');
    
    try {
      // Generate AI response
      const response = await generateResponse(userMessage.content);
      
      // Add AI response to chat
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      setChatMessages([...newMessages, assistantMessage]);
    } catch (err) {
      console.error('Error generating response:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle animation click for more engagement
  const handleAvatarClick = () => {
    setTrainerAnimation('encouraging');
    setTimeout(() => {
      setTrainerAnimation('idle');
    }, 1500);
  };

  // State for responsive positioning
  const [containerPosition, setContainerPosition] = useState<{
    right: string;
    maxWidth: string;
    top: string; 
    transform: string;
  }>({
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    maxWidth: '350px',
  });
  
  // Update position based on screen size
  useEffect(() => {
    const updatePosition = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isShortScreen = height < 600;
      
      let newPosition = {
        right: isMobile ? '5vw' : '20px',
        maxWidth: isMobile ? '90vw' : '350px',
        top: 'string',
        transform:'string'
      };
      
      if (isShortScreen) {
        newPosition = {
          ...newPosition,
          top: '20px',
          transform: 'none',
        };
      } else {
        newPosition = {
          ...newPosition,
          top: '50%',
          transform: 'translateY(-50%)',
        };
      }
      
      setContainerPosition(newPosition);
    };
    
    // Initial position
    updatePosition();
    
    // Update on resize
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);
  
  // Container styles for positioning on the right side
  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    right: containerPosition.right,
    top: containerPosition.top,
    transform: containerPosition.transform,
    zIndex: 1000,
    maxWidth: minimized ? 'auto' : containerPosition.maxWidth,
    width: minimized ? 'auto' : containerPosition.maxWidth,
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column'
  };

  // Render minimized version - icon only with tooltip and notification
  if (minimized && isInSidePanel) {
    return (
      <div style={containerStyles}>
        <div 
          className="trainer-chat-minimized"
          onClick={handleTrainerIconClick}
          title="Chat with trainer"
          style={{
            cursor: 'pointer',
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            animation: 'pulseTrainer 2s infinite',
            position: 'relative',
            alignSelf: 'flex-end',
            backgroundColor: WARM_BG_COLOR,
            borderRadius: '50%',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Notification indicator */}
          {hasNotification && (
            <div style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              width: '12px',
              height: '12px',
              backgroundColor: '#FF4A4A',
              borderRadius: '50%',
              border: '2px solid white',
              animation: 'pulse 1s infinite',
              zIndex: 10
            }} />
          )}
          
          <div className="trainer-avatar-mini" style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '50px',
          }}>
            {'🧘'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <div 
        className="trainer-chat" 
        style={{
          width: '100%',
          height: 'auto',
          padding: '15px',
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          borderRadius: '15px',
          boxShadow: '0 5px 20px rgba(0, 0, 0, 0.3)',
          border: `2px solid ${TEAL_COLOR}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '400px'
        }}
      >
        <button 
          onClick={toggleMinimized}
          aria-label="Minimize trainer chat"
          title="Minimize"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'transparent',
            border: 'none',
            color: BEIGE_COLOR,
            fontSize: '20px',
            cursor: 'pointer',
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(196, 154, 126, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ✕
        </button>
      
        {/* Header with animated trainer avatar */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '10px',
          position: 'relative',
        }}>
          <div 
            className={`trainer-avatar ${trainerAnimation}`}
            onClick={handleAvatarClick}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 196, 180, 0.2)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '28px',
              marginRight: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              animation: `${trainerAnimation}Animation 2s infinite`,
            }}
          >
            {trainerAnimation === 'idle' && '🧘'}
            {trainerAnimation === 'talking' && '🗣️'}
            {trainerAnimation === 'encouraging' && '💪'}
            {trainerAnimation === 'thinking' && '🤔'}
          </div>
          
          <h3 style={{ 
            color: TEAL_COLOR, 
            fontFamily: 'Arial', 
            fontSize: '20px',
            margin: '0',
            flex: 1,
            textAlign: 'center'
          }}>
            Trainer Chat
          </h3>
        </div>
        
        <div style={{
          borderBottom: `2px solid ${TEAL_COLOR}`,
          marginBottom: '10px',
          paddingBottom: '5px',
        }}></div>
        
        {/* Exercise status indicator */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: WARM_BG_COLOR,
          borderRadius: '10px',
          marginBottom: '10px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <div>{currentExercise || 'No exercise selected'}</div>
          <div>{exerciseProgress}% complete</div>
        </div>
        
        {/* Chat messages */}
        <div style={{
          height: '150px',
          overflowY: 'auto',
          padding: '10px',
          backgroundColor: 'rgba(249, 249, 249, 0.1)',
          borderRadius: '10px',
          marginBottom: '10px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {chatMessages.map((message, index) => (
            <div 
              key={index} 
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                marginBottom: '8px',
                maxWidth: '85%',
                wordWrap: 'break-word',
                backgroundColor: message.role === 'user' ? '#e6e6e6' : WARM_BG_COLOR,
                color: message.role === 'user' ? '#333' : TEAL_COLOR,
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                marginLeft: message.role === 'user' ? 'auto' : '0',
                fontFamily: 'Arial',
                fontSize: '14px'
              }}
            >
              {message.content}
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div style={{
              display: 'flex',
              padding: '8px 12px',
              alignItems: 'center',
              color: TEAL_COLOR,
              fontSize: '14px'
            }}>
              <div 
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: `2px solid ${TEAL_COLOR}`,
                  borderTopColor: 'transparent',
                  marginRight: '8px',
                  animation: 'spin 1s linear infinite'
                }}
              />
              Trainer is typing...
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 74, 74, 0.1)',
              color: '#FF4A4A',
              borderRadius: '10px',
              marginBottom: '8px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={chatEndRef} />
        </div>
        
        {/* Input area */}
        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading && input.trim()) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask your trainer..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '20px',
              border: `1px solid ${TEAL_COLOR}`,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              outline: 'none',
              fontSize: '14px'
            }}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: TEAL_COLOR,
              color: 'white',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !input.trim() ? 0.7 : 1
            }}
          >
            Send
          </button>
        </div>
        
        {/* Animation styles */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes pulseTrainer {
              0% { transform: scale(1); box-shadow: 0 4px 10px rgba(196, 154, 126, 0.3); }
              50% { transform: scale(1.05); box-shadow: 0 4px 15px rgba(196, 154, 126, 0.5); }
              100% { transform: scale(1); box-shadow: 0 4px 10px rgba(196, 154, 126, 0.3); }
            }
            
            @keyframes idleAnimation {
              0% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
              100% { transform: translateY(0); }
            }
            
            @keyframes talkingAnimation {
              0% { transform: scale(1); }
              25% { transform: scale(1.1); }
              50% { transform: scale(1); }
              75% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            
            @keyframes encouragingAnimation {
              0% { transform: rotate(-5deg); }
              25% { transform: rotate(5deg); }
              50% { transform: rotate(-5deg); }
              75% { transform: rotate(5deg); }
              100% { transform: rotate(0deg); }
            }
            
            @keyframes thinkingAnimation {
              0% { opacity: 1; }
              50% { opacity: 0.7; }
              100% { opacity: 1; }
            }
            
            @media (max-width: 768px) {
              .trainer-chat {
                max-width: 90vw !important;
                right: 5vw !important;
              }
            }
            
            @media (max-height: 600px) {
              .trainer-chat {
                top: 20px !important;
                transform: none !important;
                max-height: calc(100vh - 40px) !important;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default TrainerChat;