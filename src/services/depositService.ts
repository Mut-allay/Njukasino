const API = import.meta.env.VITE_API_URL || "https://njuka-webapp-backend.onrender.com";

export interface DepositInitiateRequest {
  amount: number;
  phone: string;
  operator: "airtel" | "mtn";
  uid?: string;
  reference?: string;
}

export interface DepositVerifyRequest {
  reference: string;
  otp: string;
  uid?: string;
}

export interface DepositResponse {
  reference: string;
  status: string;
  message: string;
  user_id?: string;
  amount?: number;
}

export class DepositService {
  private async handleResponse(response: Response, operation: string): Promise<unknown> {
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const errorMessage = `${operation} failed: ${response.status} ${response.statusText} - ${errorText}`;
      console.error(`[DepositService] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  async initiateDeposit(request: DepositInitiateRequest): Promise<DepositResponse> {
    try {
      const response = await fetch(`${API}/deposit/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
        body: JSON.stringify({
          amount: request.amount,
          phone: request.phone,
          operator: request.operator,
          uid: request.uid,
          reference: request.reference,
        }),
      });

      return await this.handleResponse(response, 'initiateDeposit') as DepositResponse;
    } catch (error: unknown) {
      console.error('[DepositService] Initiate deposit error:', error);
      throw error;
    }
  }

  async verifyDeposit(request: DepositVerifyRequest): Promise<DepositResponse> {
    try {
      const response = await fetch(`${API}/deposit/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
        body: JSON.stringify({
          reference: request.reference,
          otp: request.otp,
          uid: request.uid,
        }),
      });

      return await this.handleResponse(response, 'verifyDeposit') as DepositResponse;
    } catch (error: unknown) {
      console.error('[DepositService] Verify deposit error:', error);
      throw error;
    }
  }

  async getWallet(playerName: string, uid?: string): Promise<{ wallet: number }> {
    try {
      const url = uid 
        ? `${API}/wallet/${encodeURIComponent(playerName)}?uid=${encodeURIComponent(uid)}`
        : `${API}/wallet/${encodeURIComponent(playerName)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });

      return await this.handleResponse(response, 'getWallet') as { wallet: number };
    } catch (error: unknown) {
      console.error('[DepositService] Get wallet error:', error);
      throw error;
    }
  }
}
