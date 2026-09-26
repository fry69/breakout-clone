import { GAME_W, GAME_H, PADDLE, BALL, BRICKS, ROWS, COLORS, LIVES } from './constants.js';
import { SoundFX } from './audio.js';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-msg');
const ctx = canvas.getContext('2d');
const sfx = new SoundFX();

// ---------------------------------------------------------------- scaling
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = GAME_W * dpr;
  canvas.height = GAME_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
resize();
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- state
/** @typedef {'aim'|'running'|'paused'|'lost'|'won'} State */
let state = 'aim';
let score = 0;
let best = Number(localStorage.getItem('breakout.best') ?? 0);
let lives = LIVES;
let level = 1;
let shake = 0;

const paddle = { x: GAME_W / 2, w: PADDLE.w };
const ball = { x: 0, y: 0, vx: 0, vy: 0, speed: BALL.baseSpeed, stuck: true };
const trail = [];
let particles = [];
let bricks = [];

function buildBricks() {
  bricks = [];
  const totalGap = (BRICKS.cols - 1) * BRICKS.gap;
  const w = (GAME_W - BRICKS.side * 2 - totalGap) / BRICKS.cols;
  for (let r = 0; r < BRICKS.rows; r++) {
    for (let c = 0; c < BRICKS.cols; c++) {
      const row = ROWS[r];
      bricks.push({
        x: BRICKS.side + c * (w + BRICKS.gap),
        y: BRICKS.top + r * (BRICKS.height + BRICKS.gap),
        w,
        h: BRICKS.height,
        hp: row.hits,
        maxHp: row.hits,
        color: row.color,
        hue: row.hue,
        alive: true,
      });
    }
  }
}

function resetBall() {
  ball.stuck = true;
  ball.speed = BALL.baseSpeed + (level - 1) * 30;
  ball.vx = 0;
  ball.vy = 0;
}

function launchBall() {
  if (!ball.stuck) return;
  ball.stuck = false;
  const angle = (-Math.PI / 2) + (Math.random() * 0.7 - 0.35);
  ball.vx = Math.cos(angle) * ball.speed;
  ball.vy = Math.sin(angle) * ball.speed;
  sfx.resume();
  sfx.paddle();
}

function startGame() {
  score = 0;
  lives = LIVES;
  level = 1;
  buildBricks();
  resetBall();
  setState('running');
}

function nextLevel() {
  level++;
  buildBricks();
  resetBall();
  setState('running');
}

function setState(s) {
  state = s;
  if (s === 'running') {
    overlay.classList.add('hidden');
  } else {
    overlay.classList.remove('hidden');
    if (s === 'paused') overlayMsg.textContent = 'Paused — press P to resume';
    if (s === 'lost') overlayMsg.textContent = `Game over — score ${score}. Click or press any key to retry`;
    if (s === 'won') overlayMsg.textContent = `Level ${level} clear! Click or press any key to continue`;
    if (s === 'aim') overlayMsg.textContent = 'Click or press any key to start';
  }
}

// ---------------------------------------------------------------- input
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  sfx.resume();
  if (state === 'running' && (e.code === 'KeyP' || e.code === 'Escape')) setState('paused');
  else if (state === 'paused' && (e.code === 'KeyP' || e.code === 'Escape')) setState('running');
  else if (state === 'aim' || state === 'lost') startGame();
  else if (state === 'won') nextLevel();
  else if (state === 'running' && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) launchBall();
});
addEventListener('keyup', (e) => keys.delete(e.code));

let pointerX = GAME_W / 2;
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) / rect.width * GAME_W;
});
canvas.addEventListener('pointerdown', () => {
  sfx.resume();
  if (state === 'aim' || state === 'lost') startGame();
  else if (state === 'won') nextLevel();
  else if (state === 'running') launchBall();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'running') setState('paused');
});

// ---------------------------------------------------------------- physics
function step(dt) {
  // paddle: keyboard overrides pointer when held
  let kd = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kd -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kd += 1;
  if (kd !== 0) paddle.x += kd * PADDLE.speed * dt;
  else paddle.x += (pointerX - paddle.x) * Math.min(1, dt * 18);
  paddle.x = Math.max(paddle.w / 2, Math.min(GAME_W - paddle.w / 2, paddle.x));

  if (ball.stuck) {
    ball.x = paddle.x;
    ball.y = PADDLE.y - BALL.r - 1;
    return;
  }

  // move in small substeps so fast balls never tunnel through bricks
  const dist = Math.hypot(ball.vx, ball.vy) * dt;
  const sub = Math.max(1, Math.ceil(dist / (BALL.r * 0.8)));
  for (let i = 0; i < sub; i++) {
    ball.x += (ball.vx * dt) / sub;
    ball.y += (ball.vy * dt) / sub;
    if (!collide()) continue;
  }

  trail.push({ x: ball.x, y: ball.y });
  if (trail.length > 12) trail.shift();

  // walls
  if (ball.x - BALL.r < 0) { ball.x = BALL.r; ball.vx = Math.abs(ball.vx); sfx.wall(); shake = 3; }
  if (ball.x + BALL.r > GAME_W) { ball.x = GAME_W - BALL.r; ball.vx = -Math.abs(ball.vx); sfx.wall(); shake = 3; }
  if (ball.y - BALL.r < 0) { ball.y = BALL.r; ball.vy = Math.abs(ball.vy); sfx.wall(); shake = 3; }

  // fell below the paddle
  if (ball.y - BALL.r > GAME_H) {
    lives--;
    sfx.lose();
    shake = 10;
    if (lives <= 0) setState('lost');
    else { resetBall(); }
  }

  // particles
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 700 * dt;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);
  shake = Math.max(0, shake - 40 * dt);
}

function collide() {
  // paddle
  const px = paddle.x - paddle.w / 2;
  if (
    ball.vy > 0 &&
    ball.y + BALL.r >= PADDLE.y &&
    ball.y - BALL.r <= PADDLE.y + PADDLE.h &&
    ball.x >= px - BALL.r &&
    ball.x <= px + paddle.w + BALL.r
  ) {
    const rel = (ball.x - paddle.x) / (paddle.w / 2); // -1 .. 1
    const angle = -Math.PI / 2 + rel * 1.05;          // up to ~60° deflection
    ball.speed = Math.min(BALL.maxSpeed, ball.speed * 1.005);
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.y = PADDLE.y - BALL.r - 0.1;
    sfx.paddle();
    return true;
  }

  // bricks (axis-aligned circle/rect overlap, reflect on smaller axis)
  for (const b of bricks) {
    if (!b.alive) continue;
    const nx = Math.max(b.x, Math.min(ball.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(ball.y, b.y + b.h));
    const dx = ball.x - nx;
    const dy = ball.y - ny;
    if (dx * dx + dy * dy > BALL.r * BALL.r) continue;

    // which side did we hit?
    const overlapX = BALL.r - Math.abs(dx);
    const overlapY = BALL.r - Math.abs(dy);
    if (overlapX < overlapY) {
      ball.vx = dx >= 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
      ball.x += dx >= 0 ? overlapX : -overlapX;
    } else {
      ball.vy = dy >= 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
      ball.y += dy >= 0 ? overlapY : -overlapY;
    }

    b.hp--;
    if (b.hp <= 0) {
      b.alive = false;
      score += 8 * b.maxHp;
      sfx.brickBreak();
      spawnParticles(b);
      shake = 5;
    } else {
      score += 4;
      sfx.brick(b.hue);
      ball.speed = Math.min(BALL.maxSpeed, ball.speed * BALL.speedUp);
    }

    if (bricks.every((br) => !br.alive)) {
      sfx.win();
      saveBest();
      setState('won');
    }
    return true;
  }
  return false;
}

function spawnParticles(b) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 240;
    particles.push({
      x: b.x + b.w / 2,
      y: b.y + b.h / 2,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 80,
      life: 0.35 + Math.random() * 0.4,
      color: b.color,
      size: 2 + Math.random() * 3,
    });
  }
}

function saveBest() {
  if (score > best) {
    best = score;
    localStorage.setItem('breakout.best', String(best));
  }
}

// ---------------------------------------------------------------- render
function draw() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  // field
  ctx.fillStyle = COLORS.field;
  ctx.fillRect(-10, -10, GAME_W + 20, GAME_H + 20);

  // faint grid
  ctx.strokeStyle = 'rgba(90, 110, 170, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GAME_W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, GAME_H); }
  for (let y = 0; y <= GAME_H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); }
  ctx.stroke();

  // bricks
  for (const b of bricks) {
    if (!b.alive) continue;
    const dmg = b.hp / b.maxHp;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 12 * dmg;
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.45 + 0.55 * dmg;
    roundRect(b.x, b.y, b.w, b.h, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(b.x + 2, b.y + 2, b.w - 4, 5, 3);
    ctx.fill();
    if (b.maxHp > 1 && b.hp > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      roundRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, 4);
      ctx.stroke();
    }
  }

  // ball trail
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const a = (i + 1) / trail.length;
    ctx.globalAlpha = a * 0.25;
    ctx.fillStyle = '#7ea2ff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, BALL.r * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ball
  ctx.shadowColor = '#a8c4ff';
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // paddle
  const px = paddle.x - paddle.w / 2;
  ctx.shadowColor = '#5f7cff';
  ctx.shadowBlur = 14;
  const grad = ctx.createLinearGradient(0, PADDLE.y, 0, PADDLE.y + PADDLE.h);
  grad.addColorStop(0, '#eef3ff');
  grad.addColorStop(1, '#8fa7e8');
  ctx.fillStyle = grad;
  roundRect(px, PADDLE.y, paddle.w, PADDLE.h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;

  // particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // HUD
  ctx.fillStyle = COLORS.text;
  ctx.font = '600 18px "SF Mono", ui-monospace, monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(`SCORE ${String(score).padStart(5, '0')}`, 18, 18);
  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${level}`, GAME_W / 2, 18);
  ctx.textAlign = 'right';
  ctx.fillText(`BEST ${String(best).padStart(5, '0')}`, GAME_W - 18, 18);
  // lives as mini paddles
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#dbe4ff';
    roundRect(GAME_W - 30 - i * 26, 46, 18, 6, 3);
    ctx.fill();
  }

  if (ball.stuck && state === 'running') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(219,228,255,0.7)';
    ctx.font = '500 15px "SF Mono", ui-monospace, monospace';
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(performance.now() / 400));
    ctx.globalAlpha = 0.4 + 0.6 * pulse;
    ctx.fillText('click / space to launch', GAME_W / 2, PADDLE.y - 40);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30); // clamp long frames
  last = now;
  if (state === 'running') step(dt);
  draw();
  requestAnimationFrame(frame);
}
buildBricks();
resetBall();
requestAnimationFrame(frame);
