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
      name: 'Taylor', 
      streak: 7
    },
    { 
      name: 'Alex', 
      streak: 5
    },
    { 
      name: 'Jamie', 
      streak: 3
    },
    { 
      name: 'Jordan', 
      streak: 2
    }
  ], []); // Empty dependency array means this only runs once
  
  const [leaderboard, setLeaderboard] = useState<(Friend | { name: string; streak: number; isUser: true; avatar?: string })[]>([]);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  
  // Updated colors to match Figma design
  const PRIMARY_COLOR = "#8D8D8D"; // Gray
  const SECONDARY_COLOR = "#C49A7E"; // Beige
  const ACCENT_COLOR = "#E1DDD1"; // Light beige
  const BACKGROUND_COLOR = "#F8F6F2"; // Off-white
  const TEXT_COLOR = "#2E2E2E"; // Dark gray
  const GOLD_COLOR = "#C4B382"; // Gold for 1st place
  const SILVER_COLOR = "#B8B8B8"; // Silver for 2nd place 
  const BRONZE_COLOR = "#CD9B7A"; // Bronze for 3rd place

  // Update streak based on exerciseDoneToday
  useEffect(() => {
    updateMyStreak();
  }, [exerciseDoneToday]);

  // Update leaderboard when myStreak changes
  useEffect(() => {
    updateLeaderboard();
  }, [myStreak]);

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
      { name: 'You', streak: myStreak, isUser: true },
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
        return { emoji: `${index + 1}`, color: PRIMARY_COLOR };
    }
  };

  // Get streak status message
  const getStreakStatus = (streak: number) => {
    if (streak >= 7) return "You're on fire!";
    if (streak >= 5) return "Great progress!";
    if (streak >= 3) return "Building momentum!";
    if (streak > 0) return "Getting Started!";
    return "Start your streak!";
  };

  return (
    <div className="social-streaks" style={{ 
      position: 'relative',
      width: '100%',
      maxWidth: '400px',
      margin: '15px auto',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '15px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${ACCENT_COLOR}`
    }}>
      {/* Confetti overlay - more subtle */}
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
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i}
              className="confetti"
              style={{
                position: 'absolute',
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                backgroundColor: [PRIMARY_COLOR, SECONDARY_COLOR, GOLD_COLOR, ACCENT_COLOR][Math.floor(Math.random() * 4)],
                top: '-10px',
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.7 + 0.3,
                animation: `fall ${Math.random() * 3 + 2}s linear forwards, spin ${Math.random() * 3 + 2}s linear infinite`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Refined title */}
      <h3 style={{ 
        color: TEXT_COLOR, 
        fontFamily: 'serif', 
        fontSize: '20px',
        textAlign: 'center',
        margin: '0 0 20px 0',
        padding: '0 0 10px 0',
        borderBottom: `1px solid ${ACCENT_COLOR}`,
        fontWeight: 'normal'
      }}>
        Vibe Streaks
      </h3>
      
      {/* User's streak highlight - redesigned */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(196, 154, 126, 0.05)',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: SECONDARY_COLOR,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: '15px',
          fontSize: '24px',
          color: 'white',
          fontWeight: 'normal',
          fontFamily: 'serif'
        }}>
          {myStreak}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'serif',
            fontSize: '18px',
            fontWeight: 'normal',
            color: TEXT_COLOR,
            marginBottom: '5px'
          }}>
            Your Current Streak
          </div>
          
          <div style={{
            fontFamily: 'serif',
            fontSize: '14px',
            color: myStreak > 3 ? SECONDARY_COLOR : TEXT_COLOR,
            fontWeight: 'normal'
          }}>
            {getStreakStatus(myStreak)}
          </div>
        </div>
      </div>
      
      {/* Leaderboard - refined */}
      <div>
        <div style={{
          fontSize: '16px',
          fontFamily: 'serif',
          color: TEXT_COLOR,
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '5px', fontSize: '14px' }}>🏆</span> Streak Leaderboard
        </div>
        
        <div style={{
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
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
                  padding: '12px 15px',
                  backgroundColor: isUser ? 'rgba(196, 154, 126, 0.05)' : index % 2 === 0 ? 'white' : '#F9F8F6',
                  borderBottom: index < leaderboard.length - 1 ? `1px solid ${ACCENT_COLOR}` : 'none'
                }}
              >
                {/* Position indicator */}
                <div style={{ 
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: 'normal',
                  color: position.color,
                  marginRight: '10px',
                  fontSize: '14px',
                  fontFamily: 'serif'
                }}>
                  {index < 3 ? position.emoji : position.emoji}
                </div>
                
                {/* Avatar circle */}
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: ACCENT_COLOR,
                  marginRight: '15px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '14px',
                  color: TEXT_COLOR,
                  fontFamily: 'serif'
                }}>
                  {person.name.charAt(0)}
                </div>
                
                {/* Name */}
                <div style={{ flex: 1 }}>
                  <span style={{ 
                    fontFamily: 'serif',
                    fontSize: '16px',
                    fontWeight: 'normal',
                    color: isUser ? SECONDARY_COLOR : TEXT_COLOR
                  }}>
                    {person.name}
                  </span>
                </div>
                
                {/* Streak count */}
                <div style={{
                  fontFamily: 'serif',
                  fontSize: '16px',
                  fontWeight: 'normal',
                  color: person.streak > 0 ? TEXT_COLOR : PRIMARY_COLOR
                }}>
                  {person.streak} {person.streak === 1 ? 'day' : 'days'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Motivational message - restyled */}
      {myStreak === 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px 15px',
          borderRadius: '8px',
          backgroundColor: BACKGROUND_COLOR,
          borderLeft: `3px solid ${SECONDARY_COLOR}`,
          fontSize: '14px',
          fontFamily: 'serif',
          color: TEXT_COLOR
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