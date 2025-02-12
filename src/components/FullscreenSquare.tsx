import React, { useState } from 'react';
import { Square } from 'lucide-react';

interface FullscreenSquareProps {
  className?: string;
  children?: React.ReactNode;
}

const FullscreenSquare: React.FC<FullscreenSquareProps> = ({ className = '' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center p-2 cursor-pointer hover:bg-gray-100 rounded ${className}`}
      onClick={handleFullscreen}
      role="button"
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ?
      (
        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed"><path d="M264-264h-84q-15.3 0-25.65-10.29Q144-284.58 144-299.79t10.35-25.71Q164.7-336 180-336h120q15.3 0 25.65 10.35Q336-315.3 336-300v120q0 15.3-10.29 25.65Q315.42-144 300.21-144t-25.71-10.35Q264-164.7 264-180v-84Zm432 0v84q0 15.3-10.29 25.65Q675.42-144 660.21-144t-25.71-10.35Q624-164.7 624-180v-120q0-15.3 10.35-25.65Q644.7-336 660-336h120q15.3 0 25.65 10.29Q816-315.42 816-300.21t-10.35 25.71Q795.3-264 780-264h-84ZM264-696v-84q0-15.3 10.29-25.65Q284.58-816 299.79-816t25.71 10.35Q336-795.3 336-780v120q0 15.3-10.35 25.65Q315.3-624 300-624H180q-15.3 0-25.65-10.29Q144-644.58 144-659.79t10.35-25.71Q164.7-696 180-696h84Zm432 0h84q15.3 0 25.65 10.29Q816-675.42 816-660.21t-10.35 25.71Q795.3-624 780-624H660q-15.3 0-25.65-10.35Q624-644.7 624-660v-120q0-15.3 10.29-25.65Q644.58-816 659.79-816t25.71 10.35Q696-795.3 696-780v84Z"/></svg>
      ) : <Square size={16} />}
    </div>
  );
};

export default FullscreenSquare;