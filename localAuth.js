const ACCOUNTS_KEY = 'receiptly-local-accounts';
const SESSION_KEY = 'receiptly-local-session';
const PASSWORD_ITERATIONS = 310000;

function readAccounts() {
  const saved = localStorage.getItem(ACCOUNTS_KEY);
  if (!saved) return [];

  const accounts = JSON.parse(saved);
  if (!Array.isArray(accounts) || accounts.some((account) => (
    typeof account.id !== 'string'
    || typeof account.username !== 'string'
    || typeof account.salt !== 'string'
    || !/^[0-9a-f]{32}$/i.test(account.salt)
    || typeof account.passwordHash !== 'string'
    || !/^[0-9a-f]{64}$/i.test(account.passwordHash)
  ))) {
    throw new Error('Local account data is invalid. Clear this site’s local account data and create an account again.');
  }
  return accounts;
}

function requireCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Secure browser storage is unavailable. Open Receiptly on localhost or in a secure browser context.');
  }
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  requireCrypto();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations: PASSWORD_ITERATIONS,
  }, key, 256);
  return toHex(new Uint8Array(bits));
}

function toBytes(hex) {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  return Uint8Array.from(hex.match(/.{2}/g), (byte) => Number.parseInt(byte, 16));
}

export async function registerLocalAccount(username, password) {
  const cleanUsername = username.trim();
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(cleanUsername)) {
    throw new Error('Choose a username with 3–32 letters, numbers, dots, underscores, or hyphens.');
  }
  if (password.length < 8) throw new Error('Use a password with at least 8 characters.');

  const accounts = readAccounts();
  if (accounts.some((account) => account.username.toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error('That username already has an account on this browser. Sign in instead.');
  }

  requireCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const account = {
    id: accounts.length === 0 ? 'local-workspace' : crypto.randomUUID(),
    username: cleanUsername,
    salt: toHex(salt),
    passwordHash: await hashPassword(password, salt),
  };
  accounts.push(account);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  localStorage.setItem(SESSION_KEY, account.id);
  return { id: account.id, username: account.username };
}

export async function signInLocalAccount(username, password) {
  const cleanUsername = username.trim().toLowerCase();
  const account = readAccounts().find((item) => item.username.toLowerCase() === cleanUsername);
  if (!account) throw new Error('No local account found for this username in this browser. Choose Create account first.');
  const salt = account ? toBytes(account.salt) : null;
  const expectedHash = account ? toBytes(account.passwordHash) : null;
  if (!salt || !expectedHash) throw new Error('Local account data is invalid. Create a new account on this browser.');

  const candidateHash = toBytes(await hashPassword(password, salt));
  let difference = 0;
  for (let index = 0; index < expectedHash.length; index += 1) {
    difference |= expectedHash[index] ^ candidateHash[index];
  }
  if (difference !== 0) throw new Error('Incorrect username or password.');

  localStorage.setItem(SESSION_KEY, account.id);
  return { id: account.id, username: account.username };
}

export function getLocalSession() {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const account = readAccounts().find((item) => item.id === userId);
  if (!account) throw new Error('Your local sign-in session is invalid. Please sign in again.');
  return { id: account.id, username: account.username };
}

export function signOutLocalAccount() {
  localStorage.removeItem(SESSION_KEY);
}
