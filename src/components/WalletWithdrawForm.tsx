import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone } from 'lucide-react';
import type { MomoWithdrawRequest, InitiateResponse } from '../services/walletApi';

const phoneRegex = /^\+?260\d{9}$|^0\d{9}$/;
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('260') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+260${digits}`;
  return phone.trim();
}

const withdrawSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  phone: z.string().min(9, 'Phone required').refine((v) => phoneRegex.test(normalizePhone(v)), 'Use +260xxxxxxxxx'),
}).refine(
  (data, ctx) => {
    const max = (ctx as { balance?: number }).balance ?? 0;
    return data.amount <= max;
  },
  { message: 'Amount exceeds available balance', path: ['amount'] }
);

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WalletWithdrawFormProps {
  balance: number;
  defaultPhone?: string;
  onWithdraw: (body: MomoWithdrawRequest) => Promise<InitiateResponse>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function WalletWithdrawForm({
  balance,
  defaultPhone = '',
  onWithdraw,
  loading,
  setLoading,
  onSuccess,
  onError,
}: WalletWithdrawFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WithdrawFormValues>({
    resolver: zodResolver(makeWithdrawSchema(balance)),
    defaultValues: {
      amount: 0,
      phone: defaultPhone,
    },
  });

  const amount = watch('amount');
  const amountNum = Number(amount) || 0;

  const onSubmit = async (data: WithdrawFormValues) => {
    if (amountNum <= 0 || amountNum > balance) {
      onError('Enter a valid amount within your balance.');
      return;
    }
    setLoading(true);
    try {
      const res = await onWithdraw({
        amount: amountNum,
        phone: normalizePhone(data.phone),
      });
      onSuccess(res.message || 'Withdrawal initiated.');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : err instanceof Error
            ? err.message
            : 'Withdrawal failed';
      onError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="wallet-withdraw-form">
      <div className="wallet-form-section">
        <label className="wallet-label">Amount (ZMW)</label>
        <div className="wallet-input-wrap">
          <input
            type="number"
            placeholder="0.00"
            min="0.01"
            max={balance}
            step="0.01"
            {...register('amount')}
            disabled={loading}
            className="wallet-input"
          />
          <span className="wallet-currency">K</span>
        </div>
        {errors.amount && <p className="wallet-error">{errors.amount.message}</p>}
        <p className="wallet-hint">Available: K{balance.toLocaleString()}</p>
      </div>

      <div className="wallet-form-section">
        <label className="wallet-label">Mobile Money number</label>
        <div className="wallet-input-wrap">
          <Phone size={18} className="wallet-input-icon" />
          <input
            type="tel"
            placeholder="+260971234567"
            {...register('phone')}
            disabled={loading}
            className="wallet-input"
          />
        </div>
        {errors.phone && <p className="wallet-error">{errors.phone.message}</p>}
        <p className="wallet-hint">E.164: +260xxxxxxxxx</p>
      </div>

      <button
        type="submit"
        disabled={loading || amountNum <= 0 || amountNum > balance}
        className="wallet-btn wallet-btn-primary"
      >
        {loading ? 'Processing…' : `Withdraw K${amountNum || '0'}`}
      </button>
    </form>
  );
}
