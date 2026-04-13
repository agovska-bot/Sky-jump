
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, Player, Platform, PlatformType, Difficulty } from './types';
import { DIFFICULTY_CONFIG, COLORS, FRICTION, ICE_FRICTION, SLOW_FRICTION } from './constants';
import { getEncouragement } from './services/geminiService';

const INITIAL_PLAYER: Player = {
  pos: { x: 50, y: 300 },
  vel: { x: 0, y: 0 },
  width: 40,
  height: 40,
  isGrounded: false,
  jumpCount: 0,
  isWallSliding: false,
  lastWallJumpDir: 0,
};

const STORAGE_KEY = 'sky_hops_v1_completions';

// Enhanced Generation Phase Types for more "Roller-Coaster" variety
enum GenPhase {
  STABLE = 'STABLE',   // Plateau/Flat section
  CLIMB = 'CLIMB',     // Moving upwards
  DIVE = 'DIVE',       // Rapidly moving downwards
  WOBBLY = 'WOBBLY',   // Fast oscillations
  VALLEY = 'VALLEY',   // Staying low
  PEAK = 'PEAK',       // Staying high
  SCRAMBLE = 'SCRAMBLE' // Very chaotic verticality
}

const App: React.FC = () => {
  const loadCompletions = (): Record<Difficulty, number> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load completions", e);
    }
    return {
      [Difficulty.EASY]: 0,
      [Difficulty.MEDIUM]: 0,
      [Difficulty.HARD]: 0,
      [Difficulty.CHAOS]: 0,
    };
  };

  const [gameState, setGameState] = useState<GameState>({
    player: JSON.parse(JSON.stringify(INITIAL_PLAYER)),
    platforms: [],
    particles: [],
    cameraX: 0,
    cameraY: 0,
    score: 0,
    isGameOver: false,
    isGameWon: false,
    distanceReached: 0,
    highSpeedMode: false,
    difficulty: Difficulty.EASY,
    targetMeters: DIFFICULTY_CONFIG.EASY.target,
    isSelectingMode: true,
    completionCounts: loadCompletions(),
    boosterTimeRemaining: 0,
    airTime: 0,
  });

  const [encouragement, setEncouragement] = useState("Choose your challenge to start.");
  const lastEncouragementTime = useRef(0);
  const keys = useRef<{ [key: string]: boolean }>({});
  const pendingEncouragementContext = useRef<string | null>(null);
  const pendingJump = useRef(false);
  const lastGeneratedX = useRef(0);
  const platformIdCounter = useRef(0);
  
  // Phase state for the procedural generator
  const currentGenPhase = useRef<GenPhase>(GenPhase.STABLE);
  const phaseRemainingSteps = useRef<number>(0);
  // Track vertical momentum of the "track" to make it feel more like a coaster
  const trackVerticalMomentum = useRef<number>(0);

  /**
   * Generates platforms with a "Phase-Based Roller-Coaster" approach.
   * Every call uses fresh Math.random() calls to ensure no two runs are alike.
   */
  const generatePlatforms = useCallback((startX: number, count: number, currentMeters: number, difficulty: Difficulty, existingPlatforms: Platform[]) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const newPlatforms: Platform[] = [];
    
    const g = config.gravity;
    const vJump = Math.abs(config.jumpForce);
    const vMax = config.maxSpeed;
    const horizontalSafety = 0.55; 
    const hMaxReach = (vJump * vJump) / (2 * g);
    const tPeak = vJump / g;

    let lastX = startX;
    let lastY = 450;

    // Connect to the end of the current map
    if (existingPlatforms.length > 0) {
      const lastP = existingPlatforms[existingPlatforms.length - 1];
      lastX = lastP.x + lastP.width;
      lastY = lastP.y;
    }

    // Initial platform for the very beginning of a run
    if (startX === 0) {
      newPlatforms.push({ 
        id: 'start', 
        x: 0, 
        y: 450, 
        width: 800 + Math.random() * 200, 
        height: 120, 
        type: PlatformType.NORMAL, 
        color: COLORS.GRASS,
        heightMap: Array(12).fill(0),
        bottomMap: Array(12).fill(120)
      });
      lastX = newPlatforms[0].x + newPlatforms[0].width;
      lastY = 450;
      currentGenPhase.current = GenPhase.STABLE;
      phaseRemainingSteps.current = 6;
      trackVerticalMomentum.current = 0;
    }

    for (let i = 0; i < count; i++) {
      // 1. Manage Roller-Coaster Phases
      if (phaseRemainingSteps.current <= 0) {
        const roll = Math.random();
        if (roll < 0.15) currentGenPhase.current = GenPhase.STABLE;
        else if (roll < 0.35) currentGenPhase.current = GenPhase.CLIMB;
        else if (roll < 0.55) currentGenPhase.current = GenPhase.DIVE;
        else if (roll < 0.70) currentGenPhase.current = GenPhase.WOBBLY;
        else if (roll < 0.85) currentGenPhase.current = GenPhase.VALLEY;
        else if (roll < 0.95) currentGenPhase.current = GenPhase.PEAK;
        else currentGenPhase.current = GenPhase.SCRAMBLE;
        
        phaseRemainingSteps.current = 3 + Math.floor(Math.random() * 9);
      }
      phaseRemainingSteps.current--;

      // 2. Pick a randomized Platform Type
      const typeSeed = Math.random();
      let type = PlatformType.NORMAL;
      let color = COLORS.CLOUD;
      let moveRange = 0;
      let moveSpeed = 0;
      let decay = 0;

      // In CHAOS mode, every platform is special
      const isChaos = difficulty === Difficulty.CHAOS;

      if (isChaos) {
        // Chaos logic: 100% special platforms distributed across all types
        const chaosSeed = Math.random();
        if (chaosSeed > 0.84) {
          type = PlatformType.BOOSTER;
          color = COLORS.BOOSTER;
        } else if (chaosSeed > 0.68) {
          type = PlatformType.BOUNCY;
          color = COLORS.BOUNCY;
        } else if (chaosSeed > 0.52) {
          type = PlatformType.ICE;
          color = COLORS.ICE;
        } else if (chaosSeed > 0.36) {
          type = PlatformType.SLOW;
          color = COLORS.SLOW;
        } else if (chaosSeed > 0.18) {
          type = PlatformType.MOVING;
          color = COLORS.MOVING;
          moveRange = 50 + Math.random() * 80;
          moveSpeed = 0.7 + Math.random() * 1.1;
        } else {
          type = PlatformType.FRAGILE;
          color = COLORS.FRAGILE;
          decay = 65;
        }
      } else {
        // Normal modes: Special platforms are much rarer (approx 15-25% total)
        if (typeSeed > 0.96 && difficulty !== Difficulty.EASY) {
          type = PlatformType.BOOSTER;
          color = COLORS.BOOSTER;
        } else if (typeSeed > 0.92) {
          type = PlatformType.BOUNCY;
          color = COLORS.BOUNCY;
        } else if (typeSeed > 0.88) {
          type = PlatformType.ICE;
          color = COLORS.ICE;
        } else if (typeSeed > 0.84) {
          type = PlatformType.SLOW;
          color = COLORS.SLOW;
        } else if (typeSeed > 0.80 && difficulty !== Difficulty.EASY) {
          type = PlatformType.MOVING;
          color = COLORS.MOVING;
          moveRange = 50 + Math.random() * 80;
          moveSpeed = 0.7 + Math.random() * 1.1;
        } else if (typeSeed > 0.76 && difficulty === Difficulty.HARD) {
          type = PlatformType.FRAGILE;
          color = COLORS.FRAGILE;
          decay = 65; 
        }
      }

      // 3. Determine Height Change based on Phase
      let targetY = lastY;
      const maxClimbPerStep = hMaxReach * 0.45; 
      const maxFallPerStep = 600;

      switch (currentGenPhase.current) {
        case GenPhase.STABLE:
          targetY = lastY + (Math.random() - 0.5) * 60;
          break;
        case GenPhase.CLIMB:
          trackVerticalMomentum.current = Math.max(-maxClimbPerStep, trackVerticalMomentum.current - 5);
          targetY = lastY + trackVerticalMomentum.current;
          break;
        case GenPhase.DIVE:
          trackVerticalMomentum.current = Math.min(maxFallPerStep * 0.4, trackVerticalMomentum.current + 15);
          targetY = lastY + trackVerticalMomentum.current;
          break;
        case GenPhase.WOBBLY:
          targetY = lastY + (Math.sin(platformIdCounter.current * 1.2) * 150);
          break;
        case GenPhase.VALLEY:
          targetY = 900 + (Math.random() - 0.5) * 80; // Stay low
          break;
        case GenPhase.PEAK:
          targetY = 250 + (Math.random() - 0.5) * 80; // Stay high
          break;
        case GenPhase.SCRAMBLE:
          targetY = lastY + (Math.random() > 0.5 ? -maxClimbPerStep * 0.8 : maxFallPerStep * 0.4);
          break;
      }

      // Always reset vertical momentum slightly towards 0 when not in a dedicated climb/dive
      if (currentGenPhase.current !== GenPhase.CLIMB && currentGenPhase.current !== GenPhase.DIVE) {
        trackVerticalMomentum.current *= 0.7;
      }

      // Physics safety clamps to ensure every jump is possible
      if (targetY < lastY - maxClimbPerStep) targetY = lastY - maxClimbPerStep;
      if (targetY > lastY + maxFallPerStep) targetY = lastY + maxFallPerStep;

      // Keep within the world vertical bounds
      let nextY = Math.max(120, Math.min(1100, targetY));
      const dy = nextY - lastY;

      // 4. Unique Gap Calculation
      const hFall = hMaxReach + dy;
      let tAir = tPeak;
      if (hFall > 0) tAir += Math.sqrt((2 * hFall) / g);

      const vEffective = vMax * 0.88;
      const xReachMax = vEffective * tAir;
      const reachableBudget = xReachMax - (moveRange * 2.0);
      const safeMaxGap = Math.max(150, reachableBudget * horizontalSafety);
      const minGap = Math.max(130, config.gapBase);
      
      // Add significant randomness to gaps
      const gapVariability = Math.random() * (safeMaxGap - minGap);
      let gap = minGap + gapVariability;
      
      const nextX = lastX + gap;

      // 5. Randomized Platform Appearance
      const progress = Math.min(1, currentMeters / config.target);
      let width = config.platformWidthBase - (progress * 40) + (Math.random() - 0.5) * 100;
      width = Math.max(100, width); 

      // Unique "wobbly" terrain map for this specific platform
      const segments = Math.floor(width / 18);
      const heightMap: number[] = [];
      const bottomMap: number[] = [];
      for (let s = 0; s <= segments; s++) {
        heightMap.push(0); // Flat surface
        bottomMap.push(35); // Flat bottom
      }
      
      newPlatforms.push({
        id: `p-${platformIdCounter.current++}`,
        x: nextX,
        y: nextY,
        width,
        height: 35,
        type,
        color,
        moveRange,
        moveSpeed,
        initialX: nextX,
        decay,
        isTouched: false,
        heightMap,
        bottomMap
      });

      lastX = nextX + width;
      lastY = nextY;
    }
    
    lastGeneratedX.current = lastX;
    return newPlatforms;
  }, []);

  const selectMode = (difficulty: Difficulty) => {
    // COMPLETE RESET OF GENERATOR STATE
    lastGeneratedX.current = 0;
    platformIdCounter.current = 0;
    phaseRemainingSteps.current = 0;
    trackVerticalMomentum.current = 0;
    
    const config = DIFFICULTY_CONFIG[difficulty];
    const initialPlatforms = generatePlatforms(0, 60, 0, difficulty, []);
    
    setGameState(prev => ({
      ...prev,
      player: JSON.parse(JSON.stringify(INITIAL_PLAYER)),
      platforms: initialPlatforms,
      particles: [],
      cameraX: 0,
      cameraY: 0,
      score: 0,
      isGameOver: false,
      isGameWon: false,
      distanceReached: 0,
      highSpeedMode: false,
      difficulty: difficulty,
      targetMeters: config.target,
      isSelectingMode: false,
      boosterTimeRemaining: 0,
      airTime: 0,
    }));
    
    const messages = [
      "New path, new adventure! Let's fly!",
      "Buckle up for a fresh coaster ride!",
      "Every cloud is different today. Hop on!",
      "A unique sky-road is waiting for you.",
      "Ready for a completely different climb?"
    ];
    setEncouragement(messages[Math.floor(Math.random() * messages.length)]);
  };

  const setInput = useCallback((key: string, active: boolean) => {
    if (key === 'Space' && active) {
      pendingJump.current = true;
    }
    keys.current[key] = active;
  }, []);

  const resetGame = useCallback(() => {
    setGameState(prev => ({ 
      ...prev, 
      isSelectingMode: true,
      isGameOver: false,
      isGameWon: false
    }));
  }, []);

  const updateGeminiEncouragement = useCallback(async (context: string) => {
    const now = Date.now();
    if (now - lastEncouragementTime.current > 30000) {
      lastEncouragementTime.current = now;
      const text = await getEncouragement(context);
      setEncouragement(text);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingEncouragementContext.current) {
        const ctx = pendingEncouragementContext.current;
        pendingEncouragementContext.current = null;
        updateGeminiEncouragement(ctx);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [updateGeminiEncouragement]);

  const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
  const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const update = useCallback(() => {
    setGameState(prev => {
      if (prev.isGameOver || prev.isGameWon || prev.isSelectingMode) return prev;

      const config = DIFFICULTY_CONFIG[prev.difficulty];
      const newPlayer: Player = { 
        ...prev.player,
        pos: { ...prev.player.pos },
        vel: { ...prev.player.vel }
      };
      
      const newParticles = [...prev.particles];
      let isGameWon = prev.isGameWon;
      let isGameOver = prev.isGameOver;
      let updatedCompletionCounts = { ...prev.completionCounts };
      let boosterTime = prev.boosterTimeRemaining;
      let airTime = prev.airTime;

      let newPlatformsList = [...prev.platforms];
      if (newPlayer.pos.x + 4000 > lastGeneratedX.current) {
        const appended = generatePlatforms(lastGeneratedX.current, 35, prev.score, prev.difficulty, newPlatformsList);
        newPlatformsList = [...newPlatformsList, ...appended];
        // Clean up old platforms to keep memory low
        newPlatformsList = newPlatformsList.filter(p => p.x + p.width > prev.cameraX - 2500);
      }

      let grounded = false;
      let touchingWall = false;
      let wallDirection = 0; 

      const updatedPlatforms = newPlatformsList.map(p => {
        let currentP = { ...p };
        if (p.type === PlatformType.MOVING && p.moveRange && p.moveSpeed && p.initialX !== undefined) {
          const offsetX = Math.sin(Date.now() / 1000 * p.moveSpeed) * p.moveRange;
          currentP.x = p.initialX + offsetX;
        }

        if (currentP.isTouched && currentP.type === PlatformType.FRAGILE && currentP.decay !== undefined) {
          currentP.decay -= 1;
        }

        const hOverlap = (newPlayer.pos.x + newPlayer.width > currentP.x && newPlayer.pos.x < currentP.x + currentP.width);
        
        let surfaceY = currentP.y;
        if (currentP.heightMap && hOverlap) {
          const relX = (newPlayer.pos.x + newPlayer.width / 2) - currentP.x;
          const mapIdx = Math.max(0, Math.min(currentP.heightMap.length - 1, Math.floor((relX / currentP.width) * (currentP.heightMap.length - 1))));
          surfaceY += currentP.heightMap[mapIdx];
        }

        const vOverlap = (newPlayer.pos.y + newPlayer.height > surfaceY && newPlayer.pos.y < surfaceY + currentP.height + 25);

        if (
          hOverlap &&
          newPlayer.pos.y + newPlayer.height > surfaceY &&
          newPlayer.pos.y + newPlayer.height < surfaceY + 35 &&
          newPlayer.vel.y >= 0 &&
          !(currentP.type === PlatformType.FRAGILE && currentP.decay !== undefined && currentP.decay <= 0)
        ) {
          newPlayer.pos.y = surfaceY - newPlayer.height;
          
          if (currentP.type === PlatformType.BOUNCY) {
            newPlayer.vel.y = config.jumpForce * 1.88;
          }

          if (currentP.type === PlatformType.BOOSTER) {
            // Apply massive 10x speed boost
            newPlayer.vel.x = config.maxSpeed * 10;
            boosterTime = 180; // 3 seconds at 60fps
            // Add some particles for effect
            for(let j=0; j<10; j++) {
              newParticles.push({
                x: newPlayer.pos.x,
                y: newPlayer.pos.y + 20,
                vx: -10 - Math.random() * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: COLORS.BOOSTER,
                size: 4 + Math.random() * 6
              });
            }
          }

          if (currentP.type === PlatformType.FRAGILE) {
            currentP.isTouched = true;
          }

          if (newPlayer.vel.y > 0) newPlayer.vel.y = 0;
          grounded = true;
        }

        if (vOverlap && !grounded) {
          if (newPlayer.pos.x + newPlayer.width >= currentP.x && newPlayer.pos.x + newPlayer.width <= currentP.x + 18) {
            touchingWall = true;
            wallDirection = 1;
          } else if (newPlayer.pos.x <= currentP.x + currentP.width && newPlayer.pos.x >= currentP.x + currentP.width - 18) {
            touchingWall = true;
            wallDirection = -1;
          }
        }

        return currentP;
      });

      // Forward = W, Backward = S
      const moveInput = (keys.current['KeyW'] ? 1 : 0) - (keys.current['KeyS'] ? 1 : 0);
      
      // Determine friction based on platform type
      let currentFriction = FRICTION;
      const standingOn = updatedPlatforms.find(p => 
        newPlayer.pos.x + newPlayer.width > p.x && 
        newPlayer.pos.x < p.x + p.width &&
        Math.abs(newPlayer.pos.y + newPlayer.height - p.y) < 5
      );

      if (standingOn?.type === PlatformType.ICE) currentFriction = ICE_FRICTION;
      if (standingOn?.type === PlatformType.SLOW) currentFriction = SLOW_FRICTION;

      if (moveInput !== 0) {
        const speedMult = standingOn?.type === PlatformType.SLOW ? 0.4 : 1.0;
        newPlayer.vel.x += moveInput * config.moveSpeed * speedMult;
      } else {
        newPlayer.vel.x *= currentFriction;
      }

      // Dynamic speed cap to allow for extreme boosts
      let maxS = config.maxSpeed * 1.3;

      if (boosterTime > 0) {
        maxS = config.maxSpeed * 12; // Allow extreme boost
        boosterTime--;
      } else if (newPlayer.vel.x > 18) {
        maxS = config.maxSpeed * 2.8;
      }
      
      newPlayer.vel.x = Math.max(-maxS, Math.min(maxS, newPlayer.vel.x));

      newPlayer.isGrounded = grounded;
      
      const lowestPlatformY = updatedPlatforms.reduce((max, p) => Math.max(max, p.y), 0);
      const isBelowAllPlatforms = newPlayer.pos.y > lowestPlatformY;

      if (grounded || newPlayer.isWallSliding || !isBelowAllPlatforms) {
        airTime = 0;
      } else {
        airTime++;
        if (airTime > 300) { // 5 seconds at 60fps
          isGameOver = true;
          pendingEncouragementContext.current = "Fell too far into the abyss!";
        }
      }

      newPlayer.isWallSliding = touchingWall && !grounded && newPlayer.vel.y > 0;
      
      if (newPlayer.isWallSliding) {
        newPlayer.vel.y = Math.min(newPlayer.vel.y, 3.8);
      } else {
        newPlayer.vel.y += config.gravity;
      }

      newPlayer.pos.x += newPlayer.vel.x;
      newPlayer.pos.y += newPlayer.vel.y;

      const jumpRequested = keys.current['Space'] || pendingJump.current;
      if (jumpRequested) {
        if (newPlayer.isGrounded) {
          newPlayer.vel.y = config.jumpForce;
          newPlayer.isGrounded = false;
          pendingJump.current = false;
        } else if (newPlayer.isWallSliding) {
          newPlayer.vel.y = config.jumpForce * 0.98;
          newPlayer.vel.x = -wallDirection * 12.5;
          pendingJump.current = false;
        }
      }

      const cameraX = prev.cameraX + ((newPlayer.pos.x - window.innerWidth * 0.35) - prev.cameraX) * 0.12;
      const targetCameraY = newPlayer.pos.y - window.innerHeight / 2;
      const cameraY = prev.cameraY + (targetCameraY - prev.cameraY) * 0.15;

      const meters = Math.max(prev.score, Math.floor(newPlayer.pos.x));

      if (meters >= prev.targetMeters && !prev.isGameWon) {
        isGameWon = true;
        updatedCompletionCounts[prev.difficulty] += 1;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCompletionCounts));
        pendingEncouragementContext.current = `SKY COASTER CHAMPION!`;
      }

      const filteredParticles = newParticles.map(part => ({
        ...part, x: part.x + part.vx, y: part.y + part.vy, life: part.life - 0.025
      })).filter(part => part.life > 0);

      return {
        ...prev,
        player: newPlayer,
        platforms: updatedPlatforms,
        particles: filteredParticles,
        cameraX,
        cameraY,
        score: meters,
        isGameOver,
        isGameWon,
        highSpeedMode: newPlayer.vel.x > 18 || boosterTime > 0,
        completionCounts: updatedCompletionCounts,
        boosterTimeRemaining: boosterTime,
        airTime: airTime,
      };
    });
  }, [generatePlatforms]);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      update();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [update]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-100 touch-none">
      <GameCanvas gameState={gameState} />
      <UIOverlay 
        score={gameState.score}
        isGameOver={gameState.isGameOver}
        isGameWon={gameState.isGameWon}
        isSelectingMode={gameState.isSelectingMode}
        targetMeters={gameState.targetMeters}
        encouragement={encouragement}
        completionCounts={gameState.completionCounts}
        onRestart={resetGame}
        onSelectMode={selectMode}
        onInput={setInput}
        airTime={gameState.airTime}
      />
    </div>
  );
};

export default App;
