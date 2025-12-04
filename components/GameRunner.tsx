
import React, { useEffect, useRef, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  LANE_X_POSITIONS, 
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
  LANE_WIDTH_3D
} from '../constants';
import { GameState, Entity, EntityType, Player, GameAssets, CollectibleSubtype } from '../types';
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
    lane: 1,
    x: LANE_X_POSITIONS[1],
    y: 0,
    z: PLAYER_Z,
    width: PLAYER_SIZE.w,
    height: PLAYER_SIZE.h,
    depth: PLAYER_SIZE.d
  });
  const entitiesRef = useRef<Entity[]>([]);
  const gameSpeedRef = useRef<number>(INITIAL_SPEED);
  const speedMilestoneRef = useRef<number>(INITIAL_SPEED);
  const spawnTimerRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const livesRef = useRef<number>(MAX_LIVES);
  const roadOffsetRef = useRef<number>(0);
  
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
  
  // Cash Bill Particles
  const cashParticlesRef = useRef<{
    x: number, 
    y: number, 
    z: number, 
    vx: number, 
    vy: number, 
    vz: number, 
    rotation: number,
    rotationSpeed: number,
    life: number,
    maxLife: number,
    scale: number
  }[]>([]);
  
  // Weather System
  const weatherRef = useRef<{
    isStorming: boolean,
    stormTimer: number,
    lightningTimer: number,
    lightningFlash: number,
    raindrops: { x: number, y: number, speed: number, length: number }[]
  }>({
    isStorming: false,
    stormTimer: 0,
    lightningTimer: 0,
    lightningFlash: 0,
    raindrops: []
  });
  
  // Time of Day
  const timeOfDayRef = useRef<'day' | 'evening' | 'night'>('day');
  
  // Jump Ability
  const jumpAbilityRef = useRef<{
    jumpsRemaining: number,
    isJumping: boolean,
    jumpHeight: number,
    jumpVelocity: number
  }>({
    jumpsRemaining: 0,
    isJumping: false,
    jumpHeight: 0,
    jumpVelocity: 0
  });
  
  // Oscar Special Mode - 2 lanes only!
  const oscarModeRef = useRef<{
    active: boolean,
    timer: number,
    maxTime: number
  }>({
    active: false,
    timer: 0,
    maxTime: 0
  });

  // --- Initialization ---
  useEffect(() => {
    const initAssets = async () => {
      assetsRef.current = await loadGameAssets();
    };
    initAssets();

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
      const h = 15 + Math.random() * 30; // Reduced from 30-90 to 15-45
      backCity.push({ x: currentX, w, h });
      currentX += w - 5;
    }

    const frontCity = [];
    currentX = -200;
    while(currentX < CANVAS_WIDTH + 200) {
      const w = 20 + Math.random() * 40;
      const h = 10 + Math.random() * 25; // Reduced from 20-60 to 10-35
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


  // --- 3D Projection Engine ---

  const project = useCallback((x: number, y: number, z: number) => {
    // 1. Calculate relative depth from camera
    const depth = z + CAMERA_DISTANCE;
    
    // 2. Prevent division by zero or negative depth
    if (depth <= 10) return { x: 0, y: 0, scale: 0, visible: false };

    // 3. Perspective Scaling
    const scale = FOV / depth;

    // 4. Projection
    // x: Center of screen + (World X * Scale)
    const screenX = CANVAS_WIDTH / 2 + x * scale;
    
    // y: Horizon Line + (Relative Height * Scale)
    // Note: y is "up" in 3D world, so we subtract from Camera Height
    const screenY = HORIZON_Y + (CAMERA_HEIGHT - y) * scale;

    return { x: screenX, y: screenY, scale, visible: true };
  }, []);

  // --- Game Logic ---

  const spawnEntity = () => {
    const laneIdx = Math.floor(Math.random() * 3);
    const laneX = LANE_X_POSITIONS[laneIdx];
    
    const isCollectible = Math.random() > 0.55; 
    
    let type = isCollectible ? EntityType.COLLECTIBLE : EntityType.OBSTACLE;
    let subtype: any;
    let dims = OBSTACLE_SIZE;

    if (isCollectible) {
      const rand = Math.random();
      let variantName = 'BOTTLE';
      
      if (rand > 0.97) variantName = 'OSCAR';  // 3% chance - rarest!
      else if (rand > 0.90) variantName = 'GORBOY';
      else if (rand > 0.82) variantName = 'LEXNODE'; // 8% chance - valuable!
      else if (rand > 0.74) variantName = 'TRASHCOIN';
      else if (rand > 0.66) variantName = 'GORBHOUSE';
      else if (rand > 0.58) variantName = 'GORBHOUSE2';
      else if (rand > 0.45) variantName = 'GAMEBOY';
      else if (rand > 0.30) variantName = 'CAN';
      else if (rand > 0.15) variantName = 'GLASS';
      else variantName = 'BOTTLE';

      subtype = variantName;
      dims = COLLECTIBLE_VARIANTS[variantName];

    } else {
      // Obstacles - add Ellison variant
      const obstacleRand = Math.random();
      if (obstacleRand > 0.5) {
        subtype = 'ELLISON';
      } else {
        subtype = 'TRASH_CAN';
      }
      dims = OBSTACLE_SIZE;
    }

    const tooClose = entitiesRef.current.some(e => 
      e.lane === laneIdx && Math.abs(e.z - SPAWN_DISTANCE) < 400
    );

    if (!tooClose) {
      entitiesRef.current.push({
        id: Date.now() + Math.random(),
        type,
        subtype,
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
    
    entitiesRef.current.forEach(e => {
      if (e.collected) return;

      const depthOverlap = Math.abs(p.z - e.z) < (p.depth + e.depth) / 2;
      const widthOverlap = Math.abs(p.x - e.x) < (p.width + e.width) / 2;

      if (depthOverlap && widthOverlap) {
        if (e.type === EntityType.COLLECTIBLE) {
          e.collected = true;
          
          const variant = COLLECTIBLE_VARIANTS[e.subtype as string] || COLLECTIBLE_VARIANTS['BOTTLE'];
          const baseScore = variant.score;
          
          comboCountRef.current += 1;
          if (comboCountRef.current % ITEMS_PER_COMBO === 0) {
            multiplierRef.current = Math.min(multiplierRef.current + 1, 10);
            setMultiplier(multiplierRef.current);
          }
          scoreRef.current += baseScore * multiplierRef.current;
          setScore(scoreRef.current);
          playSound('collect');
          
          // GORBOY grants 3 jumps!
          if (e.subtype === 'GORBOY') {
            jumpAbilityRef.current.jumpsRemaining = 3;
          }
          
          // OSCAR activates 2-lane mode for 10-15 seconds!
          if (e.subtype === 'OSCAR') {
            const duration = 600 + Math.random() * 300; // 10-15 seconds at 60fps
            oscarModeRef.current = {
              active: true,
              timer: duration,
              maxTime: duration
            };
            // Move player to a valid lane (0 or 2) if in center
            if (playerRef.current.lane === 1) {
              playerRef.current.lane = Math.random() > 0.5 ? 0 : 2;
            }
          }
        } else {
          e.collected = true; 
          livesRef.current -= 1;
          setLives(livesRef.current);
          comboCountRef.current = 0;
          multiplierRef.current = 1;
          setMultiplier(1);
          playSound('hit');
          shakeRef.current = 20;
          
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

  // Spawn cash bill particle
  const spawnCashParticle = () => {
    const p = playerRef.current;
    // Spawn from the back of the truck - flying towards camera (behind player off screen)
    const particle = {
      x: p.x + (Math.random() - 0.5) * 60,
      y: 15 + Math.random() * 30, // Keep low
      z: p.z - p.depth / 2 - 10, // Start behind the truck (closer to camera)
      vx: (Math.random() - 0.5) * 2, // Slight side spread
      vy: Math.random() * 1.5 + 0.5, // Slight upward float
      vz: -(Math.random() * 15 + 10), // Negative Z = towards camera/off screen behind
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      life: 1,
      maxLife: 40 + Math.random() * 30,
      scale: 0.5 + Math.random() * 0.4
    };
    cashParticlesRef.current.push(particle);
  };

  // Update cash particles
  const updateCashParticles = () => {
    cashParticlesRef.current.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;
      // Slight flutter
      particle.vy -= 0.02; // gentle gravity
      particle.rotation += particle.rotationSpeed;
      particle.life -= 1 / particle.maxLife;
    });
    
    // Remove dead particles (also remove when z goes below camera)
    cashParticlesRef.current = cashParticlesRef.current.filter(p => p.life > 0 && p.z > -CAMERA_DISTANCE - 200);
  };

  // Draw cash particles
  const drawCashParticles = (ctx: CanvasRenderingContext2D) => {
    cashParticlesRef.current.forEach(particle => {
      const p = project(particle.x, particle.y, particle.z);
      if (!p.visible) return;
      
      const size = 25 * particle.scale * p.scale;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = Math.min(1, particle.life * 2);
      
      // Draw a dollar bill shape
      ctx.fillStyle = '#14F195';
      ctx.fillRect(-size, -size/2.5, size * 2, size);
      
      // Inner rectangle
      ctx.fillStyle = '#0b8c56';
      ctx.fillRect(-size * 0.8, -size/4, size * 1.6, size * 0.7);
      
      // Dollar sign
      ctx.fillStyle = '#14F195';
      ctx.font = `bold ${Math.max(8, size * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, size * 0.1);
      
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  };

  const resetGame = useCallback(() => {
    playerRef.current = {
        lane: 1,
        x: LANE_X_POSITIONS[1],
        y: 0,
        z: PLAYER_Z,
        width: PLAYER_SIZE.w,
        height: PLAYER_SIZE.h,
        depth: PLAYER_SIZE.d
    };
    entitiesRef.current = [];
    cashParticlesRef.current = [];
    // Reset weather
    weatherRef.current = {
      isStorming: false,
      stormTimer: 600 + Math.random() * 1200,
      lightningTimer: 0,
      lightningFlash: 0,
      raindrops: []
    };
    // Reset jump ability
    jumpAbilityRef.current = {
      jumpsRemaining: 0,
      isJumping: false,
      jumpHeight: 0,
      jumpVelocity: 0
    };
    // Reset Oscar mode
    oscarModeRef.current = {
      active: false,
      timer: 0,
      maxTime: 0
    };
    // Set time of day based on real time
    const hour = new Date().getHours();
    // Night: 8pm (20) to 6am
    if (hour >= 20 || hour < 6) {
      timeOfDayRef.current = 'night';
    } else if (hour >= 17 && hour < 20) {
      timeOfDayRef.current = 'evening';
    } else {
      timeOfDayRef.current = 'day';
    }
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

    // Draw Top Face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(fTopL.x, fTopL.y);
    ctx.lineTo(fTopR.x, fTopR.y);
    ctx.lineTo(bTopR.x, bTopR.y);
    ctx.lineTo(bTopL.x, bTopL.y);
    ctx.fill();
    ctx.stroke();

    // Draw Side Faces (only if visible based on x)
    if (x < 0) {
         ctx.fillStyle = sideColor;
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
    ctx.fillStyle = color;
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
    const assets = assetsRef.current;
    
    // Time of day sky colors
    let skyTop = '#0f172a';
    let skyBottom = '#312e81';
    let cityBack = '#1e1b4b';
    let cityFront = '#4c1d95';
    
    if (timeOfDayRef.current === 'day') {
      skyTop = '#1e40af';
      skyBottom = '#60a5fa';
      cityBack = '#374151';
      cityFront = '#6b7280';
    } else if (timeOfDayRef.current === 'evening') {
      skyTop = '#7c2d12';
      skyBottom = '#fb923c';
      cityBack = '#431407';
      cityFront = '#92400e';
    }
    // night uses default colors
    
    // Darken during storm
    if (weatherRef.current.isStorming) {
      skyTop = '#0a0a0a';
      skyBottom = '#1f2937';
      cityBack = '#111827';
      cityFront = '#1f2937';
    }
    
    // Background Image or Sky Gradient
    if (assets?.bgImage && !weatherRef.current.isStorming) {
      ctx.drawImage(assets.bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
      grad.addColorStop(0, skyTop);
      grad.addColorStop(1, skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Lightning flash overlay
    if (weatherRef.current.lightningFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${weatherRef.current.lightningFlash / 15 * 0.8})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    const playerX = playerRef.current.x;

    // Stars
    ctx.fillStyle = '#FFF';
    bgLayersRef.current.stars.forEach(s => {
      const offsetX = -playerX * 0.05; 
      let px = s.x + offsetX;
      ctx.globalAlpha = s.opacity;
      ctx.beginPath();
      ctx.arc(px, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // City Layers with neon lights
    ctx.fillStyle = '#1e1b4b'; 
    bgLayersRef.current.backCity.forEach(b => {
      const offsetX = -playerX * 0.1;
      ctx.fillRect(b.x + offsetX, HORIZON_Y - b.h, b.w, b.h);
      
      // Add neon window lights (green, magenta, purple)
      const colors = ['#14F195', '#FF00FF', '#9945FF'];
      const numLights = Math.floor(b.h / 12);
      for (let i = 0; i < numLights; i++) {
        const lightColor = colors[Math.floor((b.x + i * 7) % colors.length)];
        const lightY = HORIZON_Y - b.h + 5 + i * 12;
        const lightX = b.x + offsetX + 5 + ((b.x + i) % 2) * 10;
        
        // Glow effect
        ctx.shadowBlur = 4;
        ctx.shadowColor = lightColor;
        ctx.fillStyle = lightColor;
        ctx.fillRect(lightX, lightY, 4, 6);
      }
      ctx.shadowBlur = 0;
    });

    ctx.fillStyle = '#4c1d95'; 
    bgLayersRef.current.frontCity.forEach(b => {
      const offsetX = -playerX * 0.25;
      ctx.fillRect(b.x + offsetX, HORIZON_Y - b.h, b.w, b.h);
      
      // Add brighter neon window lights for front layer
      const colors = ['#14F195', '#FF00FF', '#9945FF'];
      const numLights = Math.floor(b.h / 10);
      for (let i = 0; i < numLights; i++) {
        const lightColor = colors[Math.floor((b.x + i * 5) % colors.length)];
        const lightY = HORIZON_Y - b.h + 3 + i * 10;
        const lightX = b.x + offsetX + 3 + ((b.x + i) % 2) * 8;
        
        // Stronger glow for front buildings
        ctx.shadowBlur = 6;
        ctx.shadowColor = lightColor;
        ctx.fillStyle = lightColor;
        ctx.fillRect(lightX, lightY, 3, 5);
      }
      ctx.shadowBlur = 0;
    });

    // Ground
    ctx.fillStyle = '#111827'; 
    ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

    ctx.save();
    
    // Screen Shake
    if (shakeRef.current > 0) {
      const mag = shakeRef.current * 0.5;
      ctx.translate((Math.random()-0.5)*mag, (Math.random()-0.5)*mag);
    }

    // Draw Road Plane
    const roadHalfWidth = (LANE_WIDTH_3D * 3) / 2;
    const zNear = -CAMERA_DISTANCE + 10;
    const zFar = SPAWN_DISTANCE;

    const pNearL = project(-roadHalfWidth, 0, zNear);
    const pNearR = project(roadHalfWidth, 0, zNear);
    const pFarL = project(-roadHalfWidth, 0, zFar);
    const pFarR = project(roadHalfWidth, 0, zFar);

    if (pNearL.visible && pNearR.visible) {
        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.moveTo(pNearL.x, pNearL.y);
        ctx.lineTo(pNearR.x, pNearR.y);
        ctx.lineTo(pFarR.x, pFarR.y);
        ctx.lineTo(pFarL.x, pFarL.y);
        ctx.fill();
    }

    // Moving Lane Markers
    roadOffsetRef.current = (roadOffsetRef.current + gameSpeedRef.current) % 400;
    
    // Different lane markers based on Oscar mode
    if (oscarModeRef.current.active) {
      // Oscar mode: Single gold center line
      ctx.strokeStyle = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fbbf24';
      
      // Draw solid center line
      for (let z = -200; z < SPAWN_DISTANCE; z += 50) {
        const zPos = z - roadOffsetRef.current;
        if (zPos < -CAMERA_DISTANCE + 50) continue;
        
        const p1 = project(0, 0, zPos);
        const p2 = project(0, 0, zPos + 40);
        
        if (p1.visible && p2.visible) {
          ctx.lineWidth = Math.max(2, 6 * p1.scale);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    } else {
      // Normal mode: Two purple lane dividers
      ctx.strokeStyle = '#9945FF';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#9945FF';
      
      const laneDividersX = [
          LANE_X_POSITIONS[0] + LANE_WIDTH_3D/2, 
          LANE_X_POSITIONS[1] + LANE_WIDTH_3D/2
      ];
      
      laneDividersX.forEach(lx => {
         for (let z = -200; z < SPAWN_DISTANCE; z += 400) {
            const zPos = z - roadOffsetRef.current;
            if (zPos < -CAMERA_DISTANCE + 50) continue; 
            
            const p1 = project(lx, 0, zPos);
            const p2 = project(lx, 0, zPos + 200);
            
            if (p1.visible && p2.visible) {
               ctx.lineWidth = Math.max(1, 4 * p1.scale);
               ctx.beginPath();
               ctx.moveTo(p1.x, p1.y);
               ctx.lineTo(p2.x, p2.y);
               ctx.stroke();
            }
         }
      });
    }
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

    // Draw cash particles flying from truck
    drawCashParticles(ctx);

    ctx.restore();
    
    // Draw rain overlay (outside of ctx.save/restore for screen-space)
    if (weatherRef.current.isStorming) {
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
      ctx.lineWidth = 1;
      weatherRef.current.raindrops.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - drop.length * 0.3, drop.y + drop.length);
        ctx.stroke();
      });
    }
    
    // Draw jump indicator UI
    if (jumpAbilityRef.current.jumpsRemaining > 0) {
      const jumpX = 20;
      const jumpY = CANVAS_HEIGHT - 60;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(jumpX - 5, jumpY - 5, 130, 50);
      
      ctx.fillStyle = '#14F195';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('JUMPS:', jumpX, jumpY + 15);
      
      // Draw jump icons
      for (let i = 0; i < jumpAbilityRef.current.jumpsRemaining; i++) {
        ctx.fillStyle = '#9945FF';
        ctx.beginPath();
        ctx.moveTo(jumpX + 60 + i * 25, jumpY + 25);
        ctx.lineTo(jumpX + 70 + i * 25, jumpY + 5);
        ctx.lineTo(jumpX + 80 + i * 25, jumpY + 25);
        ctx.closePath();
        ctx.fill();
      }
    }
    
    // Draw Oscar 2-lane mode indicator
    if (oscarModeRef.current.active) {
      const progress = oscarModeRef.current.timer / oscarModeRef.current.maxTime;
      const barWidth = 200;
      const barX = (CANVAS_WIDTH - barWidth) / 2;
      const barY = 140;
      
      // Pulsing glow effect
      const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX - 10, barY - 30, barWidth + 20, 60);
      
      // Title
      ctx.fillStyle = `rgba(251, 191, 36, ${pulse})`;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⭐ OSCAR MODE ⭐', CANVAS_WIDTH / 2, barY - 8);
      
      // Timer bar background
      ctx.fillStyle = '#374151';
      ctx.fillRect(barX, barY + 5, barWidth, 15);
      
      // Timer bar fill (golden color)
      const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth * progress, 0);
      gradient.addColorStop(0, '#fbbf24');
      gradient.addColorStop(1, '#f59e0b');
      ctx.fillStyle = gradient;
      ctx.fillRect(barX, barY + 5, barWidth * progress, 15);
      
      // Border
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY + 5, barWidth, 15);
      
      // "2 LANES ONLY" text
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('2 LANES ONLY!', CANVAS_WIDTH / 2, barY + 35);
      
      ctx.textAlign = 'left';
    }
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
    const assets = assetsRef.current;

    if (assets?.playerImage) {
      drawSprite(ctx, assets.playerImage, p.x, p.y, p.z, p.width, p.height);
    } else {
      const shadowP = project(p.x, 0, p.z);
      if(shadowP.visible) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.ellipse(shadowP.x, shadowP.y, (p.width * shadowP.scale), (p.width * 0.4 * shadowP.scale), 0, 0, Math.PI * 2);
          ctx.fill();
      }

      // Truck Body
      drawCube(ctx, p.x, 20, p.z, p.width, p.height*0.6, p.depth, '#14F195', '#10c479', '#0b8c56');
      // Truck Cabin
      drawCube(ctx, p.x, p.height*0.6, p.z - 20, p.width * 0.9, p.height*0.4, p.depth * 0.4, '#9945FF', '#7c3aed', '#6d28d9');

      // Wheels
      const wx = p.width/2 + 5;
      drawCube(ctx, p.x - wx, 10, p.z - 25, 12, 22, 25, '#111', '#333', '#000');
      drawCube(ctx, p.x + wx, 10, p.z - 25, 12, 22, 25, '#111', '#333', '#000');
      drawCube(ctx, p.x - wx, 10, p.z + 25, 12, 22, 25, '#111', '#333', '#000');
      drawCube(ctx, p.x + wx, 10, p.z + 25, 12, 22, 25, '#111', '#333', '#000');
    }
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, e: Entity) => {
     const assets = assetsRef.current;

     if (e.type === EntityType.OBSTACLE) {
       // Render Ellison obstacle or fallback to other obstacles
       if (e.subtype === 'ELLISON' && assets?.ellison) {
         drawSprite(ctx, assets.ellison, e.x, e.y, e.z, e.width, e.height);
       } else if (assets?.obstacle1) {
         drawSprite(ctx, assets.obstacle1, e.x, e.y, e.z, e.width, e.height);
       } else if (assets?.trashCan) {
         drawSprite(ctx, assets.trashCan, e.x, e.y, e.z, e.width, e.height);
       } else {
         const p = project(e.x, e.height/2, e.z);
         if(p.visible) {
             ctx.fillStyle = '#6b7280';
             ctx.fillRect(p.x - (e.width/2)*p.scale, p.y - (e.height/2)*p.scale, e.width*p.scale, e.height*p.scale);
         }
       }
     } else {
       const bounce = Math.sin(Date.now() / 200) * 8;
       const rotate = Math.sin(Date.now() / 500) * 0.1;
       
       let img: HTMLImageElement | null = null;
       
       if (e.subtype === 'GAMEBOY' && assets?.gameboy) {
          img = assets.gameboy;
       } else if (e.subtype === 'GORBHOUSE' && assets?.gorbhouse) {
          img = assets.gorbhouse;
       } else if (e.subtype === 'GORBHOUSE2' && assets?.gorbhouse2) {
          img = assets.gorbhouse2;
       } else if (e.subtype === 'GORBOY' && assets?.gorboyLogo) {
          img = assets.gorboyLogo;
       } else if (e.subtype === 'TRASHCOIN' && assets?.trashcoinLogo) {
          img = assets.trashcoinLogo;
       } else if (e.subtype === 'OSCAR' && assets?.oscar) {
          img = assets.oscar;
       } else if (e.subtype === 'LEXNODE' && assets?.lexnode) {
          img = assets.lexnode;
       }
       
       if (img) {
          const p = project(e.x, e.y + e.height/2 + bounce, e.z);
          if (!p.visible) return;
          
          const drawW = e.width * p.scale;
          const drawH = e.height * p.scale;
          
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(rotate);
          ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
          ctx.restore();
       } else {
          let color = '#fff';
          if (e.subtype === 'BOTTLE') color = '#3b82f6';
          else if (e.subtype === 'CAN') color = '#ef4444';
          else if (e.subtype === 'GLASS') color = '#10b981';

          const bounceY = Math.sin(Date.now() / 300) * 5;
          const yPos = e.y + 10 + bounceY;
          
          drawCube(
             ctx, 
             e.x, 
             yPos, 
             e.z, 
             e.width, 
             e.height, 
             e.depth, 
             color, 
             '#ffffff', 
             color
          );
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

    // In Oscar mode, use 2-lane positions (left of center, right of center)
    let targetX: number;
    if (oscarModeRef.current.active) {
      // 2 lanes: centered at -LANE_WIDTH_3D and +LANE_WIDTH_3D
      const oscarLanePositions = [-LANE_WIDTH_3D, LANE_WIDTH_3D];
      // Map player lane (0 or 2) to oscar positions (0 or 1)
      const oscarLane = playerRef.current.lane === 0 ? 0 : 1;
      targetX = oscarLanePositions[oscarLane];
    } else {
      targetX = LANE_X_POSITIONS[playerRef.current.lane];
    }
    playerRef.current.x += (targetX - playerRef.current.x) * LANE_SWITCH_SPEED;
    
    entitiesRef.current.forEach(e => {
       e.z -= gameSpeedRef.current;
    });

    entitiesRef.current = entitiesRef.current.filter(e => e.z > -CAMERA_DISTANCE - 100 && !e.collected);

    spawnTimerRef.current--;
    if (spawnTimerRef.current <= 0) {
       spawnEntity();
       const rate = Math.max(MIN_SPAWN_RATE, SPAWN_RATE_INITIAL - (gameSpeedRef.current - INITIAL_SPEED)*1.5);
       spawnTimerRef.current = rate;
    }

    // Spawn cash particles - amount scales with score
    const cashSpawnRate = Math.min(0.05 + (scoreRef.current / 5000) * 0.4, 0.5);
    if (Math.random() < cashSpawnRate) {
      spawnCashParticle();
    }
    
    // Update cash particles
    updateCashParticles();
    
    // Update weather system
    weatherRef.current.stormTimer--;
    if (weatherRef.current.stormTimer <= 0) {
      weatherRef.current.isStorming = !weatherRef.current.isStorming;
      weatherRef.current.stormTimer = weatherRef.current.isStorming 
        ? 300 + Math.random() * 600  // Storm lasts 5-15 seconds
        : 600 + Math.random() * 1200; // Clear weather 10-30 seconds
      if (weatherRef.current.isStorming) {
        // Initialize raindrops
        weatherRef.current.raindrops = [];
        for (let i = 0; i < 100; i++) {
          weatherRef.current.raindrops.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            speed: 8 + Math.random() * 8,
            length: 10 + Math.random() * 20
          });
        }
      }
    }
    
    // Update rain during storm
    if (weatherRef.current.isStorming) {
      weatherRef.current.raindrops.forEach(drop => {
        drop.y += drop.speed;
        drop.x -= drop.speed * 0.3;
        if (drop.y > CANVAS_HEIGHT) {
          drop.y = -drop.length;
          drop.x = Math.random() * CANVAS_WIDTH * 1.5;
        }
      });
      
      // Lightning chance (visual effect only)
      weatherRef.current.lightningTimer--;
      if (weatherRef.current.lightningTimer <= 0 && Math.random() < 0.005) {
        weatherRef.current.lightningFlash = 15;
        weatherRef.current.lightningTimer = 60 + Math.random() * 180;
      }
      if (weatherRef.current.lightningFlash > 0) {
        weatherRef.current.lightningFlash--;
      }
    }
    
    // Update jump physics
    if (jumpAbilityRef.current.isJumping) {
      jumpAbilityRef.current.jumpVelocity -= 1.5; // gravity
      jumpAbilityRef.current.jumpHeight += jumpAbilityRef.current.jumpVelocity;
      playerRef.current.y = Math.max(0, jumpAbilityRef.current.jumpHeight);
      
      if (jumpAbilityRef.current.jumpHeight <= 0) {
        jumpAbilityRef.current.isJumping = false;
        jumpAbilityRef.current.jumpHeight = 0;
        playerRef.current.y = 0;
      }
    }
    
    // Update Oscar mode timer
    if (oscarModeRef.current.active) {
      oscarModeRef.current.timer--;
      if (oscarModeRef.current.timer <= 0) {
        oscarModeRef.current.active = false;
      }
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

  // Jump function
  const performJump = () => {
    if (jumpAbilityRef.current.jumpsRemaining > 0 && !jumpAbilityRef.current.isJumping) {
      jumpAbilityRef.current.isJumping = true;
      jumpAbilityRef.current.jumpVelocity = 25;
      jumpAbilityRef.current.jumpsRemaining -= 1;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) moveLane(-1);
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) moveLane(1);
      else if (['ArrowUp', ' ', 'w', 'W'].includes(e.key)) performJump();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const moveLane = (dir: number) => {
    // During Oscar 2-lane mode, only allow outer lanes (0 and 2)
    if (oscarModeRef.current.active) {
      // In 2-lane mode, toggle between 0 and 2 only
      if (playerRef.current.lane === 0 && dir > 0) {
        playerRef.current.lane = 2;
      } else if (playerRef.current.lane === 2 && dir < 0) {
        playerRef.current.lane = 0;
      }
    } else {
      playerRef.current.lane = Math.max(0, Math.min(2, playerRef.current.lane + dir));
    }
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
