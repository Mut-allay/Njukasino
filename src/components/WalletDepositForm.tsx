import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Phone, DollarSign } from 'lucide-react';
import type { MomoDepositRequest, CardDepositRequest, InitiateResponse } from '../services/walletApi';

const QUICK_AMOUNTS = [10, 20, 50, 100];

const phoneRegex = /^\+?260\d{9}$|^0\d{9}$/;
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('260') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+260${digits}`;
  return phone.trim();
}

const depositSchema = z
  .object({
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    phone: z.string().optional(),
    card_number: z.string().optional(),
    expiry_month: z.string().optional(),
    expiry_year: z.string().optional(),
    cvv: z.string().optional(),
  })
  .refine(
    (data) => {
      const isCard = (data.card_number ?? '').replace(/\s/g, '').length >= 12;
      if (isCard) {
        return (
          (data.expiry_month?.length ?? 0) === 2 &&
          (data.expiry_year?.length ?? 0) >= 2 &&
          (data.cvv?.length ?? 0) >= 3
        );
      }
      return (data.phone?.length ?? 0) >= 9 && phoneRegex.test(normalizePhone(data.phone ?? ''));
    },
    { message: 'Phone (+260...) or valid card details required', path: ['phone'] }
  );

type DepositFormValues = z.infer<typeof depositSchema>;

export type DepositMethod = 'momo' | 'card';

interface WalletDepositFormProps {
  defaultPhone?: string;
  onDepositMomo: (body: MomoDepositRequest) => Promise<InitiateResponse>;
  onDepositCard: (body: CardDepositRequest) => Promise<InitiateResponse>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  const groups = digits.match(/.{1,4}/g) ?? [];
  return groups.join(' ').trim();
}

export function WalletDepositForm({
  defaultPhone = '',
  onDepositMomo,
  onDepositCard,
  loading,
  setLoading,
  onSuccess,
  onError,
}: WalletDepositFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 0,
      phone: defaultPhone,
      card_number: '',
      expiry_month: '',
      expiry_year: '',
      cvv: '',
    },
  });

  const amount = watch('amount');
  const phone = watch('phone');
  const cardNumber = watch('card_number') ?? '';
  const expiryMonth = watch('expiry_month') ?? '';
  const expiryYear = watch('expiry_year') ?? '';
  const cvv = watch('cvv') ?? '';

  const isCard = cardNumber.replace(/\s/g, '').length >= 12;
  const amountNum = Number(amount) || 0;

  const onSubmit = async (data: DepositFormValues) => {
    const method: DepositMethod = isCard ? 'card' : 'momo';
    if (amountNum <= 0) {
      onError('Please enter an amount.');
      return;
    }
    setLoading(true);
    try {
      if (method === 'momo') {
        const res = await onDepositMomo({
          amount: amountNum,
          phone: normalizePhone(data.phone),
        });
        onSuccess(res.message || 'Deposit initiated. Confirm on your phone.');
      } else {
        const res = await onDepositCard({
          amount: amountNum,
          card_details: {
            card_number: (data.card_number ?? '').replace(/\s/g, ''),
            expiry_month: (data.expiry_month ?? '').padStart(2, '0'),
            expiry_year: (data.expiry_year ?? '').length === 2 ? data.expiry_year! : (data.expiry_year ?? '').slice(-2),
            cvv: data.cvv ?? '',
          },
        });
        onSuccess(res.message || 'Card payment initiated.');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : err instanceof Error
            ? err.message
            : 'Deposit failed';
      onError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="wallet-deposit-form">
      <div className="wallet-form-section">
        <label className="wallet-label">Amount (ZMW)</label>
        <div className="wallet-input-wrap">
          <DollarSign size={18} className="wallet-input-icon" />
          <input
            type="number"
            placeholder="0.00"
            min="1"
            step="0.01"
            {...register('amount')}
            disabled={loading}
            className="wallet-input"
          />
          <span className="wallet-currency">K</span>
        </div>
        {errors.amount && <p className="wallet-error">{errors.amount.message}</p>}
        <div className="wallet-quick-amounts">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              className="wallet-quick-btn"
              onClick={() => setValue('amount', q)}
            >
              K{q}
            </button>
          ))}
        </div>
      </div>

      <div className="wallet-form-section">
        <label className="wallet-label">Payment method</label>
        <div className="wallet-method-tabs">
          <button
            type="button"
            className={`wallet-tab ${!isCard ? 'active' : ''}`}
            onClick={() => setValue('card_number', '')}
          >
            <Phone size={18} /> Mobile Money
          </button>
          <button
            type="button"
            className={`wallet-tab ${isCard ? 'active' : ''}`}
            onClick={() => setValue('card_number', '4111111111111111')}
          >
            <CreditCard size={18} /> Card
          </button>
        </div>
      </div>

      {!isCard && (
        <div className="wallet-form-section">
          <label className="wallet-label">Phone number</label>
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
      )}

      {isCard && (
        <div className="wallet-form-section wallet-card-fields">
          <label className="wallet-label">Card number</label>
          <input
            type="text"
            placeholder="4111 1111 1111 1111"
            maxLength={19}
            disabled={loading}
            className="wallet-input"
            value={cardNumber}
            onChange={(e) => setValue('card_number', maskCardNumber(e.target.value), { shouldValidate: true })}
          />
          <div className="wallet-card-row">
            <div>
              <label className="wallet-label">Expiry (MM/YY)</label>
              <div className="wallet-expiry">
                <input
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  disabled={loading}
                  className="wallet-input small"
                  value={expiryMonth}
                  onChange={(e) => setValue('expiry_month', e.target.value.replace(/\D/g, '').slice(0, 2), { shouldValidate: true })}
                />
                <span className="wallet-sep">/</span>
                <input
                  type="text"
                  placeholder="YY"
                  maxLength={4}
                  disabled={loading}
                  className="wallet-input small"
                  value={expiryYear}
                  onChange={(e) => setValue('expiry_year', e.target.value.replace(/\D/g, '').slice(0, 4), { shouldValidate: true })}
                />
              </div>
            </div>
            <div>
              <label className="wallet-label">CVV</label>
              <input
                type="password"
                placeholder="•••"
                maxLength={4}
                disabled={loading}
                className="wallet-input small"
                autoComplete="off"
                value={cvv}
                onChange={(e) => setValue('cvv', e.target.value.replace(/\D/g, '').slice(0, 4), { shouldValidate: true })}
              />
            </div>
          </div>
          {errors.card_number && <p className="wallet-error">{errors.card_number.message}</p>}
          <p className="wallet-hint">Test only: use sandbox card numbers</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || amountNum <= 0}
        className="wallet-btn wallet-btn-primary"
      >
        {loading ? 'Processing…' : `Deposit K${amountNum || '0'}`}
      </button>
    </form>
  );
}
