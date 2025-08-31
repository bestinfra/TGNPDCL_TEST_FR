// Development vs Production URL
const isDevelopment = import.meta.env.DEV;
const BASE_URL = isDevelopment 
  ? '/api'  // Use Vite proxy in development
  : 'https://arcticterntech.in:8443/attSmart'; // Direct API in production

export interface AuthResponse {
  jwt: string;
}

export interface MeterStatusResponse {
  isConnected: string; // "0" for connected, "1" for disconnected, "2" for unknown (treated as disconnected)
}

export interface SetLoadControlRequest {
  meterSerialNo: string;
  functionCode: string;
  valueToProgram: string;
  transactionId: string;
}

export interface SetLoadControlResponse {
  transactionId: string;
  entity: {
    meterSerialId: string;
    functionCode: string;
    valueToProgram: string;
  };
  message: string;
}

class MeterConnectionAPI {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  // Get authentication token
  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await fetch(`${BASE_URL}/getToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          username: 'att',
          password: 'att@123'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }

      const data: AuthResponse = await response.json();
      this.token = data.jwt;
      this.tokenExpiry = Date.now() + 86400000; // 24 hours
      
      return this.token;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to API server. Please check your internet connection and ensure the API server is accessible.');
      }
      throw error;
    }
  }

  // Get meter connection status
  async getMeterStatus(meterSerialNo: string): Promise<MeterStatusResponse> {
    try {
      const token = await this.getToken();
      
      const response = await fetch(`${BASE_URL}/refreshStatus/${meterSerialNo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        mode: 'cors'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get meter status: ${response.status} - ${errorText}`);
      }

      const data: MeterStatusResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to API server for status check. Please verify the API server is running and accessible.');
      }
      throw error;
    }
  }

  // Connect meter (Function Code 8)
  async connectMeter(meterSerialNo: string, reason: string = ''): Promise<SetLoadControlResponse> {
    try {
      const token = await this.getToken();
      const transactionId = `CONNECT_${meterSerialNo}_${Date.now()}`;
      
      const requestBody: SetLoadControlRequest = {
        meterSerialNo,
        functionCode: '8', // Connect Load
        valueToProgram: reason || 'Manual connection',
        transactionId
      };

      const response = await fetch(`${BASE_URL}/setLoadFunctionControl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to connect meter: ${response.status}`);
      }

      const data: SetLoadControlResponse = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Disconnect meter (Function Code 9)
  async disconnectMeter(meterSerialNo: string, reason: string = ''): Promise<SetLoadControlResponse> {
    try {
      const token = await this.getToken();
      const transactionId = `DISCONNECT_${meterSerialNo}_${Date.now()}`;
      
      const requestBody: SetLoadControlRequest = {
        meterSerialNo,
        functionCode: '9', // Disconnect Load
        valueToProgram: reason || 'Manual disconnection',
        transactionId
      };

      const response = await fetch(`${BASE_URL}/setLoadFunctionControl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to disconnect meter: ${response.status}`);
      }

      const data: SetLoadControlResponse = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Utility function to convert API status to readable format
  static parseConnectionStatus(apiStatus: string): 'connected' | 'disconnected' {
    switch (apiStatus) {
      case '0':
        return 'connected';
      case '1':
        return 'disconnected';
      case '2':
      default:
        return 'disconnected'; // Default to disconnected for unknown states
    }
  }

  // Utility function to convert readable status to API format
  static formatConnectionStatus(status: 'connected' | 'disconnected'): string {
    switch (status) {
      case 'connected':
        return '0';
      case 'disconnected':
        return '1';
      default:
        return '1'; // Default to disconnected
    }
  }
}

const meterConnectionAPI = new MeterConnectionAPI();
export { MeterConnectionAPI };
export default meterConnectionAPI; 