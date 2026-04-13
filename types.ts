
export interface Vector2D {
  x: number;
  y: number;
}

export enum PlatformType {
  NORMAL = 'NORMAL',
  BOUNCY = 'BOUNCY',
  MOVING = 'MOVING',
  FRAGILE = 'FRAGILE',
  BOOSTER = 'BOOSTER',
  ICE = 'ICE',
  SLOW = 'SLOW',
  FINISH = 'FINISH'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  CHAOS = 'CHAOS'
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  color: string;
  moveRange?: number;
  moveSpeed?: number;
  initialX?: number;
  decay?: number; 
  isTouched?: boolean;
  heightMap?: number[]; // Offsets from base Y for the top surface
  bottomMap?: number[]; // Offsets from base Y for the bottom surface
}

export interface Player {
  pos: Vector2D;
  vel: Vector2D;
  width: number;
  height: number;
  isGrounded: boolean;
  jumpCount: number;
  isWallSliding: boolean;
  lastWallJumpDir: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface GameState {
  player: Player;
  platforms: Platform[];
  particles: Particle[];
  cameraX: number;
  cameraY: number;
  score: number;
  isGameOver: boolean;
  isGameWon: boolean;
  distanceReached: number;
  highSpeedMode: boolean;
  difficulty: Difficulty;
  targetMeters: number;
  isSelectingMode: boolean;
  completionCounts: Record<Difficulty, number>; // New field to track wins
}

export interface Encouragement {
  text: string;
  mood: 'happy' | 'motivational' | 'funny';
}
