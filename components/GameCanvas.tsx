
import React, { useRef, useEffect } from 'react';
import { GameState, PlatformType } from '../types';
import { COLORS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Polyfill for roundRect for older browsers
  const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) => {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    
    // Manual implementation for older browsers
    if (typeof r === 'number') {
      r = [r, r, r, r];
    }
    
    ctx.beginPath();
    ctx.moveTo(x + r[0], y);
    ctx.lineTo(x + w - r[1], y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    ctx.lineTo(x + w, y + h - r[2]);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    ctx.lineTo(x + r[3], y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    ctx.lineTo(x, y + r[0]);
    ctx.quadraticCurveTo(x, y, x + r[0], y);
    ctx.closePath();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const { player, platforms, particles, cameraX, cameraY, score, highSpeedMode, targetMeters } = gameState;

    // 1. Draw Background
    const skyTransition = Math.min(1, score / targetMeters);
    const topColor = lerpColor('#7dd3fc', '#020617', skyTransition);
    const bottomColor = lerpColor('#e0f2fe', '#1e293b', skyTransition);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Parallax
    ctx.save();
    ctx.translate(-cameraX * 0.2, -cameraY * 0.1);
    const cloudCount = 20;
    for (let i = 0; i < cloudCount; i++) {
        const xPos = (Math.floor(cameraX * 0.2 / 800) * 800) + (i * 800);
        const yPos = (i * 200) % 1000;
        if (skyTransition < 0.85) {
            drawCloud(ctx, xPos + 100, yPos, 0.6 + (i % 3) * 0.4);
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(xPos + (i * 157) % 800, yPos, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Speed Lines
    if (highSpeedMode) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      for(let i=0; i<30; i++) {
        const x = (Date.now() + i * 150) % canvas.width;
        const y = (i * 37) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 120, y);
        ctx.stroke();
      }
    }

    // 2. Draw World
    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // Platforms
    platforms.forEach(p => {
      if (p.type === PlatformType.FRAGILE && p.decay !== undefined && p.decay <= 0) return;

      // Draw shiny rounded platform
      ctx.save();
      if (p.type === PlatformType.FRAGILE && p.decay !== undefined) {
        ctx.globalAlpha = Math.max(0, p.decay / 30);
      }

      const radius = 12;
      const platformHeight = p.height || 35;

      // 1. Subtle Bottom Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      drawRoundRect(ctx, p.x + 2, p.y + 4, p.width, platformHeight, radius);
      ctx.fill();

      // 2. Main Body with Gradient
      const bodyGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + platformHeight);
      bodyGrad.addColorStop(0, p.color);
      bodyGrad.addColorStop(1, lerpColor(p.color, '#000000', 0.15));
      
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      drawRoundRect(ctx, p.x, p.y, p.width, platformHeight, radius);
      ctx.fill();

      // 3. Top Glossy Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      drawRoundRect(ctx, p.x + 5, p.y + 3, p.width - 10, platformHeight * 0.3, radius / 2);
      ctx.fill();

      // 4. Sharp Shine Line
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x + radius, p.y + 3);
      ctx.lineTo(p.x + p.width - radius, p.y + 3);
      ctx.stroke();

      ctx.restore();

      // Accents for specific types
      if (p.type === PlatformType.BOUNCY) {
        ctx.strokeStyle = '#fbcfe8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        drawRoundRect(ctx, p.x, p.y, p.width, 10, 5);
        ctx.stroke();
      } else if (p.type === PlatformType.BOOSTER) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const arrowCount = Math.max(1, Math.floor(p.width / 25));
        for(let i=0; i<arrowCount; i++) {
          const arrowX = p.x + 10 + i * 25;
          ctx.beginPath();
          ctx.moveTo(arrowX, p.y + 10); ctx.lineTo(arrowX + 10, p.y + 17); ctx.lineTo(arrowX, p.y + 25);
          ctx.fill();
        }
      } else if (p.type === PlatformType.ICE) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for(let i=0; i<3; i++) {
          ctx.beginPath();
          ctx.moveTo(p.x + 10 + i*30, p.y + 5);
          ctx.lineTo(p.x + 25 + i*30, p.y + 15);
          ctx.stroke();
        }
      } else if (p.type === PlatformType.SLOW) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(p.x, p.y + p.height - 5, p.width, 5);
      }
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Player Rendering
    const drawW = player.isWallSliding ? player.width * 0.85 : player.width;
    const drawH = player.isWallSliding ? player.height * 1.15 : player.height;
    const xOffset = player.isWallSliding ? (player.vel.x > 0 ? 3 : -3) : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    drawRoundRect(ctx, player.pos.x + 3 + xOffset, player.pos.y + 4, drawW, drawH, 10);
    ctx.fill();

    ctx.fillStyle = COLORS.PLAYER;
    if (highSpeedMode) ctx.fillStyle = '#fef3c7'; 
    ctx.beginPath();
    drawRoundRect(ctx, player.pos.x + (player.width - drawW)/2 + xOffset, player.pos.y + (player.height - drawH), drawW, drawH, 10);
    ctx.fill();

    // Face details
    const eyeDir = player.vel.x > 0 ? 4 : (player.vel.x < 0 ? -4 : 0);
    const eyeBaseY = player.pos.y + 12;
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.pos.x + 8 + eyeDir, eyeBaseY, 8, 8);
    ctx.fillRect(player.pos.x + 24 + eyeDir, eyeBaseY, 8, 8);
    ctx.fillStyle = '#000';
    ctx.fillRect(player.pos.x + 11 + eyeDir, eyeBaseY + 3, 3, 3);
    ctx.fillRect(player.pos.x + 27 + eyeDir, eyeBaseY + 3, 3, 3);

    // Mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const mouthY = player.pos.y + 28;
    const mouthX = player.pos.x + 20 + eyeDir;
    
    if (Math.abs(player.vel.y) > 3) {
        ctx.arc(mouthX, mouthY, 4, 0, Math.PI * 2); 
    } else if (Math.abs(player.vel.x) > 2) {
        ctx.moveTo(mouthX - 5, mouthY);
        ctx.lineTo(mouthX + 5, mouthY);
    } else {
        ctx.arc(mouthX, mouthY - 2, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    }
    ctx.stroke();

    ctx.restore();

  }, [gameState]);

  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 30 * scale, 0, Math.PI * 2);
    ctx.arc(x + 40 * scale, y - 10 * scale, 50 * scale, 0, Math.PI * 2);
    ctx.arc(x + 80 * scale, y, 35 * scale, 0, Math.PI * 2);
    ctx.fill();
  };

  const lerpColor = (a: string, b: string, amount: number) => {
    const ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);
    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + (rb | 0)).toString(16).slice(1);
  };

  return <canvas ref={canvasRef} className="block w-full h-full cursor-none" />;
};

export default GameCanvas;
