import React, { useEffect, useState, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, CategoryScale } from 'chart.js';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Tooltip, Legend);

interface ResilienceData {
  date: string;
  exercises: number;
  stress: number;
  resilience: number;
}

interface ResilienceTrackerProps {
  exerciseCount: number;
  stress: number;
}

const ResilienceTracker: React.FC<ResilienceTrackerProps> = ({ exerciseCount, stress }) => {
  const [resilienceScore, setResilienceScore] = useState<number>(0);
  const [weeklyData, setWeeklyData] = useState<ResilienceData[]>([]);
  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Updated colors to match Figma design
  const PRIMARY_COLOR = "#8D8D8D"; // Gray
  const SECONDARY_COLOR = "#C49A7E"; // Beige
  const ACCENT_COLOR = "#E1DDD1"; // Light beige
  const BACKGROUND_COLOR = "#F8F6F2"; // Off-white
  const TEXT_COLOR = "#2E2E2E"; // Dark gray
  const CHART_COLOR = "#A3B1AB"; // Sage green from button

  // Calculate resilience score and update localStorage
  useEffect(() => {
    // Calculate resilience based on formula
    const newResilienceScore = Math.max(0, Math.min(100, (exerciseCount * 10) - (stress * 50)));
    setResilienceScore(newResilienceScore);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Get existing data from localStorage
    const existingDataString = localStorage.getItem('resilience_data');
    let existingData: ResilienceData[] = [];
    
    if (existingDataString) {
      try {
        existingData = JSON.parse(existingDataString);
        
        // Ensure it's an array
        if (!Array.isArray(existingData)) {
          existingData = [];
        }
      } catch (error) {
        console.error('Error parsing resilience data from localStorage:', error);
        existingData = [];
      }
    }
    
    // Check if we already have data for today
    const todayDataIndex = existingData.findIndex(item => item.date === today);
    
    if (todayDataIndex >= 0) {
      // Update today's data
      existingData[todayDataIndex] = {
        date: today,
        exercises: exerciseCount,
        stress: stress,
        resilience: newResilienceScore
      };
    } else {
      // Add new data for today
      existingData.push({
        date: today,
        exercises: exerciseCount,
        stress: stress,
        resilience: newResilienceScore
      });
    }
    
    // Keep only the last 30 days of data
    if (existingData.length > 30) {
      existingData = existingData.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ).slice(-30);
    }
    
    // Save back to localStorage
    localStorage.setItem('resilience_data', JSON.stringify(existingData));
    
    // Get last 7 days of data for the chart
    const last7Days = getLastNDays(existingData, 7);
    setWeeklyData(last7Days);
  }, [exerciseCount, stress]);

  // Animate resilience score counting up
  useEffect(() => {
    // Animate the score counting up
    const end = resilienceScore;
    const duration = 1500; // milliseconds
    const startTime = Date.now();
    
    const animateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smoother animation
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * (progress+animatedScore));
      const current = Math.floor(easedProgress * end);
      setAnimatedScore(current);
      
      if (progress < 1) {
        requestAnimationFrame(animateScore);
      }
    };
    
    requestAnimationFrame(animateScore);
  }, [resilienceScore]);

  // Initialize and update chart
  useEffect(() => {
    if (chartRef.current && weeklyData.length > 0) {
      // Destroy previous chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      
      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        // Prepare labels and data
        const labels = weeklyData.map(data => {
          const date = new Date(data.date);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        
        const resilienceValues = weeklyData.map(data => data.resilience);
        
        // Create gradient for the line
        const gradient = ctx.createLinearGradient(0, 0, 0, 150);
        gradient.addColorStop(0, CHART_COLOR);
        gradient.addColorStop(1, SECONDARY_COLOR);
        
        // Create chart
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Resilience',
              data: resilienceValues,
              borderColor: CHART_COLOR,
              backgroundColor: 'rgba(163, 177, 171, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: CHART_COLOR,
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(46, 46, 46, 0.8)',
                titleFont: {
                  size: 12,
                  family: 'serif'
                },
                bodyFont: {
                  size: 12,
                  family: 'serif'
                },
                padding: 8,
                displayColors: false
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    family: 'serif',
                    size: 10
                  }
                }
              },
              y: {
                beginAtZero: true,
                max: 100,
                grid: {
                  color: 'rgba(46, 46, 46, 0.05)'
                },
                ticks: {
                  font: {
                    family: 'serif',
                    size: 10
                  },
                  callback: function(value) { return `${value}`; }
                }
              }
            },
            animation: {
              duration: 1500
            }
          }
        });
      }
    }
  }, [weeklyData]);

  // Helper function to get the last N days of data
  const getLastNDays = (data: ResilienceData[], n: number): ResilienceData[] => {
    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Get the last N items or fewer if not enough data
    const lastN = sortedData.slice(-n);
    
    // If we have fewer than N items, pad with empty data for previous days
    if (lastN.length < n) {
      const lastDate = lastN.length > 0 
        ? new Date(lastN[0].date) 
        : new Date();
      
      // Add missing days before the first date we have
      for (let i = lastN.length; i < n; i++) {
        const date = new Date(lastDate);
        date.setDate(date.getDate() - (n - i));
        
        lastN.unshift({
          date: date.toISOString().split('T')[0],
          exercises: 0,
          stress: 0,
          resilience: 0
        });
      }
    }
    
    return lastN;
  };

  // Dynamic message based on resilience score
  const getResilienceMessage = () => {
    if (resilienceScore > 80) {
      return "Stress is shaking in its boots!";
    } else if (resilienceScore > 50) {
      return "Stress is getting nervous!";
    } else if (resilienceScore > 30) {
      return "Keep flexing, you're doing great!";
    } else {
      return "Start your journey to resilience!";
    }
  };

  return (
    <div className="resilience-tracker" style={{ 
      position: 'relative',
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '15px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${ACCENT_COLOR}`
    }}>
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
        Resilience Tracker
      </h3>
      
      {/* Resilience Message Display */}
      <div style={{
        fontSize: '16px',
        fontFamily: 'serif',
        textAlign: 'center',
        color: TEXT_COLOR,
        marginBottom: '15px'
      }}>
        {getResilienceMessage()}
      </div>
      
      {/* Chart Section */}
      <div style={{
        height: '180px',
        marginBottom: '20px',
        position: 'relative'
      }}>
        {weeklyData.length > 0 ? (
          <canvas ref={chartRef} height="180" />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: PRIMARY_COLOR,
            fontFamily: 'serif',
            fontSize: '16px',
            textAlign: 'center',
            backgroundColor: BACKGROUND_COLOR,
            borderRadius: '10px',
            padding: '20px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '24px' }}>📊</span>
            </div>
            No data yet—start exercising!
          </div>
        )}
      </div>
      
      {/* Stats Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderTop: `1px solid ${ACCENT_COLOR}`
      }}>
        <div style={{
          textAlign: 'center',
          flex: 1
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: TEXT_COLOR,
            marginBottom: '5px',
            fontFamily: 'serif'
          }}>
            Exercises
          </div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'normal',
            color: SECONDARY_COLOR,
            fontFamily: 'serif'
          }}>
            {exerciseCount}
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          flex: 1
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: TEXT_COLOR,
            marginBottom: '5px',
            fontFamily: 'serif'
          }}>
            Stress Level
          </div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'normal',
            color: PRIMARY_COLOR,
            fontFamily: 'serif'
          }}>
            {Math.round(stress * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResilienceTracker;