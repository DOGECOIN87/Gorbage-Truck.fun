import { GameAssets } from '../types';

const loadImage = (src: string, removeBlackBg: boolean = false): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Allow pixel manipulation if CORS permits
    img.src = src;
    img.onload = () => {
      if (removeBlackBg) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // If pixel is close to black (sum < 30), make transparent
              if (r < 30 && g < 30 && b < 30) {
                data[i + 3] = 0;
              }
            }
            ctx.putImageData(imageData, 0, 0);
            const newImg = new Image();
            newImg.onload = () => resolve(newImg);
            newImg.src = canvas.toDataURL();
            return;
          }
        } catch (e) {
          console.warn('Could not process image transparency', e);
        }
      }
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to load asset: ${src}. Using fallback graphics.`);
      resolve(null);
    };
  });
};

export const loadGameAssets = async (): Promise<GameAssets> => {
  // Base
  const truck = await loadImage('./game-assets/gorbage-truck-2.png', true); 
  // Use available assets in /public/assets to avoid 404s
  const ground = await loadImage('./assets/trashbag.jpg');
  const trashCan = await loadImage('./assets/binlogo.png'); // Fallback

  // Misc
  const introBg = await loadImage('./assets/intro_bg_new.png');
  const introBgNew = await loadImage('./assets/intro_bg_new.png');
  const ufo = await loadImage('./assets/ufo.png');
  const gorbhouseCry = await loadImage('./game-assets/gorbhouse-cry.png', true); // New asset for game over screen

  // Powerups
  // Try to load new asset first, fall back to old one if it fails
  const incinerator = await loadImage('./game-assets/Logo-gor-incinerator.jpg', true) || 
                     await loadImage('./assets/incinerator.jpg', true);
  const gorboyConsole = await loadImage('./game-assets/Gorboyconsole.png', true) || 
                       await loadImage('./assets/gorboyconsole.png', true);
  const gorbillions = await loadImage('./assets/gorbillions.png', true);
  
  // Obstacles
  const newObstacle = await loadImage('./game-assets/4.webp', true);
  
  // Stickers/Collectibles (new assets)
  const stickerpill = await loadImage('./game-assets/stickerpill.webp', true);
  const sticker3 = await loadImage('./game-assets/sticker3.webp', true);
  
  // Decorations (trashbag for side decoration)
  const trashBagDecor = await loadImage('./assets/trashbag.png', true);

  // Points
  // Try to load new asset first, fall back to old one if it fails
  const trashCoin = await loadImage('./game-assets/trashcoinlogo.png', true) || 
                   await loadImage('./assets/trashcoin.png', true);
  const gorbagana = await loadImage('./assets/gorbagana.jpg', true);
  const wallet = await loadImage('./game-assets/gorbagwallet-removebg-preview.png', true) || 
                await loadImage('./assets/wallet.png', true);

  return {
    truck,
    ground,
    introBg,
    introBgNew,
    ufo,
    gorbhouseCry,
    
    // Powerups
    incinerator,
    gorboyConsole,
    gorbillions,

    // Obstacles
    newObstacle,
    
    // Decorations
    trashBagDecor,
    stickerpill,
    sticker3,

    // Points
    trashCoin,
    gorbagana,
    wallet,
    
    // Legacy
    trashCan,
  };
};
