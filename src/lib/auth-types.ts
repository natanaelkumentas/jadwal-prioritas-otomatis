export type UserRole = 'developer' | 'admin' | 'user';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  staffId?: string | null;
}

/**
 * Generate a friendly, readable random alphanumeric password (safe for both client and server)
 */
export function generateRandomPassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];

  for (let i = 3; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}
