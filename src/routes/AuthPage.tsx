import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import './AuthPage.css';

export const AuthPage = () => {
  const navigate = useNavigate();
  const { signInWithPhonePassword, error: authError, loading } = useAuth();

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });

  const [countryCode, setCountryCode] = useState('+260');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setFormError('');
  };

  const validateForm = (): boolean => {
    if (!formData.phone.trim()) {
      setFormError('Phone number is required');
      return false;
    }

    if (formData.phone.length < 9) {
      setFormError('Phone number must be at least 9 digits');
      return false;
    }

    if (!formData.password) {
      setFormError('Password is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = `${countryCode}${formData.phone}`;
      await signInWithPhonePassword(fullPhone, formData.password);

      // Redirect to home page on success
      navigate('/');
    } catch (err) {
      // Error is already set by AuthContext
      console.error('Sign in error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = formError || authError;

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">SIGN IN</h1>
          <p className="auth-subtitle">Welcome back! Please sign in to continue.</p>
        </div>

        {displayError && (
          <div className="auth-error-box">
            <span className="error-icon">⚠️</span>
            <p>{displayError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Phone Number */}
          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone Number
            </label>
            <div className="phone-input-wrapper">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                disabled={isSubmitting}
                className="country-code-select"
              >
                <option value="+260">🇿🇲 Zambia (+260)</option>
                <option value="+1">🇺🇸 USA/Canada (+1)</option>
                <option value="+44">🇬🇧 UK (+44)</option>
                <option value="+91">🇮🇳 India (+91)</option>
                <option value="+27">🇿🇦 South Africa (+27)</option>
                <option value="+234">🇳🇬 Nigeria (+234)</option>
              </select>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="9 74 46 40 60"
                disabled={isSubmitting}
                className="phone-number-input"
              />
            </div>
            <p className="form-hint">Enter digits only (without spaces or dashes)</p>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                disabled={isSubmitting}
                className="form-input password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="password-toggle"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="auth-button"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Sign Up Link */}
          <p className="signup-link">
            Don't have an account? <a href="/sign-up">Sign Up</a>
          </p>
        </form>
      </div>
    </div>
  );
};
