import bcrypt from 'bcryptjs';
import { ENV } from '../../config/env.config';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(ENV.BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
