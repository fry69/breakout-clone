// Layout constants — the game is simulated at a fixed 800x600 resolution
// and scaled to the display via devicePixelRatio.
export const GAME_W = 800;
export const GAME_H = 600;

export const PADDLE = {
  w: 110,
  h: 16,
  y: GAME_H - 42,
  speed: 560,          // px/s keyboard speed
};

export const BALL = {
  r: 8,
  baseSpeed: 380,      // px/s
  maxSpeed: 640,
  speedUp: 1.015,      // multiplier per brick hit
};

export const BRICKS = {
  cols: 12,
  rows: 7,
  gap: 6,
  top: 70,
  side: 36,
  height: 26,
};

// per-row hit points / colors / hue for glow
export const ROWS = [
  { hits: 2, color: '#ff6b6b', hue: 0 },
  { hits: 2, color: '#f38181', hue: 8 },
  { hits: 1, color: '#feca57', hue: 45 },
  { hits: 1, color: '#ff9f43', hue: 28 },
  { hits: 1, color: '#1dd1a1', hue: 160 },
  { hits: 1, color: '#48dbfb', hue: 195 },
  { hits: 1, color: '#5f7cff', hue: 228 },
];

export const COLORS = {
  bg: '#0b0e14',
  field: '#10141f',
  paddle: '#dbe4ff',
  ball: '#ffffff',
  text: '#dbe4ff',
};

export const LIVES = 3;
