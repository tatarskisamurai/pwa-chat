export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function isValidUsername(username: string): boolean {
  return username.length >= 2 && /^[a-zA-Z0-9_]+$/.test(username);
}
