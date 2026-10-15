
import React from 'react';

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
  isFrozen: boolean;
  isRushHour: boolean; 
  size?: number; 
  strokeWidth?: number; 
}

const CircularTimerBase: React.FC<CircularTimerProps> = ({
  timeLeft,
  totalTime,
  isFrozen,
  isRushHour,
  size = 80, 
  strokeWidth = 7, 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const progressRatio = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const offset = circumference - progressRatio * circumference;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  let circleColorClass = 'stroke-electric-blue'; 
  if (isFrozen) {
    circleColorClass = 'stroke-cyan-300'; 
  } else if (isRushHour) {
    circleColorClass = 'stroke-danger-red'; 
  } else if (progressRatio <= 0.15) { 
    circleColorClass = 'stroke-danger-red';
  } else if (progressRatio <= 0.40) { 
    circleColorClass = 'stroke-warning-yellow';
  }

  const timerTextClass = `text-2xl font-bold transition-colors duration-300 ${
    isFrozen ? 'text-electric-blue' : 
    (isRushHour ? 'text-danger-red' : 
    (timeLeft <= 10 && timeLeft > 0 ? 'text-danger-red animate-pingOnce' :
    (timeLeft === 0 ? 'text-danger-red font-extrabold' : 
    (progressRatio <= 0.40 && progressRatio > 0.15 ? 'text-warning-yellow' : 
    (progressRatio <= 0.15 ? 'text-danger-red' : 'text-electric-blue')))))
  }`;
  
  const displayOffset = progressRatio === 0 ? circumference : offset;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3"> {/* Main flex container for Frozen block and Timer block */}
      {/* Frozen Notification Block (conditional) */}
      {isFrozen && (
        <div
          className="timer-frozen-display flex items-center" // Uses existing class for background/animation
          aria-label="Timer Frozen"
        >
          <span className="text-lg leading-none text-electric-blue" aria-hidden="true">❄️</span>
          <span className="ml-1 text-xs font-semibold text-light-text hidden sm:inline">
            FROZEN
          </span>
        </div>
      )}

      {/* Timer Circle and Digits Block */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
          {/* Background Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-dark-metal opacity-60"
            fill="transparent"
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className={`transition-all duration-200 ease-linear ${circleColorClass}`}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={displayOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-center ${isFrozen ? 'animate-timerFreezeEffect' : ''}`}>
          {/* Time digits */}
          <span className={timerTextClass}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Memoised so a parent re-render for unrelated state (score, messages) does not repaint
// the SVG arc while the clock value is unchanged.
const CircularTimer = React.memo(CircularTimerBase);

export default CircularTimer;
