/**
 * Lipila wallet API: balance, deposit (MoMo/card), withdraw (MoMo), transaction status.
 * Uses Bearer token from Firebase auth.currentUser.getIdToken().
 */
import axios, { AxiosInstance } from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://njuka-webapp-backend.onrender.com';
const PAYMENTS_BASE = `${API.replace(/\/$/, '')}/api/payments`;

export interface BalanceResponse {
  wallet_balance: number;
}

export interface MomoDepositRequest {
  amount: number;
  phone: string;
}

export interface MomoWithdrawRequest {
  amount: number;
  phone: string;
}

export interface CardDetails {
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
}

export interface CardDepositRequest {
  amount: number;
  card_details: CardDetails;
}

export interface InitiateResponse {
  reference: string;
  status: string;
  message: string;
  [key: string]: unknown;
}

export interface StatusResponse {
  reference_id: string;
  transaction_status?: string;
  status?: string;
  [key: string]: unknown;
}

export type GetToken = () => Promise<string | null>;

function createClient(getToken: GetToken): AxiosInstance {
  const client = axios.create({
    baseURL: PAYMENTS_BASE,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

export function createWalletApi(getToken: GetToken) {
  const client = createClient(getToken);

  return {
    async getBalance(): Promise<BalanceResponse> {
      const { data } = await client.get<BalanceResponse>('/balance');
      return data;
    },

    async depositMomo(body: MomoDepositRequest): Promise<InitiateResponse> {
      const { data } = await client.post<InitiateResponse>('/deposit/momo', body);
      return data;
    },

    async withdrawMomo(body: MomoWithdrawRequest): Promise<InitiateResponse> {
      const { data } = await client.post<InitiateResponse>('/withdraw/momo', body);
      return data;
    },

    async depositCard(body: CardDepositRequest): Promise<InitiateResponse> {
      const { data } = await client.post<InitiateResponse>('/deposit/card', body);
      return data;
    },

    async getTransactionStatus(
      referenceId: string,
      transactionType: 'collection' | 'disbursement'
    ): Promise<StatusResponse> {
      const { data } = await client.get<StatusResponse>('/transaction/status', {
        params: { reference_id: referenceId, transaction_type: transactionType },
      });
      return data;
    },
  };
}
