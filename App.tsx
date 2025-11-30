
import React, { useState, useEffect } from 'react';
import GameRunner from './components/GameRunner';
import { GameState } from './types';
import { Settings, X } from 'lucide-react';

// Helper component for letter-by-letter animation
const AnimatedText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  return (
    <span className={`text-clip-slide ${className}`}>
      {text.split('').map((letter, index) => (
        <span key={index} className="letter">
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ))}
    </span>
  );
};

// Marquee component for logos
const LogoMarquee: React.FC = () => {
  const logos = [
    { src: '/assets/trashcoin.png', alt: 'Trash Coin' },
    { src: '/assets/wallet.png', alt: 'Wallet' },
    { src: '/assets/truck.png', alt: 'Truck' },
    { src: '/assets/binlogo.png', alt: 'Bin' },
    { src: '/assets/ufo.png', alt: 'UFO' },
    { src: '/assets/incinerator.jpg', alt: 'Incinerator' },
  ];

  return (
    <div className="marquee-container marquee-mask marquee-slow py-8">
      <div className="marquee-content">
        {/* Duplicate logos for seamless loop */}
        {[...logos, ...logos].map((logo, index) => (
          <div key={index} className="marquee-item">
            <img 
              src={logo.src} 
              alt={logo.alt} 
              className="h-16 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [highScore, setHighScore] = useState(0);
  
  // Settings State
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('recycleRushHighScore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  const handleGameOver = (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('recycleRushHighScore', finalScore.toString());
    }
  };

  const handleStart = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    setLives(3);
    setMultiplier(1);
    setIsSettingsOpen(false);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden font-sans select-none flex justify-center items-center">
      
      {/* Game Container */}
      <div className="relative w-full h-full max-w-lg aspect-[2/3] bg-gray-900 shadow-2xl overflow-hidden border-0 md:border-2 border-[#14F195]/20 rounded-none md:rounded-3xl">
        <GameRunner 
          gameState={gameState}
          setGameState={setGameState}
          setScore={setScore}
          setLives={setLives}
          setMultiplier={setMultiplier}
          onGameOver={handleGameOver}
          musicVolume={musicVolume}
          sfxVolume={sfxVolume}
        />

        {/* --- HUD --- */}
        {gameState === GameState.PLAYING && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20">
            {/* Top Bar */}
            <div className="flex justify-between items-start p-4 sm:p-6 safe-top bg-gradient-to-b from-black/80 to-transparent">
              {/* Score & Multiplier */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 sm:gap-3 bg-gray-900/80 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-lime-500/30 shadow-lg shadow-lime-500/10">
                  <span className="text-lg sm:text-xl">♻️</span>
                  <span className="text-h3 font-black font-sans tracking-wide text-lime-400">{score}</span>
                </div>
                {multiplier > 1 && (
                  <div className="self-start px-2 sm:px-3 py-1 bg-orange-500 text-white text-label font-bold rounded-full uppercase tracking-widest shadow-lg shadow-orange-500/40 animate-pulse">
                    Combo x{multiplier}
                  </div>
                )}
              </div>
              
              {/* Lives */}
              <div className="flex flex-col items-end gap-2 sm:gap-3">
                <div className="flex gap-1 sm:gap-1.5">
                  {[...Array(3)].map((_, i) => (
                    <svg 
                      key={i}
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24"
                      className="sm:w-7 sm:h-7"
                      viewBox="0 0 24 24" 
                      fill={i < lives ? "#ef4444" : "none"} 
                      stroke={i < lives ? "#ef4444" : "#4b5563"}
                      strokeWidth="2.5" 
                      style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.3))', transition: 'all 0.3s' }}
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pb-6 sm:pb-10 px-4 sm:px-8 safe-bottom flex justify-between w-full pointer-events-auto">
              <button 
                className="min-w-touch min-h-touch w-20 h-20 sm:w-24 sm:h-24 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center active:bg-[#14F195]/20 active:border-[#14F195] transition-all active:scale-95 touch-manipulation shadow-xl"
                onPointerDown={() => (window as any).gameMoveLeft && (window as any).gameMoveLeft()}
                aria-label="Move Left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:w-10 sm:h-10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button 
                className="min-w-touch min-h-touch w-20 h-20 sm:w-24 sm:h-24 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center active:bg-[#14F195]/20 active:border-[#14F195] transition-all active:scale-95 touch-manipulation shadow-xl"
                onPointerDown={() => (window as any).gameMoveRight && (window as any).gameMoveRight()}
                aria-label="Move Right"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:w-10 sm:h-10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            
            {/* Instructional Text */}
            <div className="absolute bottom-28 sm:bottom-36 w-full text-center pointer-events-none">
              <span className="text-lime-400 text-label font-bold uppercase tracking-[0.2em] animate-pulse opacity-80">Swipe to Move</span>
            </div>
          </div>
        )}

        {/* --- Menus --- */}
        {(gameState === GameState.MENU || gameState === GameState.GAME_OVER) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white p-4 sm:p-6 safe-area-inset">
            
            {/* Intro Screen Background Pattern with Clip Animation */}
            <div 
              className="absolute inset-0 z-[-1] opacity-40 bg-clip-reveal"
              style={{
                backgroundImage: 'url("assets/intro_bg_new.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            ></div>

            {/* Intro Screen */}
            {gameState === GameState.MENU && !isSettingsOpen && (
              <div className="flex flex-col items-center w-full max-w-sm relative px-4 sm:px-6">

                 {/* Settings Button */}
                 <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="absolute -top-16 sm:-top-20 right-0 min-w-touch min-h-touch p-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-white/70 hover:text-lime-400 hover:border-lime-400/50 transition-all hover:scale-110 scroll-fade-in scroll-delay-1"
                   aria-label="Settings"
                 >
                   <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                 </button>

                 {/* Title Section */}
                 <div className="mb-8 sm:mb-10 relative scroll-blur-in scroll-delay-2">
                    <div className="absolute -inset-8 bg-gradient-to-r from-lime-500 via-orange-500 to-lime-500 opacity-30 blur-3xl rounded-full animate-pulse"></div>
                    <h1 className="relative text-center space-y-1 sm:space-y-2">
                      <span className="block text-display-lg font-black tracking-tight leading-none text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-float" style={{
                        textShadow: '0 0 30px rgba(132, 204, 22, 0.6), 0 0 60px rgba(249, 115, 22, 0.4)',
                      }}>
                        <AnimatedText text="GORBAGE" />
                      </span>
                      <span className="block text-display-lg font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-lime-400 via-green-400 to-lime-400 animate-gradient bg-[length:200%_auto]" style={{
                        filter: 'drop-shadow(0 0 20px rgba(132, 204, 22, 0.8))',
                      }}>
                        <AnimatedText text="TRUCK" />
                      </span>
                    </h1>
                    <p className="text-gray-400 text-label font-bold uppercase tracking-[0.3em] text-center mt-2 sm:mt-3 scroll-fade-in scroll-delay-4">Collect • Dodge • Survive</p>
                 </div>

                 {/* High Score Card */}
                 <div 
                    className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm border-2 border-lime-500/30 p-4 sm:p-5 rounded-2xl w-full flex items-center justify-between mb-6 sm:mb-8 shadow-[0_0_30px_rgba(132,204,22,0.2)] relative overflow-hidden scroll-slide-in scroll-delay-5 flashlight-card"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                      e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                    }}
                 >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-lime-500/10 to-transparent rounded-full blur-2xl"></div>
                    <div className="flex flex-col relative z-10">
                       <span className="text-label text-gray-400 uppercase font-black tracking-[0.2em] mb-1">High Score</span>
                       <span className="text-display-sm font-black bg-clip-text text-transparent bg-gradient-to-r from-lime-400 to-green-400">{highScore}</span>
                    </div>
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-lime-500/20 to-green-500/20 rounded-full flex items-center justify-center border-2 border-lime-500/30 relative z-10">
                      <span className="text-2xl sm:text-3xl">🏆</span>
                    </div>
                 </div>

                 {/* Play Button */}
                 <button 
                    onClick={handleStart}
                    className="w-full min-h-touch py-5 sm:py-6 bg-gradient-to-r from-lime-500 via-green-500 to-lime-500 text-black text-h2 font-black rounded-2xl shadow-[0_0_50px_rgba(132,204,22,0.5)] hover:shadow-[0_0_80px_rgba(132,204,22,0.7)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 sm:gap-3 uppercase tracking-wider relative overflow-hidden group pill-button btn-beam scroll-fade-in scroll-delay-6"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M5 3l14 9-14 9V3z"/>
                    </svg>
                    <span className="relative z-10">Play Now</span>
                  </button>

                  {/* Subtitle */}
                  <p className="text-gray-500 text-body-sm font-medium mt-4 sm:mt-6 text-center scroll-fade-in scroll-delay-7">
                    Drive the gorbage truck & collect trash!
                  </p>

                  {/* Logo Marquee */}
                  <div className="w-full mt-8 sm:mt-12 scroll-fade-in scroll-delay-8">
                    <LogoMarquee />
                  </div>
              </div>
            )}

            {/* Settings Overlay */}
            {isSettingsOpen && (
               <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 safe-area-inset animate-in fade-in duration-300">
                  <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative">
                     <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-touch min-h-touch p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Close"
                     >
                       <X className="w-5 h-5 sm:w-6 sm:h-6" />
                     </button>
                     
                     <h2 className="text-h2 font-black text-center mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-lime-400 to-orange-400">
                        SETTINGS
                     </h2>

                     <div className="space-y-6 sm:space-y-8">
                        {/* Music Slider */}
                        <div className="space-y-2 sm:space-y-3">
                           <div className="flex justify-between text-caption font-bold uppercase tracking-wider text-gray-400">
                              <span>Music</span>
                              <span>{Math.round(musicVolume * 100)}%</span>
                           </div>
                           <input 
                              type="range" 
                              min="0" max="1" step="0.05"
                              value={musicVolume}
                              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                           />
                        </div>

                        {/* SFX Slider */}
                        <div className="space-y-2 sm:space-y-3">
                           <div className="flex justify-between text-caption font-bold uppercase tracking-wider text-gray-400">
                              <span>SFX</span>
                              <span>{Math.round(sfxVolume * 100)}%</span>
                           </div>
                           <input 
                              type="range" 
                              min="0" max="1" step="0.05"
                              value={sfxVolume}
                              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
                           />
                        </div>
                     </div>

                     <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-full min-h-touch mt-8 sm:mt-10 py-3 bg-white/10 hover:bg-white/20 text-white text-body font-bold rounded-xl transition-colors"
                     >
                        CLOSE
                     </button>
                  </div>
               </div>
            )}

            {/* Game Over Screen */}
            {gameState === GameState.GAME_OVER && (
               <div className="relative w-full h-full flex items-center justify-center safe-area-inset">
                  {/* Sticker Background */}
                  <div 
                    className="absolute inset-0 z-0"
                    style={{
                      backgroundImage: 'url("/game-assets/sticker.webp")',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80"></div>
                  </div>

                  <div className="relative z-10 animate-in fade-in zoom-in duration-500 flex flex-col items-center w-full max-w-sm px-4 sm:px-6">
                    {/* Game Over Title with Oscar Behind */}
                    <div className="mb-6 sm:mb-8 text-center relative">
                      {/* Oscar Image (Behind) */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0">
                        <img 
                          src="/game-assets/oscar-game-narrator.png" 
                          alt="Oscar"
                          className="w-44 h-44 sm:w-56 sm:h-56 object-contain opacity-40 drop-shadow-2xl animate-pulse"
                        />
                      </div>
                      
                      {/* Text (In Front) */}
                      <div className="relative z-10">
                        <h2 className="text-display-md sm:text-display-lg font-black mb-2 bg-clip-text text-transparent bg-gradient-to-br from-red-400 via-red-500 to-red-600 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse tracking-tighter">
                          GAME OVER
                        </h2>
                        <p className="text-gray-400 text-caption font-bold uppercase tracking-[0.3em]">Final Stats</p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full mb-6 sm:mb-8">
                      <div 
                        className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border-2 border-white/10 flex flex-col items-center justify-center shadow-2xl transform hover:scale-105 transition-transform flashlight-card"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                          e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                        }}
                      >
                          <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">🎯</div>
                          <span className="text-label text-gray-400 uppercase font-black tracking-widest mb-1 sm:mb-2">Score</span>
                          <span className="text-display-sm sm:text-display-md font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">{score}</span>
                      </div>
                      <div 
                        className="bg-gradient-to-br from-lime-500/20 to-green-500/20 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border-2 border-lime-500/40 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(132,204,22,0.3)] relative overflow-hidden transform hover:scale-105 transition-transform flashlight-card"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                          e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                        }}
                      >
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 bg-lime-400 rounded-full animate-ping"></div>
                          </div>
                          <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">🏆</div>
                          <span className="text-label text-lime-400 uppercase font-black tracking-widest mb-1 sm:mb-2">Best</span>
                          <span className="text-display-sm sm:text-display-md font-black text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.8)]">{highScore}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full space-y-2 sm:space-y-3">
                      <button 
                        onClick={handleStart}
                        className="w-full min-h-touch py-4 sm:py-5 bg-gradient-to-r from-lime-500 via-green-500 to-lime-500 text-black text-h3 sm:text-h2 font-black rounded-2xl shadow-[0_0_40px_rgba(132,204,22,0.4)] hover:shadow-[0_0_60px_rgba(132,204,22,0.6)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 sm:gap-3 uppercase tracking-wider pill-button btn-beam"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                        Play Again
                      </button>
                      
                      <button 
                        onClick={() => setGameState(GameState.MENU)}
                        className="w-full min-h-touch py-3 sm:py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-body font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 uppercase tracking-widest pill-button btn-beam"
                      >
                        Main Menu
                      </button>
                    </div>
                  </div>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
