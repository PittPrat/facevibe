import React from 'react';

interface DirectionArrowProps {
  direction: 'up' | 'down' | 'left' | 'right' | 'in' | 'out' | 'open' | 'close' | 'none';
  position: 'mouth' | 'eyes' | 'eyebrows' | 'cheeks' | 'chin' | 'forehead' | 'nose' | 'tongue';
  size?: number;
  color?: string;
}

const DirectionArrow: React.FC<DirectionArrowProps> = ({ 
  direction, 
  position, 
  size = 40, 
  color = "#00C4B4" 
}) => {
  // Skip rendering if direction is none
  if (direction === 'none') return null;
  
  // Calculate position based on facial feature
  const getPositionStyle = () => {
    switch(position) {
      case 'eyebrows':
        return { top: '20%', left: '50%' };
      case 'eyes':
        return { top: '30%', left: '50%' };
      case 'nose':
        return { top: '40%', left: '50%' };
      case 'cheeks':
        return { top: '45%', left: '50%' };
      case 'mouth':
        return { top: '60%', left: '50%' };
      case 'chin':
        return { top: '75%', left: '50%' };
      case 'forehead':
        return { top: '15%', left: '50%' };
      case 'tongue':
        return { top: '65%', left: '50%' };
      default:
        return { top: '50%', left: '50%' };
    }
  };
  
  // Get SVG path for different arrow types
  const getArrowPath = () => {
    switch(direction) {
      case 'up':
        return 'M20,35 L20,15 L10,25 M20,15 L30,25';
      case 'down':
        return 'M20,15 L20,35 L10,25 M20,35 L30,25';
      case 'left':
        return 'M35,20 L15,20 L25,10 M15,20 L25,30';
      case 'right':
        return 'M15,20 L35,20 L25,10 M35,20 L25,30';
      case 'in':
        return 'M10,10 L30,30 M30,10 L10,30 M20,5 L20,35';
      case 'out':
        return 'M15,15 L25,15 L25,25 L15,25 Z M10,10 L30,10 L30,30 L10,30 Z';
      case 'open':
        return 'M10,20 L30,20 M10,15 L10,25 M30,15 L30,25';
      case 'close':
        return 'M15,10 L25,30 M25,10 L15,30';
      default:
        return '';
    }
  };
  
  const positionStyle = getPositionStyle();
  const arrowPath = getArrowPath();
  
  return (
    <div style={{
      position: 'absolute',
      top: positionStyle.top,
      left: positionStyle.left,
      transform: 'translate(-50%, -50%)',
      width: `${size}px`,
      height: `${size}px`,
      zIndex: 25,
      pointerEvents: 'none',
      animation: 'pulse-arrow 2s infinite ease-in-out'
    }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 40 40" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d={arrowPath} 
          stroke={color} 
          strokeWidth="3" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      <style>
        {`
          @keyframes pulse-arrow {
            0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.95); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
            100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.95); }
          }
        `}
      </style>
    </div>
  );
};

export default DirectionArrow;
