const TOKEN_KEY = 'dataflowx_token';

export const tokenStorage = {
  getToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore storage write errors (e.g. private mode restrictions)
    }
  },

  clearToken(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage remove errors
    }
  },
};
