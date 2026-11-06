import bcrypt from 'bcrypt';

const ROUNDS = 10;

// Compared against when the account does not exist, so both cases take the same time.
const NO_ACCOUNT_HASH = bcrypt.hashSync('no account has this password', ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
  return bcrypt.compare(password, hash ?? NO_ACCOUNT_HASH);
}
