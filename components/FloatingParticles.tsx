// components/FloatingParticles.tsx
// Ambient floating particles for zen atmosphere
// Fixed: Uses client-side only generation to prevent hydration errors

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

export const FloatingParticles: React.FC = () => {
  // State starts as empty array
  const [particles, setParticles] = useState<Particle[]>([]);

  // Generate particles ONLY on client side after mount
  // This prevents server/client mismatch (hydration error)
  useEffect(() => {
    const generatedParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2, // 2-6px
      x: Math.random() * 100, // Random X position (%)
      y: Math.random() * 100, // Random Y position (%)
      duration: Math.random() * 20 + 15, // 15-35s for slow movement
      delay: Math.random() * 5, // Stagger start times
    }));

    setParticles(generatedParticles);
  }, []); // Empty dependency array = run once on mount

  // Don't render anything until particles are generated on client
  // This ensures server renders nothing, client renders particles
  if (particles.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-purple-300/20 dark:bg-purple-400/10 blur-sm"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -50, 0], // Float up and down
            x: [0, 30, -30, 0], // Drift side to side
            opacity: [0.3, 0.7, 0.3], // Pulse opacity
            scale: [1, 1.2, 1], // Subtle scale change
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
