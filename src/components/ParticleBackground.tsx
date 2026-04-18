"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  baseOpacity: number;
  color: string;
  twinkleSpeed: number;
  twinklePhase: number;
  layer: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const animationRef = useRef<number>(0);

  const starColors = [
    "#ffffff",
    "#f1f5f9",
    "#cbd5e1",
    "#94a3b8",
    "#64748b",
    "#3b82f6",
    "#06b6d4",
    "#8b5cf6",
  ];

  const createParticle = useCallback((canvas: HTMLCanvasElement): Particle => {
    const layer = Math.floor(Math.random() * 3);
    const isFar = layer === 2;
    const isNear = layer === 0;
    
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.8,
      vx: (Math.random() - 0.5) * (isNear ? 0.3 : isFar ? 0.1 : 0.2),
      vy: (Math.random() - 0.5) * (isNear ? 0.3 : isFar ? 0.1 : 0.2) - 0.1,
      radius: isFar ? Math.random() * 1 + 0.5 : isNear ? Math.random() * 2 + 1.5 : Math.random() * 1.5 + 0.8,
      opacity: Math.random() * 0.6 + 0.2,
      baseOpacity: Math.random() * 0.6 + 0.2,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
      layer,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const PARTICLE_COUNT = 150;
    particlesRef.current = [];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlesRef.current.push(createParticle(canvas));
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        if (mouseRef.current.active && particle.layer === 0) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const repelRadius = 80;

          if (distance < repelRadius && distance > 0) {
            const force = (repelRadius - distance) / repelRadius;
            particle.vx -= (dx / distance) * force * 2;
            particle.vy -= (dy / distance) * force * 2;
          }
        }

        particle.vx *= 0.99;
        particle.vy *= 0.99;

        const padding = 10;
        if (particle.x < padding || particle.x > canvas.width - padding) {
          particle.vx *= -1;
        }
        if (particle.y < padding || particle.y > canvas.height * 0.85) {
          if (particle.y < padding) {
            particle.y = canvas.height * 0.8;
          } else {
            particle.y = padding;
          }
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        particle.twinklePhase += particle.twinkleSpeed;
        const twinkle = Math.sin(particle.twinklePhase) * 0.4 + 0.6;
        const currentOpacity = particle.baseOpacity * twinkle;

        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius * (particle.layer === 0 ? 4 : particle.layer === 1 ? 3 : 2)
        );
        
        const alpha = Math.floor(currentOpacity * 255).toString(16).padStart(2, "0");
        gradient.addColorStop(0, `${particle.color}${alpha}`);
        gradient.addColorStop(0.4, `${particle.color}${Math.floor(currentOpacity * 128).toString(16).padStart(2, "0")}`);
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * (particle.layer === 0 ? 4 : particle.layer === 1 ? 3 : 2), 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${particle.color}${alpha}`;
        ctx.fill();
      });

      particlesRef.current.forEach((p1, i) => {
        if (p1.layer !== 0) return;
        
        particlesRef.current.slice(i + 1).forEach((p2) => {
          if (p2.layer !== 0) return;
          
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            const lineOpacity = (120 - distance) / 120 * 0.1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${lineOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, [createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      aria-hidden="true"
    />
  );
}
