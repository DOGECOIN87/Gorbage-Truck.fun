import React, { useState } from 'react';
import { signInWithPopup, signOut, TwitterAuthProvider, User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { LogOut, LogIn } from 'lucide-react';

interface AuthButtonProps {
  user: User | null;
  onAuthStateChange?: (user: User | null) => void;
}

const AuthButton: React.FC<AuthButtonProps> = ({ user, onAuthStateChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new TwitterAuthProvider();
      // Request additional scopes if needed
      provider.addScope('tweet.read');
      
      const result = await signInWithPopup(auth, provider);
      console.log('Signed in with X:', result.user.displayName);
      if (onAuthStateChange) {
        onAuthStateChange(result.user);
      }
    } catch (err: any) {
      console.error('X Sign-in Error:', err);
      setError(err.message || 'Failed to sign in with X');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      if (onAuthStateChange) {
        onAuthStateChange(null);
      }
    } catch (err: any) {
      console.error('Sign-out Error:', err);
      setError(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md px-4 py-3 rounded-xl border border-blue-500/50 w-full text-center">
          <p className="text-sm text-gray-300 uppercase font-bold tracking-wide mb-1">Signed in as</p>
          <p className="text-lg font-black text-blue-400">{user.displayName || user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full min-h-touch py-3 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border-2 border-red-500/50 hover:border-red-500/80 text-red-400 hover:text-red-300 text-body font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="w-4 h-4" />
          {loading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[300px]">
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="w-full min-h-touch py-4 sm:py-5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white text-lg sm:text-xl font-black rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:shadow-[0_0_70px_rgba(59,130,246,0.7)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-wider relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        <LogIn className="w-5 h-5 relative z-10" />
        <span className="relative z-10">{loading ? 'Signing in...' : 'Sign in with X'}</span>
      </button>
      {error && (
        <p className="text-red-400 text-sm text-center font-semibold">{error}</p>
      )}
    </div>
  );
};

export default AuthButton;
