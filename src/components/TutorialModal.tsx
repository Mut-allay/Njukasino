import React from 'react';
import { useGame } from '../contexts/GameContext';
import { ChevronRight, X, Info } from 'lucide-react';
import './TutorialModal.css';

export type TutorialModalProps = Record<string, never>;

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Njuka King!",
    content: "In this guide, we'll teach you the basics. Every player starts with 3 cards.",
    buttonText: "Let's Begin"
  },
  {
    title: "The Goal of the Game",
    content: "Your mission is to form a winning combo of 4 cards. You have two ways to win...",
    buttonText: "Show Patterns"
  },
  {
    title: "Pattern 1: 3-of-a-Kind + 1",
    content: "Three cards of the same rank (like three 7s) plus one card that is consecutive (like an 8).",
    buttonText: "Next Pattern"
  },
  {
    title: "Pattern 2: Pair + 2 Consecutive",
    content: "Two cards of the same rank (a pair) plus two other cards that are consecutive (like 5 and 6).",
    buttonText: "The A/K Rule"
  },
  {
    title: "The A/K Rule",
    content: "Important: Ace and King are NOT consecutive. You cannot use them to form a sequence!",
    buttonText: "Start Playing"
  },
  {
    title: "Drawing a Card",
    content: "It's your turn! Tap the Deck (blinking) to draw your 4th card and start your move.",
    buttonText: "Hide Guide",
    isActionStep: true
  },
  {
    title: "Discarding",
    content: "Now you have 4 cards. Select one to discard. You must always end your turn with 3 cards.",
    buttonText: "Hide Guide",
    isActionStep: true
  },
  {
    title: "The Discard Pile",
    content: "Note: You cannot pick from the discard pile for regular play. It is ONLY for finishing a winning hand!",
    buttonText: "Final Tip"
  },
  {
    title: "Real Money, Real Wins!",
    content: "Njuka King is a real money card game. Deposit funds into your wallet and play against real players for cash prizes. Head to the Wallet page to add funds when you're ready to compete!",
    buttonText: "Got It"
  },
  {
    title: "Tutorial Complete!",
    content: "You're ready to play! Head to Multiplayer to challenge other players for real money.",
    buttonText: "Finish Tutorial"
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = () => {
  const { tutorialStep, nextTutorialStep, isTutorial, endTutorial, isGuideVisible, setGuideVisible } = useGame();

  if (!isTutorial || !isGuideVisible || tutorialStep >= TUTORIAL_STEPS.length) return null;

  const step = TUTORIAL_STEPS[tutorialStep];

  const handleNext = () => {
    if (step.buttonText === "Hide Guide") {
        setGuideVisible(false);
        return;
    }

    if (tutorialStep === TUTORIAL_STEPS.length - 1) {
      endTutorial();
    } else {
      nextTutorialStep();
    }
  };

  return (
    <div className={`tutorial-overlay-container step-${tutorialStep}`}>
      <div className="tutorial-glass-card">
        <div className="tutorial-header">
          <div className="tutorial-icon-box">
            <Info size={20} />
          </div>
          <h3>{step.title}</h3>
          <button className="close-tutorial" onClick={endTutorial}>
            <X size={18} />
          </button>
        </div>
        
        <div className="tutorial-body">
          <p>{step.content}</p>
        </div>

        <div className="tutorial-footer">
          <span className="step-counter">Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}</span>
          <button className="tutorial-next-btn" onClick={handleNext}>
            {step.buttonText}
            {!step.isActionStep && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
