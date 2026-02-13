// src/pages/Onboarding.tsx

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Check, AlertCircle } from 'lucide-react';
import './Onboarding.css';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
}

export const Onboarding = () => {
  const navigate = useNavigate();
  const { currentUser, refreshUserData } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [username, setUsername] = useState('');
  const [isOver18, setIsOver18] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Validation states
  const [usernameValidation, setUsernameValidation] = useState<ValidationResult>({
    isValid: false,
    message: ''
  });
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stepErrors, setStepErrors] = useState<{ [key: number]: string }>({});

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Create Your Username',
      description: 'Choose a unique username to represent you in the game'
    },
    {
      id: 2,
      title: 'Age Verification',
      description: 'Confirm that you meet the age requirement'
    },
    {
      id: 3,
      title: 'Accept Terms',
      description: 'Review and accept our terms and policies'
    }
  ];

  // Validate username format and uniqueness
  const validateUsername = useCallback(async (value: string): Promise<ValidationResult> => {
    if (!value.trim()) {
      return { isValid: false, message: '' };
    }

    // Check format: 3-20 chars, letters/numbers/underscores/hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]{3,10}$/;
    if (!usernameRegex.test(value)) {
      return {
        isValid: false,
        message: 'Username must be 3-10 characters (letters, numbers, _, -)'
      };
    }

    // Check uniqueness in Firestore
    try {
      setCheckingUsername(true);
      const q = query(
        collection(db, 'users'),
        where('username', '==', value.toLowerCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.size > 0) {
        return { isValid: false, message: 'Username already taken' };
      }

      return { isValid: true, message: 'Available' };
    } catch (err) {
      const error = err as Error & { code?: string };
      console.error('Username validation error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'permission-denied') {
        return { 
          isValid: false, 
          message: 'Unable to check availability right now. Please try again later.' 
        };
      }
      
      // Generic error for other cases
      return { 
        isValid: false, 
        message: 'Error checking username. Please try a different one.' 
      };
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  // Handle username input with debounced validation
  useEffect(() => {
    if (!username.trim()) {
      setUsernameValidation({ isValid: false, message: '' });
      return;
    }

    const timer = setTimeout(() => {
      validateUsername(username).then(setUsernameValidation);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, validateUsername]);

  const validateStep = (stepId: number): boolean => {
    const errors: { [key: number]: string } = {};

    if (stepId === 1) {
      if (!usernameValidation.isValid) {
        errors[1] = usernameValidation.message || 'Please enter a valid username';
      }
    } else if (stepId === 2) {
      if (!isOver18) {
        errors[2] = 'You must be 18+ to play';
      }
    } else if (stepId === 3) {
      if (!acceptedTerms) {
        errors[3] = 'You must accept the terms and policies';
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError('');
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3) || !currentUser) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Update user document in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username: username.toLowerCase(),
        isOver18: true,
        acceptedTerms: true,
        onboarded: true,
        onboardedAt: new Date().toISOString()
      });

      // Optional: Refresh user data locally (onSnapshot should handle this automatically)
      await refreshUserData();

      // Navigate to home (onSnapshot will update userData.onboarded immediately)
      navigate('/');
    } catch (err) {
      console.error('Onboarding submission error:', err);
      setError('Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-page-container">
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="onboarding-progress">
          <div className="progress-steps">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`progress-dot ${
                  step.id < currentStep
                    ? 'completed'
                    : step.id === currentStep
                      ? 'active'
                      : 'pending'
                }`}
              >
                {step.id < currentStep ? <Check size={16} /> : step.id}
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Header */}
        <div className="onboarding-header">
          <h1 className="onboarding-title">
            {steps[currentStep - 1]?.title}
          </h1>
          <p className="onboarding-subtitle">
            {steps[currentStep - 1]?.description}
          </p>
        </div>

        {/* Error Message */}
        {(error || stepErrors[currentStep]) && (
          <div className="onboarding-error-box">
            <AlertCircle size={20} />
            <p>{error || stepErrors[currentStep]}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="onboarding-content">
          {currentStep === 1 && (
            <div className="step-content">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <div className="username-input-wrapper">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., njuka_king_99"
                  disabled={isSubmitting}
                  className="form-input"
                  maxLength={20}
                />
                {username && (
                  <span
                    className={`validation-badge ${
                      usernameValidation.isValid ? 'valid' : 'invalid'
                    }`}
                  >
                    {checkingUsername ? '...' : usernameValidation.message}
                  </span>
                )}
              </div>
              <p className="input-hint">
                3-10 characters: letters, numbers, underscores, hyphens
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <div className="checkbox-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isOver18}
                    onChange={(e) => setIsOver18(e.target.checked)}
                    disabled={isSubmitting}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">I am 18 years or older</span>
                </label>
              </div>
              <div className="warning-box">
                <AlertCircle size={20} />
                <p>
                  Must be 18+ to play. Gambling can be addictive — play
                  responsibly.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-content">
              <div className="checkbox-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    disabled={isSubmitting}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">
                    I accept the{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/responsible-gambling"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Responsible Gambling Policy
                    </a>
                  </span>
                </label>
              </div>
              <p className="step-info">
                By accepting, you agree to play responsibly and within your
                means.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="onboarding-buttons">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="btn-secondary"
          >
            Back
          </button>

          {currentStep === steps.length ? (
            <button
              onClick={handleSubmit}
              disabled={!acceptedTerms || isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Completing...' : 'Complete Onboarding'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !usernameValidation.isValid) ||
                isSubmitting
              }
              className="btn-primary"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
