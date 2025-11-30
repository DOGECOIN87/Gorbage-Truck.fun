export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum EntityType {
  OBSTACLE = 'OBSTACLE',
  COLLECTIBLE = 'COLLECTIBLE',
  POWERUP = 'POWERUP',
}

export type CollectibleSubtype = 'TRASH_COIN' | 'GORBAGANA' | 'WALLET' | 'GENERIC_POINT';
export type ObstacleSubtype = 'TRASH_BAG';
export type PowerupSubtype = 'GOR_INCINERATOR' | 'GORBOY_CONSOLE' | 'GORBILLIONS';

export interface Entity {
  id: number;
  type: EntityType;
  subtype: CollectibleSubtype | ObstacleSubtype | PowerupSubtype;
  lane: number;
  x: number; // World X
  y: number; // World Y (Height from ground)
  z: number; // World Z (Distance from camera)
  width: number;
  height: number;
  depth: number;
  collected?: boolean;
}

export interface Player {
  lane: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export interface GameAssets {
  truck: HTMLImageElement | null;
  ground: HTMLImageElement | null;
  // Misc
  introBg: HTMLImageElement | null;
  introBgNew: HTMLImageElement | null;
  ufo: HTMLImageElement | null; // Background asset now
  
  // Powerups (+Health/Ability)
  incinerator: HTMLImageElement | null;
  gorboyConsole: HTMLImageElement | null;
  gorbillions: HTMLImageElement | null;

  // Obstacles (Damage)
  newObstacle: HTMLImageElement | null;
  
  // Decorations
  trashBagDecor: HTMLImageElement | null;

  // Points (+Score)
  trashCoin: HTMLImageElement | null;
  gorbagana: HTMLImageElement | null;
  wallet: HTMLImageElement | null;
  
  // Legacy/Fallback
  trashCan: HTMLImageElement | null;
}

export enum ParticleType {
  EXHAUST = 'EXHAUST',
  SPARKLE = 'SPARKLE',
  DEBRIS = 'DEBRIS',
  DOLLAR_BILL = 'DOLLAR_BILL'
}

export interface Particle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

export type TimeOfDay = 'DAY' | 'TWILIGHT' | 'NIGHT';
export type WeatherType = 'CLEAR' | 'RAIN';

export interface ColorTheme {
  skyTop: string;
  skyMiddle: string;
  skyBottom: string;
  starsOpacity: number;
  roadColor: string;
  roadTextureColor: string;
  groundColor: string;
  laneMarkerColor: string;
  laneMarkerGlow: string;
  cityBack: string;
  cityFront: string;
  windowColorWarm: string;
  windowColorCool: string;
  fogColor: string;
}
