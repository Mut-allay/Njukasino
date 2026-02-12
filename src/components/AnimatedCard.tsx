import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from './Card';
import './GameTable.css'; // Ensure styles are available

interface AnimatedCardProps {
  card: { value: string; suit: string };
  index: number;
  startPos: { x: number; y: number };
  targetPos: { x: number; y: number };
  size?: number; // Optional, defaults to standard calculation
  faceDown?: boolean;
  doubleBacked?: boolean;
  onAnimationEnd?: () => void;
  flipOnDeal?: boolean;
  delay?: number;
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 88,
};

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  card,
  startPos,
  targetPos,
  size = 100, // Default size if not provided
  faceDown = true,
  onAnimationEnd,
  flipOnDeal = true,
  delay = 0,
}) => {
  const [rotationY, setRotationY] = useState(faceDown ? 180 : 0);
  const zIndex = 1;

  // Trigger flip after a delay
  useEffect(() => {
    if (flipOnDeal) {
      const flipTimer = setTimeout(() => {
        setRotationY(0); // Flip to face up
      }, 500 + delay); // Adjusted delay logic
      return () => clearTimeout(flipTimer);
    }
  }, [flipOnDeal, delay]);

  // Check for animation end
  useEffect(() => {
    // Estimate animation duration based on spring physics or just a safe timeout
    const totalDuration = 1000 + delay;

    const endTimer = setTimeout(() => {
      onAnimationEnd?.();
    }, totalDuration);

    return () => clearTimeout(endTimer);
  }, [delay, onAnimationEnd]);

  // Calculate width/height based on size prop or defaults
  // Assuming standard card aspect ratio ~0.7
  const width = size * 0.7;
  const height = size;

  return (
    <motion.div
      initial={{ x: startPos.x, y: startPos.y }}
      animate={{ x: targetPos.x, y: targetPos.y }}
      transition={springTransition}
      style={{
        position: 'absolute',
        width: `${width}px`,
        height: `${height}px`,
        zIndex,
        top: 0,
        left: 0,
        pointerEvents: 'none',
        rotateY: rotationY,
      }}
      className="animated-card-container"
    >
      <Card
        value={card.value}
        suit={card.suit}
        facedown={rotationY > 90} // Show back if rotated more than 90 degrees
        style={{ width: '100%', height: '100%', margin: 0 }} // Ensure Card fills container
      />
    </motion.div>
  );
};

export default AnimatedCard;
