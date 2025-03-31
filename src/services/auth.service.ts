// Services
import apiService from '@/services/api.service';
import ipcService from '@/services/ipc.service';

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

const base64encode = (str: string): string => btoa(str);

export const authService = {
  login: async (formData: LoginFormData): Promise<boolean> => {
    localStorage.setItem('autoLogin', formData.autoLogin ? 'true' : 'false');
    localStorage.setItem('account', formData.account || '');
    const loginData = {
      ...formData,
      password: base64encode(formData.password),
    };
    const response = await apiService.post('/login', loginData);
    if (!response || !response.token) return false;
    localStorage.setItem('token', response.token);
    ipcService.auth.login(response.token);
    return true;
  },

  register: async (formData: RegisterFormData): Promise<boolean> => {
    const registerData = {
      ...formData,
      password: base64encode(formData.password),
    };
    const response = await apiService.post('/register', registerData);
    if (!response) return false;
    return true;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('autoLogin');
    ipcService.auth.logout();
    return true;
  },

  isAutoLoginEnabled: (): boolean => {
    return localStorage.getItem('autoLogin') === 'true';
  },

  isRememberAccountEnabled: (): boolean => {
    return localStorage.getItem('account') !== null;
  },

  autoLogin: async (): Promise<boolean> => {
    const autoLogin = localStorage.getItem('autoLogin') === 'true';
    const token = localStorage.getItem('token');
    if (!autoLogin || !token) return false;
    ipcService.auth.login(token);
    return true;
  },
};

export default authService;
