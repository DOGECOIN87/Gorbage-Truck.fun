
import { ColorTheme } from './types';

// Canvas Resolution
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 900;

// World Settings (3D Units)
export const LANE_WIDTH_3D = 160; 
export const LANE_X_POSITIONS = [-LANE_WIDTH_3D, 0, LANE_WIDTH_3D]; // Default 3 lanes
export const LANE_X_POSITIONS_2 = [-80, 80]; // 2 Lane Mode

// Perspective Projection Settings
export const CAMERA_HEIGHT = 150; // Raised slightly to see over truck
export const CAMERA_DISTANCE = 100; 
export const FOV = 550; 

// Screen Y where the sky meets the ground (Vanishing Point Y)
// Lowering the horizon Y value moves it UP the screen (0 is top)
// Raising the value moves it DOWN.
// For a chase cam, we usually want horizon slightly lower on screen (higher value?).
export const HORIZON_Y = CANVAS_HEIGHT * 0.30; // 270px from top (Higher up)

// Player Settings
export const PLAYER_Z = 300; // Player closer to camera plane
export const PLAYER_SIZE = { w: 70, h: 70, d: 110 }; 
export const LANE_SWITCH_SPEED = 0.15;

// Gameplay
export const INITIAL_SPEED = 16; 
export const MAX_SPEED = 45;
export const SPEED_INCREMENT = 0.01;

export const SPAWN_DISTANCE = 5000;
export const RENDER_DISTANCE = 5000;

// Spawn Rates
export const SPAWN_RATE_INITIAL = 50;
export const MIN_SPAWN_RATE = 18;

// Entity Dimensions
export const OBSTACLE_SIZE = { w: 60, h: 70, d: 40 }; 

// Collectible Configuration
export const COLLECTIBLE_VARIANTS: Record<string, { w: number, h: number, d: number, score: number }> = {
  GAMEBOY: { w: 50, h: 75, d: 20, score: 50 }, 
  BOTTLE:  { w: 30, h: 50, d: 30, score: 10 },
  CAN:     { w: 35, h: 40, d: 35, score: 15 },
  GLASS:   { w: 30, h: 55, d: 30, score: 20 },
};

// Scoring
export const MAX_LIVES = 3;
export const ITEMS_PER_COMBO = 5;

// Visual Effects
export const PARTICLE_COUNT_EXHAUST = 2;
export const PARTICLE_COUNT_COLLECT = 15;
export const PARTICLE_COUNT_COLLISION = 20;
export const SHADOW_OPACITY = 0.5;
export const BLOOM_STRENGTH = 15;
export const FOG_START = 3000;
export const FOG_END = 5000;
export const FOG_COLOR = '#0f172a';

// Themes
export const THEMES: Record<string, ColorTheme> = {
  DAY: {
    skyTop: '#38bdf8', // Light Blue
    skyMiddle: '#bae6fd',
    skyBottom: '#e0f2fe',
    starsOpacity: 0,
    roadColor: '#334155', // Slate 700
    roadTextureColor: '#475569',
    groundColor: '#475569', // Slate 600
    laneMarkerColor: '#60a5fa', // Blue Glow
    laneMarkerGlow: '#93c5fd',
    cityBack: '#1e293b',
    cityFront: '#334155',
    windowColorWarm: '#1e293b', // Dark windows
    windowColorCool: '#1e293b',
    fogColor: '#e0f2fe'
  },
  TWILIGHT: {
    skyTop: '#1e1b4b', // Dark Blue
    skyMiddle: '#c026d3', // Purple/Pink
    skyBottom: '#f97316', // Orange
    starsOpacity: 0.5,
    roadColor: '#1e293b',
    roadTextureColor: '#334155',
    groundColor: '#1e293b',
    laneMarkerColor: '#c084fc', // Purple Glow
    laneMarkerGlow: '#e879f9',
    cityBack: '#0f172a',
    cityFront: '#1e293b', 
    windowColorWarm: '#fbbf24',
    windowColorCool: '#334155',
    fogColor: '#f97316'
  },
  NIGHT: {
    skyTop: '#020617', 
    skyMiddle: '#1e1b4b',
    skyBottom: '#4c1d95',
    starsOpacity: 1.0,
    roadColor: '#1a1a1a',
    roadTextureColor: '#222',
    groundColor: '#0f0f10',
    laneMarkerColor: '#a855f7',
    laneMarkerGlow: '#d8b4fe',
    cityBack: '#0f172a',
    cityFront: '#1e293b',
    windowColorWarm: '#fbbf24',
    windowColorCool: '#334155',
    fogColor: '#4c1d95' // Use horizon color
  }
};
