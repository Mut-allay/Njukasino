import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Bot, GraduationCap, Zap, Heart, Shield, Sparkles } from 'lucide-react';
import { hapticFeedback } from '../utils/haptics';

export const LandingPage = () => {
  const navigate = useNavigate();

  const handleGameModeClick = (mode: 'tutorial' | 'multiplayer' | 'cpu') => {
    hapticFeedback('medium');
    
    if (mode === 'tutorial') {
      // Route to tutorial game without requiring name entry
      navigate('/game/tutorial');
    } else if (mode === 'multiplayer' || mode === 'cpu') {
      // Route to sign-in page
      navigate('/sign-in');
    }
  };

  const handleSignUp = () => {
    hapticFeedback('medium');
    navigate('/sign-up');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  const featureIcons = [
    { Icon: Heart, label: 'Thrilling' },
    { Icon: Shield, label: 'Secure' },
    { Icon: Sparkles, label: 'Premium' },
  ];

  return (
    <div className="landing-page-container">
      {/* Hero Section with Background */}
      <div className="landing-hero-section">
        <div className="hero-background"></div>
        <div className="hero-overlay"></div>
        
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <motion.div
            className="hero-title-wrapper"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="hero-pre-title">
              Welcome to the Ultimate
            </motion.div>
            
            <motion.h1
              className="hero-title"
              variants={itemVariants}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.8,
                ease: 'easeOut',
              }}
            >
              NJUKA KING
            </motion.h1>

            <motion.p
              className="hero-subtitle"
              variants={itemVariants}
            >
              Master the legendary card game. Play solo, challenge friends, or compete globally.
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              className="feature-pills"
              variants={itemVariants}
            >
              {featureIcons.map(({ Icon, label }, idx) => (
                <motion.div
                  key={idx}
                  className="feature-pill"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Game Mode Selection */}
      <motion.div
        className="landing-game-modes"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
      >
        <div className="modes-header">
          <h2>Choose Your Adventure</h2>
          <p>Pick how you want to play</p>
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
            transition={{ duration: 0.6, delay: 0.5 }}
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
            transition={{ duration: 0.6, delay: 0.6 }}
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

          {/* CPU Practice Card */}
          <motion.button
            className="landing-game-card cpu-card"
            onClick={() => handleGameModeClick('cpu')}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div className="card-bg-accent cpu-accent"></div>
            <div className="card-inner">
              <div className="card-icon cpu-icon">
                <Bot size={40} />
              </div>
              <div className="card-text">
                <h3>Practice vs CPU</h3>
                <p>Hone your skills against AI opponents</p>
                <span className="card-badge">Sign In Required</span>
              </div>
              <div className="card-arrow">
                <Zap size={20} />
              </div>
            </div>
            <div className="card-border"></div>
          </motion.button>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        className="landing-cta-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
      >
        <div className="cta-content">
          <h2>Ready to Become a Legend?</h2>
          <p>Join thousands of players and master Njuka King today</p>
          <motion.button
            className="premium-cta-btn"
            onClick={handleSignUp}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up & Play
            <Zap size={18} />
          </motion.button>
        </div>
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
