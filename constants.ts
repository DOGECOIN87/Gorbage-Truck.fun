
// Canvas Resolution
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 900;

// World Settings (3D Units)
// Increased lane width for better spacing
export const LANE_WIDTH_3D = 160; 
export const LANE_X_POSITIONS = [-LANE_WIDTH_3D, 0, LANE_WIDTH_3D];

// Perspective Projection Settings
export const CAMERA_HEIGHT = 180; // Lower camera for a more grounded feel
export const CAMERA_DISTANCE = 300; // Further back to flatten perspective slightly
export const FOV = 600; // Adjusted FOV to match distance

// Screen Y where the sky meets the ground (Vanishing Point Y)
export const HORIZON_Y = CANVAS_HEIGHT * 0.35; 

// Player Settings
export const PLAYER_Z = 200; // Player sits closer to the screen
export const PLAYER_SIZE = { w: 130, h: 130, d: 180 };
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
export const OBSTACLE_SIZE = { w: 100, h: 120, d: 60 }; 

// Collectible Configuration
export const COLLECTIBLE_VARIANTS: Record<string, { w: number, h: number, d: number, score: number }> = {
  GAMEBOY: { w: 50, h: 75, d: 20, score: 50 }, 
  BOTTLE:  { w: 30, h: 50, d: 30, score: 10 },
  CAN:     { w: 35, h: 40, d: 35, score: 15 },
  GLASS:   { w: 30, h: 55, d: 30, score: 20 },
  GORBHOUSE: { w: 100, h: 100, d: 40, score: 30 },   // Larger!
  GORBHOUSE2: { w: 100, h: 100, d: 40, score: 35 },  // Larger!
  GORBOY: { w: 120, h: 120, d: 45, score: 40 },      // Big and noticeable
  TRASHCOIN: { w: 110, h: 110, d: 40, score: 25 },   // Larger!
  OSCAR: { w: 120, h: 160, d: 50, score: 100 },      // Largest & rarest! Enables 2-lane mode
  LEXNODE: { w: 90, h: 90, d: 35, score: 45 },       // Valuable tech item!
};

// Scoring
export const MAX_LIVES = 3;
export const ITEMS_PER_COMBO = 5;
