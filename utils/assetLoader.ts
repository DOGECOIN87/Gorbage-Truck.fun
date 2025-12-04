import { GameAssets } from '../types';

const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load asset: ${src}. Using fallback graphics.`);
      resolve(null);
    };
  });
};

export const loadGameAssets = async (): Promise<GameAssets> => {
  // Loading the specific assets requested by the user
  const truck = await loadImage('/assets/truck.png'); // Keeping existing logic
  const ground = await loadImage('/assets/ground.png');

  // New specific images
  const trashCan = await loadImage('/assets/trash_can.png');
  const gameboy = await loadImage('/assets/gameboy.png');
  const introBg = await loadImage('/assets/intro_bg.png');
  const playerImage = await loadImage('/assets/gorbage-truck-.png');
  const bgImage = await loadImage('/assets/background.jpg');

  // Obstacles
  const obstacle1 = await loadImage('/assets/obstacle-1.png');

  // Collectibles
  const gorbhouse = await loadImage('/assets/gorbhouse.png');
  const gorbhouse2 = await loadImage('/assets/gorbhouse-2.png');
  const gorboyLogo = await loadImage('/assets/gorboy-logo.png');
  const trashcoinLogo = await loadImage('/assets/trashcoin-logo.png');
  const oscar = await loadImage('/assets/oscar.png');
  const lexnode = await loadImage('/assets/lexnode.png');
  const ellison = await loadImage('/assets/ellison.png');
  
  // UI Assets
  const gorbagWallet = await loadImage('/assets/gorbag-wallet-button.png');

  return {
    truck,
    ground,
    trashCan,
    gameboy,
    introBg,
    playerImage,
    bgImage,
    obstacle1,
    gorbhouse,
    gorbhouse2,
    gorboyLogo,
    trashcoinLogo,
    oscar,
    lexnode,
    ellison,
    gorbagWallet,
  };
};
