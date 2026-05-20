/**
 * Confetti explosion component.
 * Renders colorful particles that burst and fall when triggered.
 */

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  shape: 'square' | 'circle' | 'strip';
}

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFEB3B', '#E91E63'];
const PARTICLE_COUNT = 80;

function createParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const velocity = 4 + Math.random() * 8;
    particles.push({
      id: i,
      x: 50,
      y: 40,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1,
      velocityX: Math.cos(angle) * velocity,
      velocityY: Math.sin(angle) * velocity - 3,
      shape: ['square', 'circle', 'strip'][Math.floor(Math.random() * 3)] as Particle['shape'],
    });
  }
  return particles;
}

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

export function Confetti({ active, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setParticles(createParticles());
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!visible || particles.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.shape === 'strip' ? '4px' : '10px',
            height: p.shape === 'strip' ? '16px' : '10px',
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            animation: `confetti-fall 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
            '--vx': `${p.velocityX}vw`,
            '--vy': `${p.velocityY}vh`,
            opacity: 0.9,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          20% {
            transform: translate(var(--vx), var(--vy)) rotate(180deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(var(--vx) * 1.5), calc(var(--vy) + 80vh)) rotate(720deg) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
