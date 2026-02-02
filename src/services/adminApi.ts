/**
 * Admin API: Fetch house balance and other admin data.
 * Uses Bearer token from Firebase auth.currentUser.getIdToken().
 */
import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://njuka-webapp-backend.onrender.com';
const ADMIN_BASE = `${API.replace(/\/$/, '')}/api/admin`;

export interface HouseBalanceResponse {
  house_balance: number;
}

export type GetToken = () => Promise<string | null>;

function createClient(getToken: GetToken): AxiosInstance {
  const client = axios.create({
    baseURL: ADMIN_BASE,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

export function createAdminApi(getToken: GetToken) {
  const client = createClient(getToken);

  return {
    async getHouseBalance(): Promise<HouseBalanceResponse> {
      const { data } = await client.get<HouseBalanceResponse>('/house-balance');
      return data;
    },
  };
}
