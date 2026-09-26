# Breakout

Classic brick-breaker built with plain JavaScript and the Canvas 2D API — no build step, no dependencies.

## Run

Open `index.html` directly, or serve it (recommended, since the code uses ES modules):

```sh
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Controls

| Action | Input |
| --- | --- |
| Move paddle | Mouse / ← → / A D |
| Launch ball | Click / Space / ↑ / W |
| Pause | P or Esc |

## Features

- Fixed-timestep-safe physics with sub-stepping (no ball tunneling)
- Paddle-angle deflection based on hit position
- Multi-hit bricks, particles, screen shake, ball trail
- Retro sound effects synthesized with WebAudio (no audio files)
- High score persisted with `localStorage`
- `devicePixelRatio`-aware rendering, pauses on tab blur (`visibilitychange`)
