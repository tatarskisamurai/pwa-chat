const TOKEN_KEY = 'chat_token';
const USER_KEY = 'chat_user';

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser(): string | null {
    return localStorage.getItem(USER_KEY);
  },
  setUser(userJson: string): void {
    localStorage.setItem(USER_KEY, userJson);
  },
  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },
  clear(): void {
    this.removeToken();
    this.removeUser();
  },
};
