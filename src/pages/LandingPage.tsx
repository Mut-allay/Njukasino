import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Users, Bot, GraduationCap } from 'lucide-react';
import { hapticFeedback } from '../utils/haptics';
import { useGame } from '../contexts/GameContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { startTutorial } = useGame();

  const handleTutorialClick = async () => {
    hapticFeedback('medium');
    try {
      const newGameId = await startTutorial();
      if (newGameId) {
        navigate(`/game/${newGameId}`);
      }
    } catch {
      // If tutorial fails to start, still try to navigate (backend may handle anonymous players)
      navigate('/sign-up?mode=tutorial');
    }
  };

  const handleMultiplayerClick = () => {
    hapticFeedback('medium');
    navigate('/sign-in');
  };

  const handleCPUSClick = () => {
    hapticFeedback('medium');
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden font-sans">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 overflow-hidden">
        {/* Background with Overlay */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a] z-10" />
            <img 
                src="/images/10013144.jpg" 
                alt="Casino Background" 
                className="w-full h-full object-cover opacity-50"
            />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center mt-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
              NJUKA KING
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Experience the next generation of social card gaming. 
              <span className="text-yellow-400 font-semibold block mt-2">Fair. Fast. Premium.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link 
                to="/sign-up"
                className="group relative px-8 py-4 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full font-bold text-black text-lg shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-all transform hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                   Sign Up & Play <Zap className="w-5 h-5 fill-current" />
                </span>
              </Link>
              
              <Link 
                to="/rules"
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-semibold text-white hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                Learn How to Play
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Welcome Section - Matching HomePage Structure */}
      <section className="py-12 px-4 relative z-10 bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f]">
        <div className="page-container home-page max-w-6xl mx-auto">
          <div className="welcome-section">
            <div className="header-top">
              <h2>Welcome to Njuka King!</h2>
            </div>
            <div className="live-indicator">
              <span className="dot"></span>
              <span>124 Players Online</span>
            </div>
          </div>
        </div>
      </section>

      {/* Game Mode Selection - Matching HomePage Structure */}
      <section className="py-12 px-4 relative z-10 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a]">
        <div className="page-container home-page max-w-6xl mx-auto">
          <div className="new-game-form">
            <div className="game-cards">
              <motion.button
                className="game-card tutorial-card"
                onClick={handleTutorialClick}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="card-content">
                  <div className="icon-box">
                    <GraduationCap size={40} />
                  </div>
                  <div className="text-box">
                    <div className="title-row">
                      <h3>Play Tutorial</h3>
                      <span className="premium-badge">NEW</span>
                    </div>
                    <p>Learn the basics step-by-step</p>
                  </div>
                  <div className="go-icon">
                    <Zap size={20} />
                  </div>
                </div>
                <div className="card-decoration"></div>
              </motion.button>

              <motion.button
                className="game-card multiplayer-card"
                onClick={handleMultiplayerClick}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="card-content">
                  <div className="icon-box">
                    <Users size={40} />
                  </div>
                  <div className="text-box">
                    <h3>Multiplayer</h3>
                    <p>Play with friends online</p>
                  </div>
                  <div className="go-icon">
                    <Zap size={20} />
                  </div>
                </div>
                <div className="card-decoration"></div>
              </motion.button>
              
              <motion.button
                className="game-card cpu-card"
                onClick={handleCPUSClick}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="card-content">
                  <div className="icon-box">
                    <Bot size={40} />
                  </div>
                  <div className="text-box">
                    <h3>Practice vs CPU</h3>
                    <p>Sharpen your skills</p>
                  </div>
                  <div className="go-icon">
                    <Zap size={20} />
                  </div>
                </div>
                <div className="card-decoration"></div>
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/50 text-center text-gray-500 text-sm relative z-10">
        <p>&copy; {new Date().getFullYear()} Njuka King. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-6">
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/responsible-gambling" className="hover:text-white transition-colors">Responsible Gambling</Link>
        </div>
      </footer>
    </div>
  );
};
