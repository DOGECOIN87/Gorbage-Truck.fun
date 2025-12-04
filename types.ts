export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum EntityType {
  OBSTACLE = 'OBSTACLE',
  COLLECTIBLE = 'COLLECTIBLE',
}

export type CollectibleSubtype = 'BOTTLE' | 'CAN' | 'GLASS' | 'GAMEBOY' | 'GORBHOUSE' | 'GORBHOUSE2' | 'GORBOY' | 'TRASHCOIN' | 'OSCAR' | 'LEXNODE';
export type ObstacleSubtype = 'CONE' | 'POTHOLE' | 'BAG' | 'TRASH_CAN' | 'ELLISON';

export interface Entity {
  id: number;
  type: EntityType;
  subtype: CollectibleSubtype | ObstacleSubtype;
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
  // New assets
  trashCan: HTMLImageElement | null;
  gameboy: HTMLImageElement | null;
  introBg: HTMLImageElement | null;
  playerImage: HTMLImageElement | null;
  bgImage: HTMLImageElement | null;
  // Obstacles
  obstacle1: HTMLImageElement | null;
  // Collectibles
  gorbhouse: HTMLImageElement | null;
  gorbhouse2: HTMLImageElement | null;
  gorboyLogo: HTMLImageElement | null;
  trashcoinLogo: HTMLImageElement | null;
  oscar: HTMLImageElement | null;
  lexnode: HTMLImageElement | null;
  ellison: HTMLImageElement | null;
  // UI Assets
  gorbagWallet: HTMLImageElement | null;
}
