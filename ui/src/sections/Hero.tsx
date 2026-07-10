import { useEffect, useRef } from 'react';
import { ArrowRight, Github, Play, Zap } from 'lucide-react';

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number; y: number; vx: number; vy: number; radius: number; alpha: number;
    }> = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const createParticles = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      particles = [];
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Draw central node
      const cx = w / 2;
      const cy = h / 2;

      // Central glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 120, 0, Math.PI * 2);
      ctx.fill();

      // Central node circle
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.fill();

      // Pulse ring
      const time = Date.now() / 1000;
      const pulseRadius = 20 + Math.sin(time * 2) * 5;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(99, 102, 241, ${0.3 + Math.sin(time * 2) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Update and draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
        ctx.fill();

        // Draw lines to center
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 200)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      // Draw connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0a0e1a] animated-grid overflow-hidden">
      <canvas ref={canvasRef} className="hero-canvas" />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          The Autonomous Marketing Brain for B2B Growth
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
          The Last Marketing
          <br />
          Platform You&apos;ll{' '}
          <span className="gradient-text">Ever Need</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          One autonomous brain that scrapes, decides, remembers, and executes — while you sleep.
          Zero per-seat cost. Full data sovereignty.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="https://github.com/knol3j/squidweave/tree/frontend-v22"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
          >
            <Zap className="w-5 h-5" />
            Launch Engine
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all glow-pulse"
          >
            Get Early Access
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="https://github.com/knol3j/squidweave"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-slate-700 hover:border-slate-500 rounded-xl transition-all"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-400" />
            <span>84+ API Endpoints</span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-400" />
            <span>6 Automation Modules</span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-400" />
            <span>Docker + Postgres Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-400" />
            <span>Open Source</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs text-slate-500">Scroll to explore</span>
        <div className="w-6 h-10 rounded-full border-2 border-slate-700 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-indigo-400 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
