import React, { useEffect, useRef } from 'react';

export type CoreState = 'idle' | 'typing' | 'thinking' | 'generating' | 'completed' | 'error';

interface ModaUICoreProps {
  state?: CoreState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  orbitAngle: number;
  orbitSpeed: number;
}

export const ModaUICore: React.FC<ModaUICoreProps> = ({
  state = 'idle',
  size = 'md',
  className = '',
  label,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<CoreState>(state);
  const burstTimerRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current = state;
    if (state === 'completed') {
      burstTimerRef.current = 1.0; // Trigger radiant convergence burst
    }
  }, [state]);

  const pixelSize = size === 'sm' ? 80 : size === 'md' ? 160 : 220;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = pixelSize * dpr;
    canvas.height = pixelSize * dpr;
    ctx.scale(dpr, dpr);

    const centerX = pixelSize / 2;
    const centerY = pixelSize / 2;

    // Particle Palette
    const colors = [
      '#1E293B', // Slate Charcoal
      '#6366F1', // Indigo Starlight
      '#3B82F6', // Cobalt Electric
      '#D97706', // Couture Amber
      '#EC4899', // Silk Rose
      '#8B5CF6', // Velvet Purple
      '#10B981', // Emerald Accents
    ];

    const particleCount = size === 'sm' ? 70 : 140;
    const particles: Particle[] = [];

    const baseRadius = pixelSize * 0.28;

    for (let i = 0; i < particleCount; i++) {
      // Fibonacci sphere distribution for uniform 3D orb
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const x = baseRadius * Math.cos(theta) * Math.sin(phi);
      const y = baseRadius * Math.sin(theta) * Math.sin(phi);
      const z = baseRadius * Math.cos(phi);

      particles.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        vx: 0,
        vy: 0,
        vz: 0,
        size: Math.random() * 2 + 1.2,
        color: colors[i % colors.length],
        alpha: Math.random() * 0.6 + 0.4,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: (Math.random() - 0.5) * 0.02 + 0.01,
      });
    }

    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, pixelSize, pixelSize);

      const currentState = stateRef.current;

      // Handle radiant burst cooldown
      if (burstTimerRef.current > 0) {
        burstTimerRef.current -= 0.015;
        if (burstTimerRef.current < 0) burstTimerRef.current = 0;
      }

      // State modifiers
      let targetScale = 1.0;
      let rotSpeed = 0.008;
      let jitter = 0.0;
      let coreGlowColor = 'rgba(99, 102, 241, 0.15)';

      switch (currentState) {
        case 'typing':
          targetScale = 0.75; // Contract tightly on human typing
          rotSpeed = 0.018;
          coreGlowColor = 'rgba(79, 70, 229, 0.25)';
          break;
        case 'thinking':
          targetScale = 0.95 + Math.sin(time * 4) * 0.12; // Pulsing spiral
          rotSpeed = 0.045;
          coreGlowColor = 'rgba(139, 92, 246, 0.35)';
          break;
        case 'generating':
          targetScale = 1.05 + Math.sin(time * 6) * 0.08; // High frequency synthesis ripple
          rotSpeed = 0.035;
          jitter = 1.8;
          coreGlowColor = 'rgba(236, 72, 153, 0.32)';
          break;
        case 'completed':
          targetScale = 1.0 + burstTimerRef.current * 0.4;
          rotSpeed = 0.012;
          coreGlowColor = 'rgba(16, 185, 129, 0.38)';
          break;
        case 'error':
          targetScale = 0.85 + (Math.random() - 0.5) * 0.1;
          rotSpeed = 0.01;
          jitter = 2.5;
          coreGlowColor = 'rgba(239, 68, 68, 0.3)';
          break;
        case 'idle':
        default:
          targetScale = 1.0 + Math.sin(time) * 0.06; // Calm respiration
          rotSpeed = 0.008;
          coreGlowColor = 'rgba(30, 41, 59, 0.12)';
          break;
      }

      // Draw subtle core aura glow
      const auraGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        pixelSize * 0.05,
        centerX,
        centerY,
        baseRadius * targetScale * 1.6
      );
      auraGradient.addColorStop(0, coreGlowColor);
      auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * targetScale * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Sort particles by depth for correct 3D projection
      const cosY = Math.cos(time * rotSpeed * 30);
      const sinY = Math.sin(time * rotSpeed * 30);
      const cosX = Math.cos(time * 0.4);
      const sinX = Math.sin(time * 0.4);

      const projected = particles.map((p) => {
        // Current position with scaling and jitter
        let px = p.baseX * targetScale;
        let py = p.baseY * targetScale;
        let pz = p.baseZ * targetScale;

        if (jitter > 0) {
          px += (Math.random() - 0.5) * jitter;
          py += (Math.random() - 0.5) * jitter;
        }

        // Apply 3D Y rotation
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;

        // Apply 3D X rotation
        const y2 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        // Perspective projection
        const fov = 240;
        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        return {
          x: projX,
          y: projY,
          z: z2,
          size: p.size * scale,
          color: p.color,
          alpha: p.alpha * Math.min(1, Math.max(0.2, (z2 + baseRadius) / (2 * baseRadius))),
        };
      });

      projected.sort((a, b) => a.z - b.z);

      // Draw particles & linking filaments
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];

        // Draw particle dot
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles with subtle light filaments
        if (size !== 'sm') {
          for (let j = i + 1; j < projected.length; j++) {
            const p2 = projected[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < pixelSize * 0.14) {
              const lineAlpha = (1 - dist / (pixelSize * 0.14)) * 0.15 * p.alpha;
              ctx.strokeStyle = p.color;
              ctx.globalAlpha = lineAlpha;
              ctx.lineWidth = 0.75;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [pixelSize, size]);

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: pixelSize, height: pixelSize }}
        className="block transition-transform duration-300"
      />
      {label && (
        <span className="mt-2 text-[11px] font-mono tracking-wider text-stone-500 uppercase transition-opacity">
          {label}
        </span>
      )}
    </div>
  );
};
