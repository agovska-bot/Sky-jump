
export const DIFFICULTY_CONFIG = {
  EASY: {
    target: 10000,
    gravity: 0.5,
    moveSpeed: 0.85,
    maxSpeed: 10,
    jumpForce: -12.5,
    platformWidthBase: 160,
    gapBase: 100,
  },
  MEDIUM: {
    target: 100000,
    gravity: 0.58,
    moveSpeed: 0.75,
    maxSpeed: 9.0,
    jumpForce: -12.8,
    platformWidthBase: 120,
    gapBase: 110,
  },
  HARD: {
    target: 1000000,
    gravity: 0.68,
    moveSpeed: 0.62,
    maxSpeed: 7.5,
    jumpForce: -13.5,
    platformWidthBase: 90,
    gapBase: 120,
  },
  CHAOS: {
    target: 1000000,
    gravity: 0.65,
    moveSpeed: 0.7,
    maxSpeed: 12.0,
    jumpForce: -13.0,
    platformWidthBase: 110,
    gapBase: 130,
  }
};

export const WORLD_WIDTH = 10000000; 
export const WORLD_HEIGHT = 1200;

export const FRICTION = 0.82;
export const ICE_FRICTION = 0.992;
export const SLOW_FRICTION = 0.45;

export const COLORS = {
  SKY: '#bae6fd', 
  CLOUD: '#ffffff',
  GRASS: '#4ade80',
  BOUNCY: '#f472b6',
  MOVING: '#60a5fa',
  FRAGILE: '#fb923c', 
  BOOSTER: '#a855f7',
  ICE: '#99f6e4', 
  SLOW: '#94a3b8', 
  PLAYER: '#fbbf24',
  FINISH: '#ef4444', 
};
