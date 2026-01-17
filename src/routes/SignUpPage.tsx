import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import './SignUpPage.css';

export const SignUpPage = () => {
  const navigate = useNavigate();
  const { signUpWithPhonePassword, error: authError, loading } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [countryCode, setCountryCode] = useState('+260');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
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
      await signUpWithPhonePassword(
        fullPhone,
        formData.password,
        formData.firstName,
        formData.lastName
      );

      // Redirect to onboarding page on success (new users must onboard first)
      navigate('/onboarding');
    } catch (err) {
      // Error is already set by AuthContext
      console.error('Sign up error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = formError || authError;

  return (
    <div className="signup-page-container">
      <div className="signup-card">
        <div className="signup-header">
          <h1 className="signup-title">CREATE YOUR ACCOUNT</h1>
          <p className="signup-subtitle">Welcome! Please fill in the details to get started.</p>
        </div>

        {displayError && (
          <div className="signup-error-box">
            <span className="error-icon">⚠️</span>
            <p>{displayError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="signup-form">
          {/* First Name (Optional) */}
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">
              First Name <span className="optional">(Optional)</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Enter your first name"
              disabled={isSubmitting}
              className="form-input"
            />
          </div>

          {/* Last Name (Optional) */}
          <div className="form-group">
            <label htmlFor="lastName" className="form-label">
              Last Name <span className="optional">(Optional)</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Enter your last name"
              disabled={isSubmitting}
              className="form-input"
            />
          </div>

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
                placeholder="Enter a strong password"
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

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter your password"
                disabled={isSubmitting}
                className="form-input password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
                className="password-toggle"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="signup-button"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Sign In Link */}
          <p className="signin-link">
            Already have an account? <a href="/sign-in">Sign In</a>
          </p>
        </form>
      </div>
    </div>
  );
};
