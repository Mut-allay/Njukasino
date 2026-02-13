import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Zap } from 'lucide-react';
import { hapticFeedback } from '../utils/haptics';

export const LandingPage = () => {
  const navigate = useNavigate();

  const handleGameModeClick = (mode: 'tutorial' | 'multiplayer') => {
    hapticFeedback('medium');

    if (mode === 'tutorial') {
      navigate('/game/tutorial');
    } else {
      navigate('/sign-in');
    }
  };

  const handleSignUp = () => {
    hapticFeedback('medium');
    navigate('/sign-up');
  };

  const handleSignIn = () => {
    hapticFeedback('medium');
    navigate('/sign-in');
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  return (
    <div className="landing-page-container">
      {/* Compact Hero Section */}
      <div className="landing-hero-section landing-hero-compact">
        <div className="hero-background"></div>
        <div className="hero-overlay"></div>

        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.h1
            className="hero-title"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            NJUKA KING
          </motion.h1>
        </motion.div>
      </div>

      {/* Game Mode Selection */}
      <motion.div
        className="landing-game-modes"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      >
        <div className="modes-header">
          <h2>Choose Your Adventure</h2>
        </div>

        <div className="game-modes-grid">
          {/* Tutorial Card */}
          <motion.button
            className="landing-game-card tutorial-card"
            onClick={() => handleGameModeClick('tutorial')}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="card-bg-accent tutorial-accent"></div>
            <div className="card-inner">
              <div className="card-icon tutorial-icon">
                <GraduationCap size={40} />
              </div>
              <div className="card-text">
                <h3>Play Tutorial</h3>
                <p>Learn the game and master the rules</p>
                <span className="card-badge">Free to Play</span>
              </div>
              <div className="card-arrow">
                <Zap size={20} />
              </div>
            </div>
            <div className="card-border"></div>
          </motion.button>

          {/* Multiplayer Card */}
          <motion.button
            className="landing-game-card multiplayer-card"
            onClick={() => handleGameModeClick('multiplayer')}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="card-bg-accent multiplayer-accent"></div>
            <div className="card-inner">
              <div className="card-icon multiplayer-icon">
                <Users size={40} />
              </div>
              <div className="card-text">
                <h3>Multiplayer</h3>
                <p>Play with friends and climb the ranks</p>
                <span className="card-badge">Sign In Required</span>
              </div>
              <div className="card-arrow">
                <Zap size={20} />
              </div>
            </div>
            <div className="card-border"></div>
          </motion.button>
        </div>

        {/* Inline CTA */}
        <motion.div
          className="landing-inline-cta"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.button
            className="premium-cta-btn"
            onClick={handleSignUp}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up & Play
            <Zap size={18} />
          </motion.button>
          <motion.button
            className="secondary-cta-btn"
            onClick={handleSignIn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Already have an account? Sign In
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>About</h4>
            <p>Njuka King is the premier card game platform where strategy meets thrill.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/rules">Game Rules</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <p>Join our thriving community of players worldwide.</p>
          </div>
        </div>
        <div className="footer-divider"></div>
        <div className="footer-bottom">
          <p>&copy; 2026 Njuka King. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <span>•</span>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
