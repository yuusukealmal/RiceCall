// Services
import { apiService } from '@/services/api.service';
import { ipcService } from '@/services/ipc.service';

// Utils
import { base64encode } from '@/utils/base64encode';
import { isTokenExpired } from '@/utils/jwt';

interface LoginFormData {
  account: string;
  password: string;
  rememberAccount: boolean;
  autoLogin: boolean;
}

interface RegisterFormData {
  account: string;
  password: string;
  username: string;
  gender: 'Male' | 'Female';
}

export const authService = {
  login: async (formData: LoginFormData) => {
    try {
      const loginData = {
        ...formData,
        password: base64encode(formData.password),
      };
      const response = await apiService.post('/login', loginData);

      if (!response) {
        throw new Error('伺服器無回應');
      }

      if (response?.sessionId) {
        localStorage.setItem('jwtToken', response.sessionId);
      }

      return response;
    } catch (error) {
      console.error('登入請求失敗:', error);
      throw error;
    }
  },

  register: async (formData: RegisterFormData) => {
    const registerData = {
      ...formData,
      password: base64encode(formData.password),
    };
    return apiService.post('/register', registerData);
  },

  logout: () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('autoLogin');
    if (ipcService.getAvailability()) {
      ipcService.auth.logout();
    }
  },

  isAutoLoginEnabled: () => {
    return localStorage.getItem('autoLogin') === 'true';
  },

  // Method to get current token
  getToken: () => {
    return localStorage.getItem('jwtToken');
  },

  // Method to validate token and auto log in
  autoLogin: async () => {
    const autoLogin = localStorage.getItem('autoLogin') === 'true';
    const token = localStorage.getItem('jwtToken');

    if (!autoLogin || !token) {
      return false;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem('jwtToken');
      return false;
    }

    // Return token for auto login
    return token;
  },

  // Method to clear auto login
  clearAutoLogin: () => {
    localStorage.removeItem('autoLogin');
    localStorage.removeItem('jwtToken');
  },
};

export default authService;
