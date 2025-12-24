export interface Quota {
  credits: number;
  lastRefill: number; // timestamp in ms
}

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:7860';

const getToken = () => localStorage.getItem('access_token');

export const authService = {
  login: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error };
      }

      localStorage.setItem('access_token', data.session.access_token);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  signup: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  logout: async () => {
    try {
        const token = getToken();
        if (token) {
             await fetch(`${BACKEND_URL}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        localStorage.removeItem('access_token');
    }
  },

  getCurrentUser: async (): Promise<string | null> => {
    const token = getToken();
    if (!token) return null;

    try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.user.email;
        } else {
            localStorage.removeItem('access_token');
            return null;
        }
    } catch (e) {
        return null;
    }
  },

  checkQuota: async (): Promise<{ allowed: boolean; remaining: number; nextReset?: number }> => {
    const token = getToken();
    if (!token) return { allowed: false, remaining: 0 };

    try {
        const res = await fetch(`${BACKEND_URL}/api/quota`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) return { allowed: false, remaining: 0 };
        
        const data = await res.json();
        return data;
    } catch (e) {
        return { allowed: false, remaining: 0 };
    }
  }
};