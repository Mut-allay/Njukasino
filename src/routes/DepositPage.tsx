import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DepositService } from '../services/depositService';
import { CreditCard, Phone, Lock } from 'lucide-react';
import './DepositPage.css';

const depositService = new DepositService();

interface DepositStep {
  type: 'amount' | 'initiate' | 'verify' | 'success';
}

export const DepositPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [step, setStep] = useState<DepositStep['type']>('amount');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState<'airtel' | 'mtn'>('mtn');
  const [otp, setOtp] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isValidPhone = (p: string) => /^\+260\d{9}$/.test(p) || /^0\d{9}$/.test(p);
  const isValidAmount = (a: string) => {
    const num = parseFloat(a);
    return !isNaN(num) && num > 0 && num <= 20000;
  };

  const handleInitiateDeposit = async () => {
    if (!amount || !isValidAmount(amount)) {
      setError('Please enter an amount between K1 and K20,000');
      return;
    }
    if (!phone || !isValidPhone(phone)) {
      setError('Please enter a valid phone number (+260712345678 or 0712345678)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await depositService.initiateDeposit({
        amount: parseFloat(amount),
        phone,
        operator,
        uid: currentUser?.uid,
      });

      setReference(response.reference);
      setSuccessMessage(`OTP sent to ${phone}. Check your phone for the code.`);
      setStep('verify');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initiate deposit';
      setError(errorMsg);
      console.error('Deposit initiation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDeposit = async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter the OTP code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await depositService.verifyDeposit({
        reference,
        otp,
        uid: currentUser?.uid,
      });

      setSuccessMessage(response.message);
      setStep('success');
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/home');
      }, 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid OTP or reference';
      setError(errorMsg);
      console.error('Deposit verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deposit-page">
      <div className="deposit-container">
        <div className="deposit-header">
          <h1>💰 Add Money to Wallet</h1>
          <p>Quick and secure mobile money deposits</p>
        </div>

        {step === 'amount' && (
          <div className="deposit-form">
            <div className="form-group">
              <label>Amount (Zambian Kwacha)</label>
              <div className="input-wrapper">
              <span className="currency">K</span>
                <input
                  type="number"
                  placeholder="Enter amount (K1 - K20.000)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  min="1"
                  max="20000"
                  className="form-input"
                />
                {/* <span className="currency">K</span> */}
              </div>
              <div className="quick-amounts">
                {[2, 50, 500, 1000].map((quick) => (
                  <button
                    key={quick}
                    className="quick-amount-btn"
                    onClick={() => setAmount(quick.toString())}
                    type="button"
                  >
                    K{(quick / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Mobile Operator</label>
              <div className="operator-selector">
                {['mtn', 'airtel'].map((op) => (
                  <button
                    key={op}
                    className={`operator-btn ${operator === op ? 'active' : ''}`}
                    onClick={() => setOperator(op as 'airtel' | 'mtn')}
                    type="button"
                  >
                    {op.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-wrapper">
                <Phone size={20} className="input-icon" />
                <input
                  type="tel"
                  placeholder="+260712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="form-input"
                />
              </div>
              <div className="help-text">Format: +260712345678 or 0712345678</div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            <button
              onClick={handleInitiateDeposit}
              disabled={loading || !amount || !phone}
              className="deposit-btn primary"
            >
              {loading ? 'Processing...' : 'Send OTP'}
            </button>

            <button
              onClick={() => navigate('/home')}
              disabled={loading}
              className="deposit-btn secondary"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="deposit-form verify-form">
            <div className="verification-info">
              <Lock size={48} className="lock-icon" />
              <h2>Verify Your Deposit</h2>
              <p>Enter the OTP code sent to <strong>{phone}</strong></p>
              <div className="deposit-summary">
                <div className="summary-item">
                  <span>Amount:</span>
                  <strong>K{parseFloat(amount).toLocaleString()}</strong>
                </div>
                <div className="summary-item">
                  <span>Operator:</span>
                  <strong>{operator.toUpperCase()}</strong>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>OTP Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                disabled={loading}
                maxLength={6}
                className="form-input otp-input"
                autoComplete="off"
              />
              <div className="help-text">Check your SMS for the code</div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              onClick={handleVerifyDeposit}
              disabled={loading || otp.length < 4}
              className="deposit-btn primary"
            >
              {loading ? 'Verifying...' : 'Verify & Deposit'}
            </button>

            <button
              onClick={() => setStep('amount')}
              disabled={loading}
              className="deposit-btn secondary"
            >
              Back
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="deposit-form success-form">
            <div className="success-icon">✅</div>
            <h2>Deposit Successful!</h2>
            <p className="success-message">{successMessage}</p>
            <div className="success-details">
              <div className="detail-row">
                <span>Amount Deposited:</span>
                <strong>K{parseFloat(amount).toLocaleString()}</strong>
              </div>
              <div className="detail-row">
                <span>Reference:</span>
                <code>{reference}</code>
              </div>
            </div>
            <p className="redirect-message">Redirecting to home in a few seconds...</p>
          </div>
        )}

        <div className="deposit-security-info">
          <div className="security-item">
            <CreditCard size={20} />
            <span>Secure payment processing</span>
          </div>
          <div className="security-item">
            <Lock size={20} />
            <span>Your data is encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};
