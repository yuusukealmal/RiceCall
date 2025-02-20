// Services
import { apiService } from '@/services/api.service';

// Utils
import { base64encode } from '@/utils/base64encode';

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

      return response;
    } catch (error) {
      console.error('登入請求失敗:', error);
      throw error;
    }
  },
  validateToken: async (sessionId: string): Promise<boolean> => {
    try {
      const response = await apiService.post('/validateToken', {
        sessionId,
      });

      if (response && response.message === 'Token validated') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token 驗證失敗:', error);
      return false;
    }
  },

  register: async (formData: RegisterFormData) => {
    const registerData = {
      ...formData,
      password: base64encode(formData.password),
    };
    return apiService.post('/register', registerData);
  },
};

export default authService;
