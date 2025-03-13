import React, { useEffect, useState, useMemo } from 'react';

interface Friend {
  name: string;
  streak: number;
  avatar?: string; // Optional avatar URL
}

interface SocialStreaksProps {
  exerciseDoneToday: boolean;
}

interface StreakData {
  streak: number;
  lastExerciseDate: string;
}

const SocialStreaks: React.FC<SocialStreaksProps> = ({ exerciseDoneToday }) => {
  const [myStreak, setMyStreak] = useState<number>(0);
  
  // Use useMemo to prevent recreating this array on every render
  const friends = useMemo<Friend[]>(() => [
    { 
      name: 'Alex', 
      streak: 5, 
      avatar: '/facevibe/avatars/alex.jpg' 
    },
    { 
      name: 'Jamie', 
      streak: 3, 
      avatar: '/facevibe/avatars/jamie.jpg' 
    },
    { 
      name: 'Taylor', 
      streak: 7, 
      avatar: '/facevibe/avatars/taylor.jpg' 
    },
    { 
      name: 'Jordan', 
      streak: 2, 
      avatar: '/facevibe/avatars/jordan.jpg' 
    }
  ], []); // Empty dependency array means this only runs once
  
  const [leaderboard, setLeaderboard] = useState<(Friend | { name: string; streak: number; isUser: true; avatar?: string })[]>([]);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  
  // Premium colors
  const TEAL_COLOR = "#00C4B4";
  const GOLD_COLOR = "#FFD700";
  const SILVER_COLOR = "#C0C0C0";
  const BRONZE_COLOR = "#CD7F32";

  // Update streak based on exerciseDoneToday
  useEffect(() => {
    updateMyStreak();
  }, [exerciseDoneToday]);

  // Update leaderboard when myStreak changes
  useEffect(() => {
    updateLeaderboard();
  }, [myStreak]); // Removed friends from the dependency array since it doesn't change

  // Show confetti animation when streak increases
  useEffect(() => {
    if (myStreak > 0 && exerciseDoneToday) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [myStreak, exerciseDoneToday]);

  // Update my streak based on exercise completion
  const updateMyStreak = () => {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Get stored streak data
      const storedStreakData = localStorage.getItem('my_streak');
      let streakData: StreakData = { streak: 0, lastExerciseDate: '' };
      
      if (storedStreakData) {
        streakData = JSON.parse(storedStreakData);
      }
      
      // Check if exercise was done today
      if (exerciseDoneToday) {
        // Check if last exercise was yesterday or today (already counted)
        const lastDate = streakData.lastExerciseDate ? new Date(streakData.lastExerciseDate) : new Date(0);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = lastDate.toISOString().split('T')[0] === today;
        const isYesterday = lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
        
        // If already counted today, don't increment again
        if (isToday) {
          setMyStreak(streakData.streak);
        } 
        // If yesterday or new streak, increment
        else if (isYesterday || streakData.streak === 0) {
          const newStreak = streakData.streak + 1;
          
          // Update localStorage
          localStorage.setItem('my_streak', JSON.stringify({
            streak: newStreak,
            lastExerciseDate: today
          }));
          
          setMyStreak(newStreak);
        } 
        // If streak broken but exercise done today, reset to 1
        else {
          localStorage.setItem('my_streak', JSON.stringify({
            streak: 1,
            lastExerciseDate: today
          }));
          
          setMyStreak(1);
        }
      } else {
        // If no exercise today, just display current streak without updating
        setMyStreak(streakData.streak);
        
        // Check if streak should be broken (last exercise more than a day ago)
        const lastDate = streakData.lastExerciseDate ? new Date(streakData.lastExerciseDate) : new Date(0);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        if (lastDate < twoDaysAgo && streakData.streak > 0) {
          // Streak broken, reset to 0
          localStorage.setItem('my_streak', JSON.stringify({
            streak: 0,
            lastExerciseDate: ''
          }));
          
          setMyStreak(0);
        }
      }
    } catch (error) {
      console.error('Error updating streak:', error);
      setMyStreak(0);
    }
  };

  // Update leaderboard rankings
  const updateLeaderboard = () => {
    // Create combined list with user and friends
    const combined: (Friend | { name: string; streak: number; isUser: true; avatar?: string })[] = [
      { name: 'You', streak: myStreak, isUser: true, avatar: '/facevibe/avatars/user.jpg' },
      ...friends
    ];
    
    // Sort by streak (descending)
    const sorted = combined.sort((a, b) => b.streak - a.streak);
    
    setLeaderboard(sorted);
  };

  // Get appropriate medal or position
  const getPosition = (index: number) => {
    switch (index) {
      case 0:
        return { emoji: '🥇', color: GOLD_COLOR };
      case 1:
        return { emoji: '🥈', color: SILVER_COLOR };
      case 2:
        return { emoji: '🥉', color: BRONZE_COLOR };
      default:
        return { emoji: `${index + 1}`, color: '#999' };
    }
  };

  // Get streak status message
  const getStreakStatus = (streak: number) => {
    if (streak >= 10) return "Ultimate Streak Champion!";
    if (streak >= 7) return "Streak Star!";
    if (streak >= 5) return "On Fire!";
    if (streak >= 3) return "Building Momentum!";
    if (streak > 0) return "Getting Started!";
    return "Start your streak!";
  };

  return (
    <div className="social-streaks" style={{ 
      position: 'relative',
      width: '100%',
      maxWidth: '300px',
      margin: '15px auto',
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '15px',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
      border: `1px solid rgba(0, 196, 180, 0.2)`
    }}>
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="confetti-container" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div 
              key={i}
              className="confetti"
              style={{
                position: 'absolute',
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                backgroundColor: [TEAL_COLOR, GOLD_COLOR, '#FF4A4A', '#6A5ACD'][Math.floor(Math.random() * 4)],
                top: '-10px',
                left: `${Math.random() * 100}%`,
                opacity: Math.random(),
                animation: `fall ${Math.random() * 3 + 2}s linear forwards, spin ${Math.random() * 3 + 2}s linear infinite`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Premium title */}
      <h3 style={{ 
        color: TEAL_COLOR, 
        fontFamily: 'Arial', 
        fontSize: '20px',
        textAlign: 'center',
        margin: '0 0 15px 0',
        padding: '0 0 10px 0',
        borderBottom: `2px solid rgba(0, 196, 180, 0.2)`
      }}>
        Vibe Streaks
      </h3>
      
      {/* User's streak highlight */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 196, 180, 0.1)',
        padding: '10px 15px',
        borderRadius: '10px',
        marginBottom: '15px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: TEAL_COLOR,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: '15px',
          fontSize: '20px',
          color: 'white',
          fontWeight: 'bold',
        }}>
          {myStreak}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'Arial',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '3px'
          }}>
            Your Current Streak
          </div>
          
          <div style={{
            fontFamily: 'Arial',
            fontSize: '14px',
            color: myStreak > 5 ? TEAL_COLOR : '#666',
            fontWeight: myStreak > 5 ? 'bold' : 'normal'
          }}>
            {getStreakStatus(myStreak)}
          </div>
        </div>
      </div>
      
      {/* Leaderboard */}
      <div>
        <div style={{
          fontSize: '16px',
          fontFamily: 'Arial',
          color: '#555',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '5px' }}>🏆</span> Streak Leaderboard
        </div>
        
        <div style={{
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
        }}>
          {leaderboard.map((person, index) => {
            const position = getPosition(index);
            const isUser = 'isUser' in person;
            
            return (
              <div 
                key={person.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 15px',
                  backgroundColor: isUser ? 'rgba(0, 196, 180, 0.1)' : index % 2 === 0 ? 'white' : '#f9f9f9',
                  borderBottom: index < leaderboard.length - 1 ? '1px solid #eee' : 'none'
                }}
              >
                <div style={{ 
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  color: position.color,
                  marginRight: '10px'
                }}>
                  {position.emoji}
                </div>
                
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#eee',
                  marginRight: '10px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  {person.avatar ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundImage: `url(${person.avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }} />
                  ) : (
                    person.name.charAt(0)
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <span style={{ 
                    fontFamily: 'Arial',
                    fontSize: '16px',
                    fontWeight: isUser ? 'bold' : 'normal',
                    color: isUser ? TEAL_COLOR : '#333'
                  }}>
                    {person.name}
                  </span>
                </div>
                
                <div style={{
                  fontFamily: 'Arial',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: person.streak > 0 ? '#333' : '#999'
                }}>
                  {person.streak} {person.streak === 1 ? 'day' : 'days'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Motivational message */}
      {myStreak === 0 && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderLeft: '3px solid #FFC107',
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#666'
        }}>
          Complete today's exercises to start your streak!
        </div>
      )}
      
      {/* Animation styles */}
      <style>
        {`
          @keyframes fall {
            to {
              transform: translateY(350px);
              opacity: 0;
            }
          }
          
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default SocialStreaks;