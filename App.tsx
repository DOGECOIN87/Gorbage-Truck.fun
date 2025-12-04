
import React, { useState, useEffect, useMemo } from 'react';
import GameRunner from './components/GameRunner';
import { GameState } from './types';
import { Settings, X } from 'lucide-react';

// Helper to get time of day
const getTimeOfDay = (): 'day' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  // Night: 8pm (20) to 6am
  if (hour >= 20 || hour < 6) return 'night';
  // Evening: 5pm (17) to 8pm (20)
  if (hour >= 17 && hour < 20) return 'evening';
  // Day: 6am to 5pm (17)
  return 'day';
};

// Background color schemes for each time of day
const timeThemes = {
  day: {
    skyGradient: 'linear-gradient(180deg, #1e40af 0%, #60a5fa 50%, #374151 100%)',
    overlayColor: 'rgba(30, 64, 175, 0.6)',
    accentGlow: 'rgba(96, 165, 250, 0.3)'
  },
  evening: {
    skyGradient: 'linear-gradient(180deg, #7c2d12 0%, #fb923c 50%, #431407 100%)',
    overlayColor: 'rgba(124, 45, 18, 0.6)',
    accentGlow: 'rgba(251, 146, 60, 0.3)'
  },
  night: {
    skyGradient: 'linear-gradient(180deg, #0f172a 0%, #312e81 50%, #1e1b4b 100%)',
    overlayColor: 'rgba(15, 23, 42, 0.8)',
    accentGlow: 'rgba(153, 69, 255, 0.3)'
  }
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
  
  // Time of day for themed background
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const theme = timeThemes[timeOfDay];

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
            <div className="flex justify-between items-start p-6 bg-gradient-to-b from-black/80 to-transparent">
              {/* Score, Lives & Multiplier - all on left side */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#14F195]/30 shadow-lg shadow-[#14F195]/10">
                  <span className="text-xl">♻️</span>
                  <span className="text-2xl font-black font-sans tracking-wide text-[#14F195]">{(score / 100).toFixed(2)} GOR</span>
                </div>
                {/* Lives - under GOR */}
                <div className="flex gap-1.5">
                  {[...Array(3)].map((_, i) => (
                    <svg 
                      key={i}
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill={i < lives ? "#ef4444" : "none"} 
                      stroke={i < lives ? "#ef4444" : "#4b5563"}
                      strokeWidth="2.5" 
                      className={`drop-shadow transition-all ${i < lives ? 'scale-100' : 'scale-75 opacity-40'}`}
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                  ))}
                </div>
                {multiplier > 1 && (
                  <div className="self-start px-3 py-1 bg-[#9945FF] text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg shadow-purple-500/40 animate-pulse">
                    Combo x{multiplier}
                  </div>
                )}
              </div>
              
              {/* Gorbag Wallet - top right */}
              <div className="pointer-events-auto">
                <img 
                  src="/assets/gorbag-wallet-button.png" 
                  alt="Gorbag Wallet"
                  className="w-16 h-16 object-contain drop-shadow-lg"
                />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pb-10 px-8 flex justify-between w-full pointer-events-auto">
              <button 
                className="w-24 h-24 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center active:bg-[#14F195]/20 active:border-[#14F195] transition-all active:scale-95 touch-manipulation shadow-xl"
                onPointerDown={() => (window as any).gameMoveLeft && (window as any).gameMoveLeft()}
                aria-label="Move Left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button 
                className="w-24 h-24 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center active:bg-[#14F195]/20 active:border-[#14F195] transition-all active:scale-95 touch-manipulation shadow-xl"
                onPointerDown={() => (window as any).gameMoveRight && (window as any).gameMoveRight()}
                aria-label="Move Right"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            
            {/* Instructional Text */}
            <div className="absolute bottom-36 w-full text-center pointer-events-none">
              <span className="text-[#14F195] text-xs font-bold uppercase tracking-[0.2em] animate-pulse opacity-80">Swipe to Move</span>
            </div>
          </div>
        )}

        {/* --- Menus --- */}
        {(gameState === GameState.MENU || gameState === GameState.GAME_OVER) && (
          <div 
            className="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-sm text-white p-6"
            style={{
              backgroundImage: 'url(/assets/background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            
            {/* Time-based overlay for depth */}
            <div 
              className="absolute inset-0 z-[-1]"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              }}
            ></div>
            
            {/* Animated stars for night, sun rays for day/evening */}
            <div className="absolute inset-0 z-[-1] overflow-hidden">
              {timeOfDay === 'night' && (
                <>
                  {[...Array(30)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute bg-white rounded-full animate-pulse"
                      style={{
                        width: `${Math.random() * 3 + 1}px`,
                        height: `${Math.random() * 3 + 1}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 60}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        opacity: Math.random() * 0.8 + 0.2
                      }}
                    />
                  ))}
                </>
              )}
              {timeOfDay === 'evening' && (
                <div 
                  className="absolute w-32 h-32 rounded-full blur-3xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, transparent 70%)',
                    top: '10%',
                    left: '20%'
                  }}
                />
              )}
              {timeOfDay === 'day' && (
                <div 
                  className="absolute w-40 h-40 rounded-full blur-3xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(250, 250, 210, 0.6) 0%, transparent 70%)',
                    top: '5%',
                    right: '15%'
                  }}
                />
              )}
            </div>
            
            {/* City silhouette at bottom */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-32 z-[-1]"
              style={{
                background: timeOfDay === 'day' 
                  ? 'linear-gradient(0deg, #374151 0%, #374151 60%, transparent 100%)'
                  : timeOfDay === 'evening'
                  ? 'linear-gradient(0deg, #431407 0%, #431407 60%, transparent 100%)'
                  : 'linear-gradient(0deg, #1e1b4b 0%, #1e1b4b 60%, transparent 100%)'
              }}
            >
              {/* Building silhouettes */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end">
                {[40, 60, 35, 70, 45, 55, 30, 65, 50, 40, 55, 35].map((h, i) => (
                  <div
                    key={i}
                    className="opacity-50"
                    style={{
                      width: `${20 + Math.random() * 20}px`,
                      height: `${h}px`,
                      backgroundColor: timeOfDay === 'night' ? '#0f172a' : '#1f2937'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Intro Screen */}
            {gameState === GameState.MENU && !isSettingsOpen && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-sm relative">
                 
                 {/* Settings Button */}
                 <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="absolute -top-16 right-0 p-2 text-white/50 hover:text-[#14F195] transition-colors"
                 >
                   <Settings size={28} />
                 </button>

                 <div className="mb-12 relative animate-float">
                    <div className="absolute -inset-4 bg-gradient-to-r from-[#14F195] to-[#9945FF] opacity-30 blur-2xl rounded-full"></div>
                    <h1 className="relative text-5xl md:text-6xl font-black text-center leading-tight tracking-tight">
                      <span className="block text-white">GORBAGE</span>
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#14F195] to-[#9945FF]">TRUCK RUSH</span>
                    </h1>
                 </div>

                 <div className="bg-gray-900/90 border border-white/10 p-4 rounded-2xl w-full flex items-center justify-between mb-8 shadow-2xl">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">High Score</span>
                       <span className="text-xl font-bold text-[#14F195]">{highScore}</span>
                    </div>
                    <div className="h-10 w-10 bg-[#14F195]/10 rounded-full flex items-center justify-center text-[#14F195]">🏆</div>
                 </div>

                 <button 
                    onClick={handleStart}
                    className="w-full py-5 bg-gradient-to-r from-[#14F195] to-[#10b981] text-black font-black text-xl rounded-xl shadow-[0_0_40px_rgba(20,241,149,0.3)] hover:shadow-[0_0_60px_rgba(20,241,149,0.5)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                  >
                    PLAY NOW
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
                  </button>
              </div>
            )}

            {/* Settings Overlay */}
            {isSettingsOpen && (
               <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                  <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
                     <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                     >
                       <X size={24} />
                     </button>
                     
                     <h2 className="text-2xl font-black text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[#14F195] to-[#9945FF]">
                        SETTINGS
                     </h2>

                     <div className="space-y-8">
                        {/* Music Slider */}
                        <div className="space-y-3">
                           <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-gray-400">
                              <span>Music</span>
                              <span>{Math.round(musicVolume * 100)}%</span>
                           </div>
                           <input 
                              type="range" 
                              min="0" max="1" step="0.05"
                              value={musicVolume}
                              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#9945FF]"
                           />
                        </div>

                        {/* SFX Slider */}
                        <div className="space-y-3">
                           <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-gray-400">
                              <span>SFX</span>
                              <span>{Math.round(sfxVolume * 100)}%</span>
                           </div>
                           <input 
                              type="range" 
                              min="0" max="1" step="0.05"
                              value={sfxVolume}
                              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#14F195]"
                           />
                        </div>
                     </div>

                     <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-full mt-10 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                     >
                        CLOSE
                     </button>
                  </div>
               </div>
            )}

            {/* Game Over Screen */}
            {gameState === GameState.GAME_OVER && (
               <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center w-full max-w-sm">
                  <div className="text-red-500 font-black text-3xl mb-6 uppercase tracking-widest drop-shadow-lg">Wasted</div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className="bg-gray-900/90 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Score</span>
                        <span className="text-3xl font-bold text-white">{score}</span>
                    </div>
                    <div className="bg-gray-900/90 p-5 rounded-2xl border border-[#14F195]/30 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1">
                          <div className="w-2 h-2 bg-[#14F195] rounded-full animate-ping"></div>
                        </div>
                        <span className="text-[10px] text-[#14F195] uppercase font-bold tracking-widest mb-1">Best</span>
                        <span className="text-3xl font-bold text-[#14F195]">{highScore}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleStart}
                    className="w-full py-4 bg-white text-black text-lg font-bold rounded-xl shadow-lg hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 mb-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                    REPLAY
                  </button>
                  
                  <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    Return to Menu
                  </button>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
