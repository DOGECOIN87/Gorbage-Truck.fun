
import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, twitterProvider } from './utils/firebase';
import GameRunner from './components/GameRunner';
import AuthButton from './components/AuthButton';
import { GameState } from './types';
import { Settings, X } from 'lucide-react';
import { saveScoreToFirestore, getUserHighScore } from './utils/scoreManager';

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
    { src: '/gorbage_truck_images/gorbagio_1071.png', alt: 'Gorbagio #1071' },
    { src: '/gorbage_truck_images/gorbagio_3340.png', alt: 'Gorbagio #3340' },
    { src: '/gorbage_truck_images/gorbagio_3494.png', alt: 'Gorbagio #3494' },
    { src: '/gorbage_truck_images/gorbagio_4103.png', alt: 'Gorbagio #4103' },
  ];

  return (
    <div className="marquee-container marquee-mask marquee-slow py-8">
      <div className="marquee-content">
        {[...logos, ...logos].map((logo, index) => (
          <div key={index} className="marquee-item">
            <img 
              src={logo.src} 
              alt={logo.alt} 
              className="h-20 w-20 object-cover rounded-xl opacity-70 hover:opacity-100 transition-all hover:scale-110 border-2 border-lime-500/20 hover:border-lime-500/60"
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user's high score from Firestore
        const userHighScore = await getUserHighScore();
        setHighScore(userHighScore);
      } else {
        // Fallback to localStorage if not authenticated
        const stored = localStorage.getItem('recycleRushHighScore');
        if (stored) setHighScore(parseInt(stored, 10));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGameOver = async (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      
      // Save to Firestore if authenticated
      if (user) {
        const saved = await saveScoreToFirestore(finalScore);
        if (saved) {
          console.log('Score saved to Firestore');
        }
      } else {
        // Fallback to localStorage if not authenticated
        localStorage.setItem('recycleRushHighScore', finalScore.toString());
      }
    }
  };

  const handleStart = () => {
    // No sign-in required to play
    if (!user) {
      console.log('Playing without signing in - scores will be saved locally');
    }
    setGameState(GameState.PLAYING);
    setScore(0);
    setLives(3);
    setMultiplier(1);
    setIsSettingsOpen(false);
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, twitterProvider);
    } catch (error) {
      console.error("Error signing in with Twitter", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleAuthStateChange = (newUser: User | null) => {
    setUser(newUser);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden font-sans select-none flex justify-center items-center">
      
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

        {gameState === GameState.PLAYING && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20">
            {/* ... HUD ... */}
          </div>
        )}

        {(gameState === GameState.MENU || gameState === GameState.GAME_OVER) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white p-4 sm:p-6 safe-area-inset">
            
            <div 
              className="absolute inset-0 z-[-1] opacity-40 bg-clip-reveal"
              style={{
                backgroundImage: 'url("assets/intro_bg_new.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            ></div>

            {gameState === GameState.MENU && !isSettingsOpen && (
              <div className="flex flex-col items-center justify-center w-full h-full max-w-md relative px-6">

                 {user ? (
                   <div className="absolute top-6 left-6 flex items-center gap-2 scroll-fade-in scroll-delay-1 z-20">
                      <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-10 h-10 rounded-full border-2 border-lime-500/50" />
                      <div className="flex flex-col">
                        <span className="text-body-sm font-bold text-white">{user.displayName}</span>
                        <button onClick={handleSignOut} className="text-xs text-red-500 hover:underline">Sign Out</button>
                      </div>
                   </div>
                 ) : (
                  <div className="absolute top-6 left-6 flex items-center gap-2 scroll-fade-in scroll-delay-1 z-20">
                    <div className="flex items-center gap-2 bg-gradient-to-br from-lime-500/20 to-green-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border-2 border-lime-500/50 shadow-[0_0_25px_rgba(132,204,22,0.4)]">
                      <span className="text-base">🏆</span>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-lime-400/70 uppercase font-black tracking-widest leading-none">Best</span>
                        <span className="text-body-sm font-black text-lime-400 leading-none mt-0.5">{highScore}</span>
                      </div>
                    </div>
                  </div>
                 )}

                 <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="absolute top-6 right-6 min-w-touch min-h-touch p-2.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-white/70 hover:text-lime-400 hover:border-lime-400/50 transition-all hover:scale-110 scroll-fade-in scroll-delay-1 z-20"
                   aria-label="Settings"
                 >
                   <Settings className="w-5 h-5" />
                 </button>

                 <div className="flex flex-col items-center w-full">
                   <div className="relative scroll-blur-in scroll-delay-2 -mt-[20rem]">
                      <div className="absolute -inset-10 bg-gradient-to-r from-lime-500 via-orange-500 to-lime-500 opacity-30 blur-3xl rounded-full animate-pulse"></div>
                      <h1 className="relative text-center">
                        <span className="block text-[4.5rem] sm:text-[5.5rem] md:text-[6.5rem] font-black tracking-tight leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] animate-float" style={{
                          textShadow: '0 0 40px rgba(132, 204, 22, 0.8), 0 0 80px rgba(249, 115, 22, 0.6)',
                        }}>
                          <AnimatedText text="GORBAGE" />
                        </span>
                        
                        <span className="block text-[2rem] sm:text-[2.5rem] md:text-[3rem] font-black leading-none text-lime-400 -mt-1" style={{
                          filter: 'drop-shadow(0 0 20px rgba(132, 204, 22, 0.9))',
                          letterSpacing: '0.35em',
                          paddingLeft: '0.35em'
                        }}>
                          <AnimatedText text="TRUCK GAME" />
                        </span>
                      </h1>
                      
                      <p className="text-gray-400 text-sm sm:text-base md:text-lg font-bold uppercase tracking-[0.3em] text-center mt-5 scroll-fade-in scroll-delay-4 drop-shadow-lg">
                        Collect • Dodge • Survive
                      </p>
                   </div>
                 </div>

                 <div className="absolute bottom-56 sm:bottom-60 left-0 right-0 w-full flex flex-col items-center px-6 scroll-fade-in scroll-delay-4">
                   {loading ? (
                     <div className="text-gray-400 text-sm font-semibold">Loading...</div>
                   ) : (
                     <AuthButton user={user} onAuthStateChange={handleAuthStateChange} />
                   )}
                 </div>

                 <div className="absolute bottom-24 sm:bottom-28 left-0 right-0 w-full flex flex-col items-center space-y-4 px-6 scroll-fade-in scroll-delay-5">
                    <button 
                      onClick={handleStart}
                      className="w-full max-w-[300px] min-h-touch py-4 sm:py-5 bg-gradient-to-r from-lime-500 via-green-500 to-lime-500 text-black text-lg sm:text-xl md:text-2xl font-black rounded-2xl shadow-[0_0_60px_rgba(132,204,22,0.6)] hover:shadow-[0_0_90px_rgba(132,204,22,0.8)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-wider relative overflow-hidden group pill-button btn-beam"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M5 3l14 9-14 9V3z"/>
                      </svg>
                      <span className="relative z-10">Play Now</span>
                    </button>

                    <p className="text-gray-400 text-base sm:text-lg md:text-xl font-semibold text-center max-w-sm leading-relaxed px-4">
                      {user ? 'Drive the gorbage truck & collect trash!' : 'Sign in with X to save your scores online! (optional)'}
                    </p>
                 </div>

                 <div className="absolute bottom-0 left-0 right-0 w-full scroll-fade-in scroll-delay-7">
                   <LogoMarquee />
                 </div>
              </div>
            )}

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

            {gameState === GameState.GAME_OVER && (
               <div className="relative w-full h-full flex items-center justify-center safe-area-inset">
                  {/* ... Game Over Screen ... */}
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
