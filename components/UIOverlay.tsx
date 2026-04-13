
import React, { useState, useEffect } from 'react';
import { Difficulty } from '../types';

interface UIOverlayProps {
  score: number;
  isGameOver: boolean;
  isGameWon: boolean;
  isSelectingMode: boolean;
  targetMeters: number;
  encouragement: string;
  completionCounts: Record<Difficulty, number>;
  onRestart: () => void;
  onSelectMode: (mode: Difficulty) => void;
  onInput: (key: string, active: boolean) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  score, 
  isGameOver, 
  isGameWon, 
  isSelectingMode,
  targetMeters, 
  encouragement, 
  completionCounts,
  onRestart,
  onSelectMode,
  onInput
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 1024
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const progress = Math.min(100, (score / targetMeters) * 100);
  
  const handlePointerAction = (key: string, active: boolean, e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      // Prevent default to stop scrolling while playing
      if (e.cancelable) e.preventDefault();
    }
    // Capture pointer to ensure we get the up event even if finger moves off button
    if (active && e.currentTarget) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore errors if pointer capture fails
      }
    }
    onInput(key, active);
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 font-['Quicksand'] select-none overflow-hidden touch-none">
      {/* HUD - Top Bar */}
      {!isSelectingMode && (
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-2xl shadow-lg border-b-4 border-sky-300 pointer-events-auto">
              <h1 className="text-xs md:text-xl font-bold text-sky-600 font-['Fredoka_One'] tracking-wide">SKY-HIGH HOPS</h1>
              <p className="text-gray-700 font-bold text-lg md:text-2xl tabular-nums">
                {score.toLocaleString()} <span className="text-xs md:text-sm font-normal text-gray-400">M</span>
              </p>
            </div>
            
            <div className="w-32 md:w-64 h-3 md:h-4 bg-white/50 rounded-full border border-white overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] md:text-xs font-bold text-indigo-600 drop-shadow-sm uppercase tracking-widest">
              {progress.toFixed(1)}% to {targetMeters.toLocaleString()}M
            </p>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md p-2 md:p-4 rounded-xl shadow-md border-r-4 border-amber-300 max-w-[140px] md:max-w-xs transition-all duration-300 pointer-events-auto">
            <p className="text-amber-600 font-bold italic text-[9px] md:text-xs uppercase tracking-tighter mb-1">Spirit Guide</p>
            <p className="text-gray-700 font-medium text-[10px] md:text-sm leading-tight italic">"{encouragement}"</p>
          </div>
        </div>
      )}

      {/* Mode Selection Screen */}
      {isSelectingMode && (
        <div className="absolute inset-0 bg-sky-100/40 backdrop-blur-lg flex items-center justify-center pointer-events-auto z-50 p-4">
          <div className="bg-white/95 p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl border-b-8 border-sky-200 text-center w-full max-w-2xl transform animate-in zoom-in duration-300 overflow-y-auto max-h-full scrollbar-hide">
            <h2 className="text-3xl md:text-5xl font-['Fredoka_One'] text-sky-500 mb-2">CHOOSE MODE</h2>
            <p className="text-gray-500 mb-6 md:mb-10 font-semibold uppercase tracking-widest text-[10px] md:text-sm">How far can you hop?</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { type: Difficulty.EASY, label: 'EASY', goal: '10,000M', icon: '🌱', color: 'emerald', bg: 'emerald-50', border: 'emerald-200', text: 'emerald-600' },
                { type: Difficulty.MEDIUM, label: 'MEDIUM', goal: '100,000M', icon: '⚡', color: 'amber', bg: 'amber-50', border: 'amber-200', text: 'amber-600' },
                { type: Difficulty.HARD, label: 'HARD', goal: '1,000,000M', icon: '💀', color: 'rose', bg: 'rose-50', border: 'rose-200', text: 'rose-600' },
                { type: Difficulty.CHAOS, label: 'CHAOS', goal: '1,000,000M', icon: '🌀', color: 'purple', bg: 'purple-50', border: 'purple-200', text: 'purple-600' }
              ].map((m) => (
                <button 
                  key={m.type}
                  onClick={() => onSelectMode(m.type)}
                  className={`group relative p-4 md:p-6 bg-${m.bg} hover:brightness-95 border-2 border-${m.border} rounded-2xl md:rounded-3xl transition-all hover:scale-105 active:scale-95 overflow-visible text-center`}
                >
                  {completionCounts[m.type] > 0 && (
                    <div className={`absolute -top-3 -right-3 bg-${m.color}-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white z-10`}>
                      {completionCounts[m.type]} WINS
                    </div>
                  )}
                  <div className="text-3xl md:text-4xl mb-1 md:mb-2">{m.icon}</div>
                  <h3 className={`font-bold text-${m.text} text-sm md:text-xl uppercase`}>{m.label}</h3>
                  <p className={`text-${m.color}-500 font-bold text-xs md:text-base`}>{m.goal}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Touch Gameplay Controls */}
      {!isSelectingMode && !isGameOver && !isGameWon && (
        <div className="w-full flex flex-col items-center gap-6 pointer-events-none">
          {/* Desktop Controls Help (Hide on touch devices) */}
          {!isTouchDevice && (
            <div className="bg-white/30 backdrop-blur-md text-sky-900 px-6 py-2 rounded-full text-[10px] md:text-xs font-bold shadow-sm flex gap-4 border border-white/50 mb-4 transition-opacity duration-300">
              <span>[W] FORWARD</span>
              <span className="opacity-40">|</span>
              <span>[S] BACKWARD</span>
              <span className="opacity-40">|</span>
              <span>[SPACE] JUMP</span>
            </div>
          )}

          {/* Virtual Buttons for Mobile/Tablet */}
          {isTouchDevice && (
            <div className="flex justify-between w-full px-2 pb-6 md:pb-10 pointer-events-auto">
              {/* Movement D-Pad (Left) */}
              <div className="flex gap-4 items-end">
                <button 
                  className="touch-button w-16 h-16 md:w-20 md:h-20 bg-white/40 backdrop-blur-xl border-4 border-white/60 rounded-2xl flex items-center justify-center text-3xl shadow-xl active:bg-white/70 active:scale-90 transition-all active:border-sky-300 pointer-events-auto cursor-pointer"
                  onPointerDown={(e) => handlePointerAction('KeyS', true, e)}
                  onPointerUp={(e) => handlePointerAction('KeyS', false, e)}
                  onPointerCancel={(e) => handlePointerAction('KeyS', false, e)}
                >
                  ⬅️
                </button>
                <button 
                  className="touch-button w-16 h-16 md:w-20 md:h-20 bg-white/40 backdrop-blur-xl border-4 border-white/60 rounded-2xl flex items-center justify-center text-3xl shadow-xl active:bg-white/70 active:scale-90 transition-all active:border-sky-300 pointer-events-auto cursor-pointer"
                  onPointerDown={(e) => handlePointerAction('KeyW', true, e)}
                  onPointerUp={(e) => handlePointerAction('KeyW', false, e)}
                  onPointerCancel={(e) => handlePointerAction('KeyW', false, e)}
                >
                  ➡️
                </button>
              </div>

              {/* Jump Button (Right) */}
              <div className="flex items-end">
                <button 
                  className="touch-button w-24 h-24 md:w-32 md:h-32 bg-sky-400/50 backdrop-blur-xl border-4 border-white rounded-full flex flex-col items-center justify-center shadow-2xl active:bg-sky-500/80 active:scale-90 transition-all font-bold text-white uppercase tracking-widest text-lg md:text-xl pointer-events-auto cursor-pointer"
                  onPointerDown={(e) => handlePointerAction('Space', true, e)}
                  onPointerUp={(e) => handlePointerAction('Space', false, e)}
                  onPointerCancel={(e) => handlePointerAction('Space', false, e)}
                >
                  <span className="text-3xl md:text-4xl mb-1">⬆️</span>
                  JUMP
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Over / Win State Screens */}
      {(isGameOver || isGameWon) && (
        <div className="absolute inset-0 bg-sky-950/70 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50 p-4">
          <div className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl border-b-8 border-sky-200 text-center w-full max-w-lg transform transition-all animate-in zoom-in duration-300">
            {isGameWon ? (
              <>
                <div className="text-6xl md:text-8xl mb-4 animate-bounce">🏆</div>
                <h2 className="text-4xl md:text-6xl font-['Fredoka_One'] text-indigo-500 mb-4 uppercase">LEGEND!</h2>
                <p className="text-sm md:text-lg text-gray-600 mb-8 font-semibold uppercase tracking-tight">
                  Goal reached! High five, champion!
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl md:text-8xl mb-4">☁️</div>
                <h2 className="text-4xl md:text-6xl font-['Fredoka_One'] text-orange-400 mb-4 uppercase">FALLEN!</h2>
                <p className="text-sm md:text-lg text-gray-600 mb-2 font-semibold italic">"The clouds are soft, but keep trying!"</p>
                <div className="text-3xl md:text-4xl font-bold text-sky-500 mb-8 tabular-nums">
                  {score.toLocaleString()} <span className="text-xs md:text-sm">METERS</span>
                </div>
              </>
            )}
            <button 
              onClick={onRestart}
              className="touch-button group relative bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 px-8 md:py-5 md:px-12 rounded-2xl text-lg md:text-2xl shadow-xl transition-all active:scale-95 overflow-hidden w-full"
            >
              <span className="relative z-10">MAIN MENU</span>
              <div className="absolute inset-0 bg-white/10 group-active:bg-transparent transition-colors"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
