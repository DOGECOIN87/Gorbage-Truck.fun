
import React, { useEffect, useRef, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  LANE_X_POSITIONS, // Default 3
  LANE_X_POSITIONS_2, // 2 Lane Alt
  PLAYER_Z, 
  PLAYER_SIZE,
  LANE_SWITCH_SPEED,
  INITIAL_SPEED,
  SPEED_INCREMENT,
  MAX_SPEED,
  SPAWN_DISTANCE,
  SPAWN_RATE_INITIAL,
  MIN_SPAWN_RATE,
  OBSTACLE_SIZE,
  COLLECTIBLE_VARIANTS,
  MAX_LIVES,
  ITEMS_PER_COMBO,
  CAMERA_HEIGHT,
  CAMERA_DISTANCE,
  FOV,
  HORIZON_Y,
  LANE_WIDTH_3D,
  PARTICLE_COUNT_EXHAUST,
  PARTICLE_COUNT_COLLECT,
  PARTICLE_COUNT_COLLISION,
  SHADOW_OPACITY,
  FOG_START,
  FOG_END,
  FOG_COLOR,
  THEMES
} from '../constants';
import { GameState, Entity, EntityType, Player, GameAssets, CollectibleSubtype, ObstacleSubtype, PowerupSubtype, Particle, ParticleType, TimeOfDay, ColorTheme, WeatherType } from '../types';
import { loadGameAssets } from '../utils/assetLoader';

interface GameRunnerProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setLives: (lives: number) => void;
  setMultiplier: (mult: number) => void;
  onGameOver: (finalScore: number) => void;
  musicVolume: number;
  sfxVolume: number;
}

const GameRunner: React.FC<GameRunnerProps> = ({ 
  gameState, 
  setGameState, 
  setScore, 
  setLives,
  setMultiplier,
  onGameOver,
  musicVolume,
  sfxVolume
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Game State
  const assetsRef = useRef<GameAssets | null>(null);
  const playerRef = useRef<Player>({
    lane: Math.floor(Math.random() * 2), // Random start 0 or 1
    x: 0, // Will be set in resetGame
    y: 0,
    z: PLAYER_Z,
    width: PLAYER_SIZE.w,
    height: PLAYER_SIZE.h,
    depth: PLAYER_SIZE.d
  });
  const entitiesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameSpeedRef = useRef<number>(INITIAL_SPEED);
  const speedMilestoneRef = useRef<number>(INITIAL_SPEED);
  const spawnTimerRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const livesRef = useRef<number>(MAX_LIVES);
  const roadOffsetRef = useRef<number>(0);
  
  // Powerup States
  const incineratorTimerRef = useRef<number>(0);
  const jumpPowerupTimerRef = useRef<number>(0);
  const isJumpingRef = useRef<boolean>(false);
  const jumpYRef = useRef<number>(0);
  const jumpVelocityRef = useRef<number>(0);
  
  // Lane State
  const twoLaneTimerRef = useRef<number>(0);

  // Audio State
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const noteIndexRef = useRef<number>(0);

  // Background Layers for Parallax
  const bgLayersRef = useRef<{
    stars: {x: number, y: number, size: number, opacity: number}[],
    backCity: {x: number, w: number, h: number}[],
    frontCity: {x: number, w: number, h: number}[]
  }>({ stars: [], backCity: [], frontCity: [] });

  // Visual Effects
  const shakeRef = useRef<number>(0);
  
  // Combo Logic
  const comboCountRef = useRef<number>(0);
  const multiplierRef = useRef<number>(1);
  
  // Input
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  
  // Theme State
  const themeRef = useRef<ColorTheme>(THEMES.NIGHT); // Default
  const weatherRef = useRef<WeatherType>('CLEAR');
  const rainParticlesRef = useRef<{x: number, y: number, speed: number, len: number}[]>([]);

  // --- Initialization ---
  useEffect(() => {
    const initAssets = async () => {
      assetsRef.current = await loadGameAssets();
    };
    initAssets();
    
    // Determine Time of Day
    const hour = new Date().getHours();
    let timeOfDay: TimeOfDay = 'NIGHT';
    
    if (hour >= 7 && hour < 19) {
        timeOfDay = 'DAY';
    } else if ((hour >= 5 && hour < 7) || (hour >= 19 && hour < 20)) {
        timeOfDay = 'TWILIGHT';
    } else {
        timeOfDay = 'NIGHT';
    }
    
    themeRef.current = THEMES[timeOfDay];

  }, []);

  useEffect(() => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        // Create Noise Buffer for Hi-Hats
        const bufferSize = ctx.sampleRate * 2; // 2 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noiseBufferRef.current = buffer;
      }
    }

    // Initialize Procedural Background Layers
    const stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * HORIZON_Y * 0.8, 
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2
      });
    }

    const backCity = [];
    let currentX = -200;
    while(currentX < CANVAS_WIDTH + 200) {
      const w = 30 + Math.random() * 50;
      const h = 30 + Math.random() * 60;
      backCity.push({ x: currentX, w, h });
      currentX += w - 5;
    }

    const frontCity = [];
    currentX = -200;
    while(currentX < CANVAS_WIDTH + 200) {
      const w = 20 + Math.random() * 40;
      const h = 20 + Math.random() * 40;
      frontCity.push({ x: currentX, w, h });
      currentX += w;
    }

    bgLayersRef.current = { stars, backCity, frontCity };

  }, []);

  const playSound = (type: 'collect' | 'hit' | 'gameover' | 'speedup') => {
    if (sfxVolume <= 0.01 || !audioCtxRef.current) return;
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'collect') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1 * sfxVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2 * sfxVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'gameover') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 1);
      gain.gain.setValueAtTime(0.3 * sfxVolume, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } else if (type === 'speedup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.05 * sfxVolume, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  };

  // --- Dynamic Music Scheduler ---
  const runMusicScheduler = () => {
    if (musicVolume <= 0.01 || !audioCtxRef.current || gameState !== GameState.PLAYING) return;
    const ctx = audioCtxRef.current;

    const progress = Math.min(1, Math.max(0, (gameSpeedRef.current - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED)));
    const bpm = 120 + (progress * 50);
    const secondsPerBeat = 60.0 / bpm;
    const stepTime = secondsPerBeat / 4; 

    if (nextNoteTimeRef.current < ctx.currentTime - 0.1) {
      nextNoteTimeRef.current = ctx.currentTime + 0.1;
    }

    const lookahead = 0.1; 

    while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
      playStep(ctx, noteIndexRef.current, nextNoteTimeRef.current);
      nextNoteTimeRef.current += stepTime;
      noteIndexRef.current = (noteIndexRef.current + 1) % 16;
    }
  };

  const playStep = (ctx: AudioContext, step: number, time: number) => {
    const masterGain = 0.3 * musicVolume;
    if (masterGain <= 0.001) return;

    // Kick
    if (step % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(1.0 * masterGain, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time);
      osc.stop(time + 0.5);
    }

    // Hi-Hat
    if (step % 4 === 2) {
      if (noiseBufferRef.current) {
        const source = ctx.createBufferSource();
        source.buffer = noiseBufferRef.current;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        const gain = ctx.createGain();
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.4 * masterGain, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        source.start(time);
        source.stop(time + 0.05);
      }
    }

    // Bass
    if (step % 2 === 0) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      const notes = [98, 98, 116.5, 98, 130.8, 98, 116.5, 146.8]; 
      const freq = notes[(step / 2) % 8];
      osc.frequency.setValueAtTime(freq, time);
      filter.frequency.setValueAtTime(600, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);
      gain.gain.setValueAtTime(0.4 * masterGain, time);
      gain.gain.linearRampToValueAtTime(0, time + 0.2);
      osc.start(time);
      osc.stop(time + 0.2);
    }

    // Arp
    if (step % 3 === 0 && step !== 0) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const arpNotes = [392, 466.1, 523.2, 587.3];
      const freq = arpNotes[(step / 3) % 4];
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.08 * masterGain, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.start(time);
      osc.stop(time + 0.1);
    }
  };


  // --- Visual Effects System ---

  const createParticles = (type: ParticleType, x: number, y: number, z: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        
        particlesRef.current.push({
            id: Date.now() + Math.random(),
            type,
            x, y, z,
            vx: Math.cos(angle) * speed,
            vy: (Math.random() * 5 + 2) * (type === ParticleType.EXHAUST ? -1 : 1),
            vz: (Math.random() - 0.5) * 10,
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 8 + 4,
            color,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
  };

  const updateParticles = () => {
    // Game Particles
    particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz - gameSpeedRef.current; // Move with world relative to camera
        p.life -= 0.02;
        p.rotation += p.rotationSpeed;
        p.vy -= 0.1; // Gravity (or buoyancy for exhaust)
        
        if (p.type === ParticleType.EXHAUST) {
            p.size += 0.2;
            p.vy += 0.15; // Float up
        }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // Rain Particles
    if (weatherRef.current === 'RAIN') {
        // Spawn new rain
        for(let i=0; i<10; i++) {
            rainParticlesRef.current.push({
                x: Math.random() * CANVAS_WIDTH,
                y: -50,
                speed: 15 + Math.random() * 10,
                len: 20 + Math.random() * 20
            });
        }
    }
    
    // Update Rain
    rainParticlesRef.current.forEach(p => {
        p.y += p.speed;
        p.x -= (playerRef.current.x * 0.01); // Simulate movement relative to truck somewhat
    });
    rainParticlesRef.current = rainParticlesRef.current.filter(p => p.y < CANVAS_HEIGHT + 50);
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
      // Draw Rain (Behind logic often better but here is fine)
      if (weatherRef.current === 'RAIN') {
          ctx.strokeStyle = 'rgba(170, 200, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          rainParticlesRef.current.forEach(p => {
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x - 2, p.y + p.len);
          });
          ctx.stroke();
          
          // Rain overlay tint
          ctx.fillStyle = 'rgba(0, 10, 30, 0.2)';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      particlesRef.current.forEach(p => {
          const pos = project(p.x, p.y, p.z);
          if (!pos.visible) return;

          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.globalAlpha = p.life * (p.type === ParticleType.EXHAUST ? 0.4 : 1.0);
          
          const size = p.size * pos.scale;
          
          if (p.type === ParticleType.SPARKLE) {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.moveTo(0, -size);
              ctx.lineTo(size/2, -size/2);
              ctx.lineTo(size, 0);
              ctx.lineTo(size/2, size/2);
              ctx.lineTo(0, size);
              ctx.lineTo(-size/2, size/2);
              ctx.lineTo(-size, 0);
              ctx.lineTo(-size/2, -size/2);
              ctx.fill();
          } else if (p.type === ParticleType.DOLLAR_BILL) {
              // Draw stylized dollar bill
              const billWidth = size * 2;
              const billHeight = size;
              
              // Bill background (green)
              ctx.fillStyle = '#85bb65';
              ctx.fillRect(-billWidth/2, -billHeight/2, billWidth, billHeight);
              
              // Bill border
              ctx.strokeStyle = '#2d5016';
              ctx.lineWidth = Math.max(1, size * 0.15);
              ctx.strokeRect(-billWidth/2, -billHeight/2, billWidth, billHeight);
              
              // Dollar sign
              ctx.fillStyle = '#2d5016';
              ctx.font = `bold ${size * 1.2}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('$', 0, 0);
          } else {
              ctx.fillStyle = p.color;
              ctx.fillRect(-size/2, -size/2, size, size);
          }
          
          ctx.restore();
      });
  };

  // --- 3D Projection Engine ---

  const project = useCallback((x: number, y: number, z: number) => {
    const depth = z + CAMERA_DISTANCE;
    if (depth <= 10) return { x: 0, y: 0, scale: 0, visible: false };
    const scale = FOV / depth;
    const screenX = CANVAS_WIDTH / 2 + x * scale;
    const screenY = HORIZON_Y + (CAMERA_HEIGHT - y) * scale;
    return { x: screenX, y: screenY, scale, visible: true };
  }, []);

  // --- 3D Rendering Helpers ---
  
  const applyFog = (ctx: CanvasRenderingContext2D, color: string, z: number) => {
      const fogColor = themeRef.current.fogColor;
      
      if (z < FOG_START) return color;
      
      const fogFactor = Math.min(1, Math.max(0, (z - FOG_START) / (FOG_END - FOG_START)));
      
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // This assumes fogColor is consistent hex format (#RRGGBB) from constants
      const fr = parseInt(fogColor.slice(1, 3), 16);
      const fg = parseInt(fogColor.slice(3, 5), 16);
      const fb = parseInt(fogColor.slice(5, 7), 16);
      
      const nr = Math.floor(r + (fr - r) * fogFactor);
      const ng = Math.floor(g + (fg - g) * fogFactor);
      const nb = Math.floor(b + (fb - b) * fogFactor);
      
      return `rgb(${nr},${ng},${nb})`;
  };

  // --- Game Logic ---

  const spawnEntity = () => {
    const isTwoLane = twoLaneTimerRef.current > 0;
    const laneCount = isTwoLane ? 2 : 3;
    const positions = isTwoLane ? LANE_X_POSITIONS_2 : LANE_X_POSITIONS;
    
    const laneIdx = Math.floor(Math.random() * laneCount);
    const laneX = positions[laneIdx];
    
    const rand = Math.random();
    // 60% Obstacle, 35% Collectible, 5% Rare Powerup
    let type: EntityType = EntityType.OBSTACLE;
    
    if (rand > 0.95) type = EntityType.POWERUP;
    else if (rand > 0.60) type = EntityType.COLLECTIBLE;
    
    let subtype: any;
    let dims = OBSTACLE_SIZE;

    if (type === EntityType.POWERUP) {
        const pr = Math.random();
        // Rare powerups
        if (pr > 0.66) subtype = 'GORBILLIONS'; // +Health
        else if (pr > 0.33) subtype = 'GOR_INCINERATOR'; // Fire Mode
        else subtype = 'GORBOY_CONSOLE'; // Jump Mode
        
        dims = { w: 80, h: 80, d: 60 }; 
    } else if (type === EntityType.COLLECTIBLE) {
      const cr = Math.random();
      // Trash Coin is MOST COMMON collectible
      if (cr > 0.4) subtype = 'TRASH_COIN';
      else if (cr > 0.2) subtype = 'GORBAGANA';
      else if (cr > 0.1) subtype = 'WALLET';
      else subtype = 'TRASH_COIN';

      dims = { w: 60, h: 60, d: 60 };
    } else {
      // OBSTACLES
      subtype = 'TRASH_BAG'; // Most Common Obstacle
      dims = OBSTACLE_SIZE;
    }

    // Check collision based on X proximity, not just lane index, since indices shift meaning
    const tooClose = entitiesRef.current.some(e => 
      Math.abs(e.x - laneX) < 100 && Math.abs(e.z - SPAWN_DISTANCE) < 400
    );

    if (!tooClose) {
      entitiesRef.current.push({
        id: Date.now() + Math.random(),
        type,
        subtype,
        // We store strictly the visual X. The lane index is less useful in hybrid mode but we keep it.
        lane: laneIdx, 
        x: laneX,
        y: 0, 
        z: SPAWN_DISTANCE,
        width: dims.w,
        height: dims.h,
        depth: dims.d
      });
    }
  };

  const checkCollisions = () => {
    const p = playerRef.current;
    
    // Incinerator Logic: Destroy everything in CURRENT LANE
    if (incineratorTimerRef.current > 0) {
       entitiesRef.current.forEach(e => {
           if (e.collected) return;
           // Collide only in same lane
           if (e.lane === p.lane && e.z > p.z + 50 && e.z < p.z + 800) {
               e.collected = true;
               scoreRef.current += 50; 
               createParticles(ParticleType.EXHAUST, e.x, e.y, e.z, 10, '#ff4500');
           }
       });
       // We DON'T return here, so normal collision still applies for other lanes 
       // (e.g. if you switch lanes into an obstacle, you might still hit it before fire gets it?)
       // Actually, safer to let normal collision run for side lanes.
    }

    // Normal Collision Logic
    entitiesRef.current.forEach(e => {
      if (e.collected) return;

      // Hitbox check
      const depthOverlap = Math.abs(p.z - e.z) < (p.depth + e.depth) / 2;
      const widthOverlap = Math.abs(p.x - e.x) < (p.width + e.width) / 2;
      
      // Height check for Jumping
      const heightOverlap = jumpYRef.current < e.height; 

      if (depthOverlap && widthOverlap && heightOverlap) {
        if (e.type === EntityType.POWERUP) {
          e.collected = true;
          
          if (e.subtype === 'GOR_INCINERATOR') {
              incineratorTimerRef.current = 300; // 5 Seconds (at 60fps)
              playSound('speedup');
          } else if (e.subtype === 'GORBOY_CONSOLE') {
              jumpPowerupTimerRef.current = 300;
              playSound('speedup');
          } else if (e.subtype === 'GORBILLIONS') {
              livesRef.current = Math.min(livesRef.current + 1, MAX_LIVES + 2);
              setLives(livesRef.current);
              scoreRef.current += 1000;
          }
          
          setScore(scoreRef.current);
          createParticles(ParticleType.SPARKLE, e.x, e.y, e.z, PARTICLE_COUNT_COLLECT * 2, '#00FF00');
        } else if (e.type === EntityType.COLLECTIBLE) {
          e.collected = true;
          
          // Determine score based on subtype
          let baseScore = 100;
          if (e.subtype === 'WALLET') baseScore = 500;
          else if (e.subtype === 'GORBAGANA') {
              baseScore = 200;
              // Trigger 2 Lane Mode
              twoLaneTimerRef.current = 600; // 10 Seconds
              
              // Ensure player is in valid lane for 2-lane mode (0 or 1)
              if (p.lane > 1) p.lane = 1;
              
              playSound('speedup');
          }
          else if (e.subtype === 'TRASH_COIN') baseScore = 50;
          
          comboCountRef.current += 1;
          if (comboCountRef.current % ITEMS_PER_COMBO === 0) {
            multiplierRef.current = Math.min(multiplierRef.current + 1, 10);
            setMultiplier(multiplierRef.current);
          }
          scoreRef.current += baseScore * multiplierRef.current;
          setScore(scoreRef.current);
          playSound('collect');
          createParticles(ParticleType.SPARKLE, e.x, e.y, e.z, PARTICLE_COUNT_COLLECT, '#FFFF00');
        } else {
          // Obstacle
          // If jumping, avoid collision
          if (isJumpingRef.current && jumpYRef.current > 50) return; 

          e.collected = true; 
          livesRef.current -= 1;
          setLives(livesRef.current);
          comboCountRef.current = 0;
          multiplierRef.current = 1;
          setMultiplier(1);
          playSound('hit');
          shakeRef.current = 20;
          createParticles(ParticleType.DEBRIS, e.x, e.y, e.z, PARTICLE_COUNT_COLLISION, '#888888');

          if (livesRef.current <= 0) {
            playSound('gameover');
            handleGameOver();
          }
        }
      }
    });
  };

  const handleGameOver = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setGameState(GameState.GAME_OVER);
    onGameOver(scoreRef.current);
  };

  const resetGame = useCallback(() => {
    // Start in standard 3 lane
    twoLaneTimerRef.current = 0;
    playerRef.current = {
        lane: 1, // Center
        x: LANE_X_POSITIONS[1],
        y: 0,
        z: PLAYER_Z,
        width: PLAYER_SIZE.w,
        height: PLAYER_SIZE.h,
        depth: PLAYER_SIZE.d
    };
    entitiesRef.current = [];
    gameSpeedRef.current = INITIAL_SPEED;
    speedMilestoneRef.current = INITIAL_SPEED;
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    comboCountRef.current = 0;
    multiplierRef.current = 1;
    shakeRef.current = 0;
    setScore(0);
    setLives(MAX_LIVES);
    setMultiplier(1);
    spawnTimerRef.current = 0;
    
    if (audioCtxRef.current) {
      nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
      noteIndexRef.current = 0;
    }
  }, [setScore, setLives, setMultiplier]);

  // --- Rendering Primitives ---

  const drawCube = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, topColor: string, sideColor: string) => {
    const hw = w/2; const hd = d/2;
    
    // Project 8 corners
    const fBottomL = project(x - hw, y, z - hd);
    const fBottomR = project(x + hw, y, z - hd);
    const fTopL = project(x - hw, y + h, z - hd);
    const fTopR = project(x + hw, y + h, z - hd);
    const bBottomL = project(x - hw, y, z + hd);
    const bBottomR = project(x + hw, y, z + hd);
    const bTopL = project(x - hw, y + h, z + hd);
    const bTopR = project(x + hw, y + h, z + hd);

    if (!fBottomL.visible) return;

    // Apply distance shading (fog)
    const applyShading = (c: string, depth: number) => {
        return applyFog(ctx, c, depth);
    };

    const shadedTop = applyShading(topColor, z);
    const shadedSide = applyShading(sideColor, z);
    const shadedFront = applyShading(color, z);

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;

    // Draw Top Face
    ctx.fillStyle = shadedTop;
    ctx.beginPath();
    ctx.moveTo(fTopL.x, fTopL.y);
    ctx.lineTo(fTopR.x, fTopR.y);
    ctx.lineTo(bTopR.x, bTopR.y);
    ctx.lineTo(bTopL.x, bTopL.y);
    ctx.fill();
    ctx.stroke();

    // Draw Side Faces (only if visible based on x)
    if (x < 0) {
         ctx.fillStyle = shadedSide;
         ctx.beginPath();
         ctx.moveTo(fTopR.x, fTopR.y);
         ctx.lineTo(fBottomR.x, fBottomR.y);
         ctx.lineTo(bBottomR.x, bBottomR.y);
         ctx.lineTo(bTopR.x, bTopR.y);
         ctx.fill();
         ctx.stroke();
    }
    if (x > 0) {
        ctx.fillStyle = sideColor;
         ctx.beginPath();
         ctx.moveTo(fTopL.x, fTopL.y);
         ctx.lineTo(fBottomL.x, fBottomL.y);
         ctx.lineTo(bBottomL.x, bBottomL.y);
         ctx.lineTo(bTopL.x, bTopL.y);
         ctx.fill();
         ctx.stroke();
    }
    
    // Draw Front Face
    ctx.fillStyle = shadedFront;
    ctx.beginPath();
    ctx.moveTo(fBottomL.x, fBottomL.y);
    ctx.lineTo(fBottomR.x, fBottomR.y);
    ctx.lineTo(fTopR.x, fTopR.y);
    ctx.lineTo(fTopL.x, fTopL.y);
    ctx.fill();
    ctx.stroke();
  };

  const drawSprite = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, z: number, w: number, h: number) => {
    // Project center of the sprite
    const p = project(x, y + h/2, z);
    if (!p.visible) return;

    const drawW = w * p.scale;
    const drawH = h * p.scale;

    // Draw shadow
    const shadowP = project(x, 0, z);
    if (shadowP.visible) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(shadowP.x, shadowP.y, drawW/2, drawW/5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.drawImage(img, p.x - drawW/2, p.y - drawH/2, drawW, drawH);
  };

  // --- Main Draw Loop ---

  const draw = (ctx: CanvasRenderingContext2D) => {
    const theme = themeRef.current;

    // Sky Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    grad.addColorStop(0, theme.skyTop); 
    grad.addColorStop(0.6, theme.skyMiddle);
    grad.addColorStop(1, theme.skyBottom); 
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const playerX = playerRef.current.x;

    // Stars
    if (theme.starsOpacity > 0) {
      ctx.fillStyle = '#FFF';
      bgLayersRef.current.stars.forEach((s, i) => {
        const offsetX = -playerX * 0.05; 
        let px = (s.x + offsetX) % CANVAS_WIDTH;
        if (px < 0) px += CANVAS_WIDTH;
        
        const twinkle = Math.sin(Date.now() * 0.003 + i) * 0.3 + 0.7;
        ctx.globalAlpha = s.opacity * twinkle * theme.starsOpacity;
        ctx.beginPath();
        ctx.arc(px, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    }

    // UFO Easter Egg (Floating in Sky)
    if (assetsRef.current?.ufo) {
       const ufoX = (Date.now() / 50) % (CANVAS_WIDTH + 400) - 200;
       const ufoY = HORIZON_Y - 150 + Math.sin(Date.now() / 500) * 20;
       
       ctx.save();
       ctx.translate(ufoX, ufoY);
       ctx.rotate(Math.sin(Date.now() / 300) * 0.1);
       // Parallax for UFO
       const parallaxX = -playerX * 0.02;
       ctx.drawImage(assetsRef.current.ufo, parallaxX, 0, 60, 40);
       ctx.restore();
    }

    // City Layers - Enhanced with Details and Graffiti
    // Back City Layer
    bgLayersRef.current.backCity.forEach((b, idx) => {
      const offsetX = -playerX * 0.02;
      let px = b.x + offsetX;
      
      // Main Building Body
      ctx.fillStyle = theme.cityBack;
      ctx.fillRect(px, HORIZON_Y - b.h, b.w, b.h);
      
      // Building Edge/Trim
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px, HORIZON_Y - b.h, 2, b.h);
      ctx.fillRect(px + b.w - 2, HORIZON_Y - b.h, 2, b.h);
      
      // Roof Detail
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(px, HORIZON_Y - b.h, b.w, 3);
      
      // Graffiti on Back Buildings (subtle)
      if (idx % 3 === 0 && b.w > 40) {
        const grafX = px + 5;
        const grafY = HORIZON_Y - b.h/2;
        
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Tag-style graffiti
        ctx.moveTo(grafX, grafY);
        ctx.lineTo(grafX + 15, grafY - 8);
        ctx.lineTo(grafX + 25, grafY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    });

    // Front City Layer
    bgLayersRef.current.frontCity.forEach((b, idx) => {
      const offsetX = -playerX * 0.1;
      const px = b.x + offsetX;
      
      // Main Building Body
      ctx.fillStyle = theme.cityFront;
      ctx.fillRect(px, HORIZON_Y - b.h, b.w, b.h);
      
      // Building Edge Highlights
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(px, HORIZON_Y - b.h, 2, b.h);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(px + b.w - 3, HORIZON_Y - b.h, 3, b.h);
      
      // Roof Detail
      const roofGrad = ctx.createLinearGradient(px, HORIZON_Y - b.h, px, HORIZON_Y - b.h + 5);
      roofGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
      roofGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = roofGrad;
      ctx.fillRect(px, HORIZON_Y - b.h, b.w, 5);
      
      // Windows Grid
      if (b.w > 30 && b.h > 25) {
        const rows = Math.floor(b.h / 15);
        const cols = Math.floor(b.w / 12);
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isLit = Math.random() > 0.7;
            ctx.fillStyle = isLit ? theme.windowColorWarm : theme.windowColorCool;
            const wx = px + 4 + (c * 12);
            const wy = HORIZON_Y - b.h + 8 + (r * 15);
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      
      // Graffiti Art on Front Buildings
      if (b.w > 35) {
        const grafX = px + b.w/2;
        const grafY = HORIZON_Y - b.h * 0.6;
        
        ctx.globalAlpha = 0.7;
        
        // Different graffiti styles based on building index
        if (idx % 5 === 0) {
          // Bubble letters style
          ctx.fillStyle = '#ff1493';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('GOR', grafX - 12, grafY);
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeText('GOR', grafX - 12, grafY);
        } else if (idx % 5 === 1) {
          // Spray paint drip effect
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          
          ctx.beginPath();
          ctx.moveTo(grafX - 10, grafY);
          ctx.lineTo(grafX + 10, grafY);
          ctx.stroke();
          
          // Drips
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(grafX - 5, grafY);
          ctx.lineTo(grafX - 5, grafY + 12);
          ctx.moveTo(grafX + 5, grafY);
          ctx.lineTo(grafX + 5, grafY + 8);
          ctx.stroke();
        } else if (idx % 5 === 2) {
          // Stencil style symbol
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(grafX, grafY, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(grafX - 2, grafY - 1, 1.5, 0, Math.PI * 2);
          ctx.arc(grafX + 2, grafY - 1, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (idx % 5 === 3) {
          // Throw-up style
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          ctx.moveTo(grafX - 12, grafY);
          ctx.lineTo(grafX - 8, grafY - 8);
          ctx.lineTo(grafX, grafY - 6);
          ctx.lineTo(grafX + 8, grafY - 8);
          ctx.lineTo(grafX + 12, grafY);
          ctx.stroke();
          
          ctx.fillStyle = 'rgba(255, 102, 0, 0.3)';
          ctx.fill();
        } else {
          // Wild style letters
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 2;
          ctx.font = 'italic bold 14px sans-serif';
          ctx.strokeText('TRASH', grafX - 18, grafY);
          
          ctx.fillStyle = '#ff00ff';
          ctx.fillText('TRASH', grafX - 18, grafY);
        }
        
        ctx.globalAlpha = 1.0;
      }
      
      // Add occasional AC units or rooftop details
      if (idx % 4 === 0 && b.w > 30) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.fillRect(px + b.w - 15, HORIZON_Y - b.h - 5, 12, 5);
      }
    });

    // Ground
    ctx.fillStyle = theme.groundColor; 
    ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

    ctx.save();
    
    // Screen Shake
    if (shakeRef.current > 0) {
      const mag = shakeRef.current * 0.5;
      ctx.translate((Math.random()-0.5)*mag, (Math.random()-0.5)*mag);
    }

    const isTwoLane = twoLaneTimerRef.current > 0;
    
    // Road Drawing
    const roadWidth = isTwoLane ? 200 : 300; // 3 lanes is wider
    const zNear = -CAMERA_DISTANCE + 10;
    const zFar = SPAWN_DISTANCE;

    const pNearL = project(-roadWidth, 0, zNear);
    const pNearR = project(roadWidth, 0, zNear);
    const pFarL = project(-roadWidth, 0, zFar);
    const pFarR = project(roadWidth, 0, zFar);

    if (pNearL.visible && pNearR.visible) {
        // Road Base
        ctx.fillStyle = theme.roadColor;
        ctx.beginPath();
        ctx.moveTo(pNearL.x, pNearL.y);
        ctx.lineTo(pNearR.x, pNearR.y);
        ctx.lineTo(pFarR.x, pFarR.y);
        ctx.lineTo(pFarL.x, pFarL.y);
        ctx.fill();
        
        // Road Noise/Grit Loop
        ctx.fillStyle = theme.roadTextureColor;
        for (let i = 0; i < 20; i++) {
             const z = ((Date.now() * gameSpeedRef.current * 0.1) + i * 500) % SPAWN_DISTANCE;
             const x = (Math.sin(i * 132.1) * LANE_WIDTH_3D * 1.5);
             const p = project(x, 0, z);
             if (p.visible) {
                 const size = 20 * p.scale;
                 ctx.fillRect(p.x, p.y, size, size * 0.2); 
             }
        }
    }

    // Lane Markers
    roadOffsetRef.current = (roadOffsetRef.current + gameSpeedRef.current) % 400;
    ctx.strokeStyle = theme.laneMarkerColor;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.laneMarkerGlow;
    
    const dividers = isTwoLane ? [0] : [LANE_X_POSITIONS[0] + LANE_WIDTH_3D/2, LANE_X_POSITIONS[1] + LANE_WIDTH_3D/2];
    
    dividers.forEach(dx => {
        for (let z = -200; z < SPAWN_DISTANCE; z += 400) {
          const zPos = z - roadOffsetRef.current;
          if (zPos < -CAMERA_DISTANCE + 50) continue; 
          
          const p1 = project(dx, 0, zPos);
          const p2 = project(dx, 0, zPos + 200);
          
          if (p1.visible && p2.visible) {
             ctx.lineWidth = Math.max(2, 6 * p1.scale);
             ctx.beginPath();
             ctx.moveTo(p1.x, p1.y);
             ctx.lineTo(p2.x, p2.y);
             ctx.stroke();
          }
        }
    });
    ctx.shadowBlur = 0; 

    // Render Entities (Sorted by depth)
    const renderList = [
      ...entitiesRef.current.map(e => ({ ...e, isPlayer: false })),
      { ...playerRef.current, type: 'PLAYER', subtype: 'TRUCK', isPlayer: true }
    ];

    renderList.sort((a, b) => b.z - a.z);

    renderList.forEach(obj => {
       if (obj.isPlayer) {
          drawPlayer(ctx, obj as Player);
       } else {
          drawEntity(ctx, obj as Entity);
       }
    });

    drawParticles(ctx);
    
    // Draw Fire if Incinerator Active
    if (incineratorTimerRef.current > 0) {
        const p = playerRef.current;
        // Draw massive flamethrower stream
        // Using composite operation for brighter "fire" look
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        for (let i = 0; i < 15; i++) {
            const z = p.z + 100 + i * 60;
            // Tighter x spread for single lane focus
            const x = p.x + (Math.random() - 0.5) * 40; 
            const y = 30 + Math.random() * 30;
            
            const proj = project(x, y, z);
            
            if (proj.visible) {
                ctx.beginPath();
                // Gradient for each flame puff
                const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 80 * proj.scale);
                grad.addColorStop(0, 'rgba(255, 255, 200, 1)'); // Center white hot
                grad.addColorStop(0.4, 'rgba(255, 100, 0, 0.8)'); // Mid orange
                grad.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Edge red/transparent
                
                ctx.fillStyle = grad;
                ctx.arc(proj.x, proj.y, 100 * proj.scale * (1 + i*0.1), 0, Math.PI*2);
                ctx.fill();
            }
        }
        ctx.restore();
        
        // UI Text for Incinerator
        ctx.fillStyle = 'orange';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 INCINERATOR ACTIVE 🔥', CANVAS_WIDTH/2, 150);
    }
    
    if (jumpPowerupTimerRef.current > 0) {
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS SPACE TO JUMP!', CANVAS_WIDTH/2, 180);
    }
    
    if (twoLaneTimerRef.current > 0) {
        ctx.fillStyle = '#14F195';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚧 2-LANE MODE 🚧', CANVAS_WIDTH/2, 210);
    }

    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
    const assets = assetsRef.current;
    const shadowP = project(p.x, 0, p.z);
    
    // Use p.y for vertical position (jumping)
    const yOffset = p.y;
    
    // Define truck z-positions for headlights and tail lights
    const bodyZ = p.z - 20;
    const cabinZ = p.z + 35;
    
    // Draw shadow
    if (shadowP.visible) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(shadowP.x, shadowP.y, (p.width * shadowP.scale), (p.width * 0.4 * shadowP.scale), 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw the truck sprite
    if (assets?.truck) {
        const truckHeight = p.height * 1.2; // Slightly taller for better visibility
        const centerProj = project(p.x, yOffset + truckHeight/2, p.z);
        
        if (centerProj.visible) {
            const drawW = p.width * centerProj.scale * 1.3; // Scale up slightly
            const drawH = truckHeight * centerProj.scale * 1.3;
            
            ctx.save();
            ctx.drawImage(assets.truck, centerProj.x - drawW/2, centerProj.y - drawH/2, drawW, drawH);
            ctx.restore();
        }
    } else {
        // Fallback to geometric truck if image fails to load
        // Chassis
        drawCube(ctx, p.x, 15 + yOffset, p.z, p.width * 0.8, 10, p.depth, '#333', '#444', '#222');

        const bodyZ = p.z - 20;
        const cabinZ = p.z + 35;

        // Body (Garbage Container)
        drawCube(ctx, p.x, 45 + yOffset, bodyZ, p.width, p.height*0.6, p.depth * 0.8, '#14F195', '#10c479', '#0b8c56');
        
        // Stripe on Body
        drawCube(ctx, p.x, 45 + yOffset, bodyZ, p.width + 2, 10, p.depth * 0.8 + 2, '#ffffff', '#ddd', '#ccc');

        // Cabin
        drawCube(ctx, p.x, 35 + yOffset, cabinZ, p.width * 0.9, 30, 30, '#9945FF', '#7c3aed', '#6d28d9');
        
        // Windshield (Black/Blue glass)
        drawCube(ctx, p.x, 45 + yOffset, cabinZ + 16, p.width * 0.8, 12, 2, '#60a5fa', '#93c5fd', '#3b82f6');
        
        // Wheels with rotation effect
        const wx = p.width/2 + 5;
        const drawWheel = (wx: number, wz: number) => {
            drawCube(ctx, wx, 12 + yOffset, wz, 12, 24, 24, '#111', '#222', '#000');
            const hColor = Math.floor(Date.now() / 50) % 2 === 0 ? '#555' : '#888';
            drawCube(ctx, wx > p.x ? wx + 6 : wx - 6, 12 + yOffset, wz, 2, 10, 10, hColor, hColor, hColor);
        }

        drawWheel(p.x - wx, p.z - 25);
        drawWheel(p.x + wx, p.z - 25);
        drawWheel(p.x - wx, p.z + 25);
        drawWheel(p.x + wx, p.z + 25);
    }

    // Headlights (At FRONT of cabin, pointing forward into +Z)
    const headlightZ = cabinZ + 18; // Just in front of windshield
    const headlightY = 25 + yOffset;
    
    // Draw headlight beams shooting forward (into +Z, which appears higher on screen due to perspective)
    // Left headlight beam - BRIGHTER AND WIDER
    const hlStart_L = project(p.x - 25, headlightY, headlightZ);
    const hlEnd1_L = project(p.x - 80, headlightY, headlightZ + 600);
    const hlEnd2_L = project(p.x + 30, headlightY, headlightZ + 600);
    
    if (hlStart_L.visible) {
        ctx.save();
        ctx.globalAlpha = 0.6; // Increased from 0.3
        const grad = ctx.createLinearGradient(hlStart_L.x, hlStart_L.y, (hlEnd1_L.x + hlEnd2_L.x) / 2, (hlEnd1_L.y + hlEnd2_L.y) / 2);
        grad.addColorStop(0, 'rgba(255, 255, 220, 1)'); // Brighter center
        grad.addColorStop(0.7, 'rgba(255, 255, 200, 0.3)');
        grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(hlStart_L.x, hlStart_L.y);
        ctx.lineTo(hlEnd1_L.x, hlEnd1_L.y);
        ctx.lineTo(hlEnd2_L.x, hlEnd2_L.y);
        ctx.fill();
        ctx.restore();
        
        // Lamp glare - BRIGHTER AND BIGGER
        ctx.save();
        ctx.translate(hlStart_L.x, hlStart_L.y);
        ctx.fillStyle = '#ffffff'; // Pure white
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 25; // Increased from 15
        ctx.beginPath();
        ctx.arc(0, 0, 10 * hlStart_L.scale, 0, Math.PI * 2); // Increased from 6
        ctx.fill();
        ctx.restore();
    }
    
    // Right headlight beam - BRIGHTER AND WIDER
    const hlStart_R = project(p.x + 25, headlightY, headlightZ);
    const hlEnd1_R = project(p.x - 30, headlightY, headlightZ + 600);
    const hlEnd2_R = project(p.x + 80, headlightY, headlightZ + 600);
    
    if (hlStart_R.visible) {
        ctx.save();
        ctx.globalAlpha = 0.6; // Increased from 0.3
        const grad = ctx.createLinearGradient(hlStart_R.x, hlStart_R.y, (hlEnd1_R.x + hlEnd2_R.x) / 2, (hlEnd1_R.y + hlEnd2_R.y) / 2);
        grad.addColorStop(0, 'rgba(255, 255, 220, 1)'); // Brighter center
        grad.addColorStop(0.7, 'rgba(255, 255, 200, 0.3)');
        grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(hlStart_R.x, hlStart_R.y);
        ctx.lineTo(hlEnd1_R.x, hlEnd1_R.y);
        ctx.lineTo(hlEnd2_R.x, hlEnd2_R.y);
        ctx.fill();
        ctx.restore();
        
        // Lamp glare - BRIGHTER AND BIGGER
        ctx.save();
        ctx.translate(hlStart_R.x, hlStart_R.y);
        ctx.fillStyle = '#ffffff'; // Pure white
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 25; // Increased from 15
        ctx.beginPath();
        ctx.arc(0, 0, 10 * hlStart_R.scale, 0, Math.PI * 2); // Increased from 6
        ctx.fill();
        ctx.restore();
    }
    
    // Tail lights (AT BACK -Z, pointing toward camera)
    const tLeft = project(p.x - 25, 55 + yOffset, bodyZ - 45);
    const tRight = project(p.x + 25, 55 + yOffset, bodyZ - 45);
    
    if (tLeft.visible) {
        ctx.save();
        ctx.translate(tLeft.x, tLeft.y);
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 5 * tLeft.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    if (tRight.visible) {
        ctx.save();
        ctx.translate(tRight.x, tRight.y);
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 5 * tRight.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, e: Entity) => {
     const assets = assetsRef.current;
     if (!assets) return;

     // Generic sprite drawer helper
     const renderSprite = (img: HTMLImageElement | null, scale = 1.0, float = true, spin = false) => {
        if (!img) {
            // Fallback cube if asset missing
            drawCube(ctx, e.x, e.height/2, e.z, e.width, e.height, e.depth, '#f0f', '#f0f', '#f0f');
            return;
        }

        const bounce = float ? Math.sin(Date.now() / 200) * 5 : 0;
        const rotate = spin ? Math.sin(Date.now() / 300) * 0.2 : 0;
        
        const p = project(e.x, e.y + e.height/2 + bounce, e.z);
        if (!p.visible) return;
        
        const drawW = e.width * p.scale * scale;
        const drawH = e.height * p.scale * scale; // Keep aspect ratio roughly 1:1 for icons unless specified
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rotate);
        
        // Shadow
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, drawH/2 + 5, drawW/2, drawW/5, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
        ctx.restore();
     };

     if (e.type === EntityType.OBSTACLE) {
       switch(e.subtype) {
           // Scale 1.5 to fill the hitbox nicely
           case 'TRASH_BAG': renderSprite(assets.newObstacle, 1.5, false); break;
           default: // Fallback
               if (assets.trashCan) renderSprite(assets.trashCan, 1.5, false); 
               else drawCube(ctx, e.x, e.height/2, e.z, e.width, e.height, e.depth, '#4b5563', '#6b7280', '#374151');
       }
     } else if (e.type === EntityType.POWERUP) {
        switch(e.subtype) {
           case 'GOR_INCINERATOR': renderSprite(assets.incinerator, 2.0, true, true); break;
           case 'GORBOY_CONSOLE': renderSprite(assets.gorboyConsole, 2.0, true, true); break;
           case 'GORBILLIONS': renderSprite(assets.gorbillions, 2.0, true, true); break;
           default: renderSprite(assets.gorbillions, 2.0, true, true);
        }
     } else {
       // COLLECTIBLES
       switch(e.subtype) {
           case 'TRASH_COIN': renderSprite(assets.trashCoin, 1.8, true, true); break;
           case 'WALLET': renderSprite(assets.wallet, 1.8, true, true); break;
           case 'GORBAGANA': renderSprite(assets.gorbagana, 1.8, true, true); break;
           default: 
               // Default Point
               drawCube(ctx, e.x, e.y + 15, e.z, 20, 20, 20, '#ffd700', '#ffed4a', '#b7950b');
       }
     }
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;

    if (shakeRef.current > 0) shakeRef.current--;
    if (gameSpeedRef.current < MAX_SPEED) {
        gameSpeedRef.current += SPEED_INCREMENT;
        
        if (gameSpeedRef.current > speedMilestoneRef.current + 5) {
            playSound('speedup');
            speedMilestoneRef.current = Math.floor(gameSpeedRef.current);
        }
    }

    // Weather Logic (Random Chance to start/stop rain)
    if (Math.random() < 0.001) { // 0.1% chance per frame to toggle ~ every 16 sec
        weatherRef.current = weatherRef.current === 'CLEAR' ? 'RAIN' : 'CLEAR';
    }

    // Movement Physics
    const isTwoLane = twoLaneTimerRef.current > 0;
    const positions = isTwoLane ? LANE_X_POSITIONS_2 : LANE_X_POSITIONS;
    const targetX = positions[playerRef.current.lane];
    
    // Slippery road friction?
    const friction = weatherRef.current === 'RAIN' ? 0.05 : LANE_SWITCH_SPEED; 
    // 0.05 is much lower than 0.15, so it will slide/drift more
    
    playerRef.current.x += (targetX - playerRef.current.x) * friction;
    
    // Jump Physics
    if (isJumpingRef.current) {
        playerRef.current.y += jumpVelocityRef.current;
        jumpVelocityRef.current -= 0.8; // Gravity
        if (playerRef.current.y <= 0) {
            playerRef.current.y = 0;
            isJumpingRef.current = false;
            jumpVelocityRef.current = 0;
        }
    }
    jumpYRef.current = playerRef.current.y;

    // Timers
    if (incineratorTimerRef.current > 0) incineratorTimerRef.current--;
    if (jumpPowerupTimerRef.current > 0) jumpPowerupTimerRef.current--;
    
    // Two Lane Logic Update
    if (twoLaneTimerRef.current > 0) {
        twoLaneTimerRef.current--;
        if (twoLaneTimerRef.current === 0) {
            // Revert to 3 lanes. Keep player relative pos?
            // If in lane 0 (Left -80), map to Lane 0 (-160) or Lane 1 (0)?
            // Better: Find nearest lane index in 3-lane config
            const p = playerRef.current;
            if (p.lane === 0) p.lane = 1; // Left(2) -> Center(3)? Or Left(3)? -80 is closer to 0 (Center) or -160 (Left)? 
            // -80 is exactly between -160 and 0. Let's map to Center (1) to be safe.
            else p.lane = 2; // Right(2) +80 -> Right(3) +160? Or Center? 
            // Let's reset to center? No jarring.
            // Map: 0 -> 0, 1 -> 2?
            // 2-Lane: -80, 80.
            // 3-Lane: -160, 0, 160.
            // If at -80: Go to 0? Or -160? 0 is safer.
            p.lane = 1; 
        }
    }

    entitiesRef.current.forEach(e => {
       e.z -= gameSpeedRef.current;
    });

    updateParticles();
    
    // Truck Exhaust
    if (Math.random() > 0.5) {
        const p = playerRef.current;
        createParticles(ParticleType.EXHAUST, p.x - 20, 10, p.z - 35, 1, '#666666');
        createParticles(ParticleType.EXHAUST, p.x + 20, 10, p.z - 35, 1, '#666666');
    }
    
    // Dollar Bill Trail
    if (Math.random() > 0.7) {
        const p = playerRef.current;
        // Spawn bills from behind the truck
        createParticles(ParticleType.DOLLAR_BILL, p.x + (Math.random() - 0.5) * 40, 40 + Math.random() * 20, p.z - 40, 1, '#00ff00');
    }

    entitiesRef.current = entitiesRef.current.filter(e => e.z > -CAMERA_DISTANCE - 100 && !e.collected);

    spawnTimerRef.current--;
    if (spawnTimerRef.current <= 0) {
       spawnEntity();
       const rate = Math.max(MIN_SPAWN_RATE, SPAWN_RATE_INITIAL - (gameSpeedRef.current - INITIAL_SPEED)*1.5);
       spawnTimerRef.current = rate;
    }

    checkCollisions();
  };

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    update();
    draw(ctx);
    
    if (gameState === GameState.PLAYING) {
      runMusicScheduler();
      requestRef.current = requestAnimationFrame(loop);
    } else if (gameState === GameState.MENU) {
        draw(ctx);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      resetGame();
      requestRef.current = requestAnimationFrame(loop);
    } else {
        const t = setTimeout(() => loop(), 100);
        return () => clearTimeout(t);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, loop, resetGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) moveLane(-1);
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) moveLane(1);
      else if (e.code === 'Space') {
          if (jumpPowerupTimerRef.current > 0 && !isJumpingRef.current) {
              isJumpingRef.current = true;
              jumpVelocityRef.current = 15; // Jump Impulse
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const moveLane = (dir: number) => {
    const isTwoLane = twoLaneTimerRef.current > 0;
    const max = isTwoLane ? 1 : 2;
    playerRef.current.lane = Math.max(0, Math.min(max, playerRef.current.lane + dir));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
       moveLane(dx > 0 ? 1 : -1);
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    (window as any).gameMoveLeft = () => moveLane(-1);
    (window as any).gameMoveRight = () => moveLane(1);
    return () => {
      delete (window as any).gameMoveLeft;
      delete (window as any).gameMoveRight;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-cover block"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    />
  );
};

export default GameRunner;
