import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Howl, Howler } from 'howler';
import './App.css';
import { GameProvider, useGame } from './contexts/GameContext';
import { EnhancedBottomMenu } from './components/EnhancedBottomMenu';
import LoadingOverlay from './components/LoadingOverlay';

// Lazy load route components
const HomePage = lazy(() => import('./routes/HomePage').then(module => ({ default: module.HomePage })));
const MultiplayerLobbyPage = lazy(() => import('./routes/MultiplayerLobbyPage').then(module => ({ default: module.MultiplayerLobbyPage })));
const CPUGameSetupPage = lazy(() => import('./routes/CPUGameSetupPage').then(module => ({ default: module.CPUGameSetupPage })));
const GameRoomPage = lazy(() => import('./routes/GameRoomPage').then(module => ({ default: module.GameRoomPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const RulesPage = lazy(() => import('./routes/RulesPage').then(module => ({ default: module.RulesPage })));
const NotFoundPage = lazy(() => import('./routes/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const AuthPage = lazy(() => import('./routes/AuthPage').then(module => ({ default: module.AuthPage })));
const SignUpPage = lazy(() => import('./routes/SignUpPage').then(module => ({ default: module.SignUpPage })));

// 🎵 SOUND MANAGER HOOK - Handles all game audio
const useSoundManager = () => {
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    const saved = localStorage.getItem('soundsEnabled');
    return saved === null ? true : saved === 'true';
  });

  // 🎵 Programmatic fallback sound generator with mobile compatibility
  const createFallbackSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();

        // Resume audio context if suspended (required for mobile)
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;

        // Lower volume for mobile
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (error) {
        console.log('Fallback sound generation failed:', error);
      }
    }
  }, []);

  // Sound effect instances - memoized to prevent recreation on every render
  const sounds = useMemo(() => ({
    draw: new Howl({
      src: ['/sounds/draw.mp3', '/sounds/draw.wav'],
      volume: 0.3,
      html5: true,
      onloaderror: () => {
        console.log('Draw sound failed to load, using fallback');
      }
    }),
    discard: new Howl({
      src: ['/sounds/discard.mp3', '/sounds/discard.wav'],
      volume: 0.4,
      html5: true,
      onloaderror: () => console.log('Discard sound failed to load')
    }),
    win: new Howl({
      src: ['/sounds/win.mp3', '/sounds/win.wav'],
      volume: 0.5,
      html5: true,
      onloaderror: () => console.log('Win sound failed to load')
    }),
    button: new Howl({
      src: ['/sounds/button.mp3', '/sounds/button.wav'],
      volume: 0.2,
      html5: true,
      onloaderror: () => console.log('Button sound failed to load')
    }),
    shuffle: new Howl({
      src: ['/sounds/shuffle.mp3', '/sounds/shuffle.wav'],
      volume: 0.3,
      html5: true,
      onloaderror: () => console.log('Shuffle sound failed to load')
    })
  }), []);

  const createFallbackSoundForType = useCallback((soundType: keyof typeof sounds) => {
    try {
      switch (soundType) {
        case 'draw':
          createFallbackSound(800, 0.2, 'sine'); // High bell-like tone
          break;
        case 'discard':
          createFallbackSound(400, 0.3, 'sawtooth'); // Swoosh-like sound
          break;
        case 'shuffle':
          // Multiple quick tones for shuffle effect
          setTimeout(() => createFallbackSound(300, 0.1, 'square'), 0);
          setTimeout(() => createFallbackSound(350, 0.1, 'square'), 100);
          setTimeout(() => createFallbackSound(320, 0.1, 'square'), 200);
          break;
        case 'win':
          // Victory chord progression
          createFallbackSound(523, 0.4, 'sine'); // C
          setTimeout(() => createFallbackSound(659, 0.4, 'sine'), 200); // E
          setTimeout(() => createFallbackSound(784, 0.6, 'sine'), 400); // G
          break;
        case 'button':
          createFallbackSound(1000, 0.1, 'square'); // Quick click
          break;
      }
    } catch (fallbackError) {
      console.log(`Fallback sound also failed for ${soundType}:`, fallbackError);
    }
  }, [createFallbackSound, sounds]);

  const playSound = useCallback((soundType: keyof typeof sounds) => {
    if (soundsEnabled) {
      try {
        const sound = sounds[soundType];
        if (sound.state() === 'loaded') {
          // Try to play the sound
          try {
            sound.play();
          } catch (playError) {
            console.log(`Howl sound failed for ${soundType}, using fallback:`, playError);
            // Use fallback sound
            createFallbackSoundForType(soundType);
          }
        } else {
          // Use programmatic fallback sounds for better cross-device compatibility
          createFallbackSoundForType(soundType);
        }
      } catch (error) {
        console.log(`Failed to play ${soundType} sound:`, error);
        // Always try fallback even if main sound fails
        createFallbackSoundForType(soundType);
      }
    }
  }, [soundsEnabled, sounds, createFallbackSound, createFallbackSoundForType]);

  const toggleSounds = useCallback(() => {
    setSoundsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('soundsEnabled', String(next));
      return next;
    });
  }, []);

  // Enable audio on first user interaction (required for mobile)
  const enableAudio = useCallback(() => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        // Also resume Howler's global context
        if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume();
        }
      } catch (error) {
        console.log('Failed to enable audio:', error);
      }
    }
  }, []);

  return { playSound, soundsEnabled, toggleSounds, enableAudio };
};

function App() {
  const { playSound, soundsEnabled, toggleSounds, enableAudio } = useSoundManager();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');

  // Persist player name to localStorage
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  // Enable audio on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      enableAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [enableAudio]);

  return (
    <GameProvider playerName={playerName} setPlayerName={setPlayerName}>
      <BrowserRouter>
        <AppContent 
          soundsEnabled={soundsEnabled}
          toggleSounds={toggleSounds}
          playSound={playSound}
        />
      </BrowserRouter>
    </GameProvider>
  );
}

interface AppContentProps {
  soundsEnabled: boolean;
  toggleSounds: () => void;
  playSound: (soundType: 'draw' | 'discard' | 'win' | 'button' | 'shuffle') => void;
}

// Separate component to safely use useGame context
function AppContent({ soundsEnabled, toggleSounds, playSound }: AppContentProps) {
  const { playerWallet } = useGame();

  return (
    <div className="App">
      <div className="header-section">
        <h1>Njuka King</h1>
        
        {playerWallet !== null && (
          <div className="global-wallet-pill">
            <span className="wallet-label">WALLET:</span>
            <span className="wallet-amount">K{playerWallet.toLocaleString()}</span>
          </div>
        )}
        
        <div className="auth-container" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <SignedOut>
            <Link to="/sign-in" style={{ 
              textDecoration: 'none', 
              color: 'white', 
              background: 'rgba(255, 255, 255, 0.1)', 
              padding: '0.5rem 1rem', 
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              Sign In
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      <Suspense fallback={<LoadingOverlay isVisible={true} message="Loading..." />}>
        <Routes>
          <Route path="/" element={
            <>
              <SignedOut>
                <LandingPage />
              </SignedOut>
              <SignedIn>
                <HomePage />
              </SignedIn>
            </>
          } />
          <Route path="/multiplayer" element={<MultiplayerLobbyPage />} />
          <Route path="/lobby/:lobbyId" element={<GameRoomPage playSound={playSound} />} />
          <Route path="/cpu" element={<CPUGameSetupPage />} />
          <Route path="/game/:gameId" element={<GameRoomPage playSound={playSound} />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/sign-in" element={<AuthPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <EnhancedBottomMenu
        soundsEnabled={soundsEnabled}
        toggleSounds={toggleSounds}
        playSound={playSound}
      />
    </div>
  );
}

export default App;