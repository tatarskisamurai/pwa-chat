export interface User {
  id: string;
  username: string;
  handle: string;
  email?: string | null;
  avatar?: string | null;
  online_status: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
}
