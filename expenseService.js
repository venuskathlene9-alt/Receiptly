const DATABASE_NAME = 'receiptly-local';
const DATABASE_VERSION = 1;
const EXPENSES_STORE = 'expenses';
const PROFILES_STORE = 'profiles';
const IMAGES_STORE = 'images';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

let databasePromise;

function openDatabase() {
  if (!globalThis.indexedDB) throw new Error('This browser does not support local storage for Receiptly.');
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(EXPENSES_STORE)) database.createObjectStore(EXPENSES_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(PROFILES_STORE)) database.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(IMAGES_STORE)) database.createObjectStore(IMAGES_STORE, { keyPath: 'path' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open Receiptly local storage.'));
      request.onblocked = () => reject(new Error('Receiptly local storage is blocked by another open tab. Close other tabs and try again.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function transact(storeNames, mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    const result = operation(transaction);
    transaction.oncomplete = () => resolve(typeof result === 'function' ? result() : result);
    transaction.onerror = () => reject(transaction.error || new Error('Could not save Receiptly local data.'));
    transaction.onabort = () => reject(transaction.error || new Error('Receiptly local storage transaction was cancelled.'));
  });
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not read Receiptly local data.'));
  });
}

export async function listExpenses(userId) {
  const database = await openDatabase();
  const expenses = await requestValue(database.transaction(EXPENSES_STORE).objectStore(EXPENSES_STORE).getAll());
  return expenses
    .filter((expense) => expense.user_id === userId)
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at));
}

export async function saveExpense(userId, values, imageFile = null, existingImagePath = null) {
  if (imageFile) validateImage(imageFile);
  const now = new Date().toISOString();
  const id = values.id || crypto.randomUUID();
  const imagePath = imageFile ? `receipt-images/${userId}/${crypto.randomUUID()}` : existingImagePath;
  const expense = {
    ...values,
    id,
    user_id: userId,
    receipt_image_path: imagePath,
    created_at: values.created_at || now,
    updated_at: now,
  };
  await transact([EXPENSES_STORE, IMAGES_STORE], 'readwrite', (transaction) => {
    if (imageFile) transaction.objectStore(IMAGES_STORE).put({ path: imagePath, blob: imageFile });
    transaction.objectStore(EXPENSES_STORE).put(expense);
    if (imageFile && existingImagePath && existingImagePath !== imagePath) {
      transaction.objectStore(IMAGES_STORE).delete(existingImagePath);
    }
  });
  return expense;
}

export async function deleteExpense(userId, expense) {
  await transact([EXPENSES_STORE, IMAGES_STORE], 'readwrite', (transaction) => {
    transaction.objectStore(EXPENSES_STORE).delete(expense.id);
    if (expense.receipt_image_path) transaction.objectStore(IMAGES_STORE).delete(expense.receipt_image_path);
  });
  return { storageCleanupError: null };
}

export async function getReceiptUrl(path) {
  if (!path) return null;
  const database = await openDatabase();
  const image = await requestValue(database.transaction(IMAGES_STORE).objectStore(IMAGES_STORE).get(path));
  if (!image?.blob) throw new Error('This image is no longer available in this browser.');
  return URL.createObjectURL(image.blob);
}

export async function getProfile(userId) {
  const database = await openDatabase();
  const profile = await requestValue(database.transaction(PROFILES_STORE).objectStore(PROFILES_STORE).get(userId));
  if (profile) return profile;
  return updateProfile(userId, {
    full_name: '',
    email: '',
    avatar_url: null,
    currency: 'PHP',
    theme: 'light',
    date_format: 'MMM d, yyyy',
  });
}

export async function updateProfile(userId, changes) {
  let updatedProfile;
  await transact(PROFILES_STORE, 'readwrite', (transaction) => {
    const store = transaction.objectStore(PROFILES_STORE);
    const request = store.get(userId);
    request.onsuccess = () => {
      updatedProfile = {
        ...request.result,
        ...changes,
        id: userId,
        updated_at: new Date().toISOString(),
      };
      store.put(updatedProfile);
    };
    return () => updatedProfile;
  });
  return updatedProfile;
}

export async function uploadAvatar(userId, file) {
  validateImage(file);
  const path = `profile-images/${userId}/${crypto.randomUUID()}`;
  await transact(IMAGES_STORE, 'readwrite', (transaction) => {
    transaction.objectStore(IMAGES_STORE).put({ path, blob: file });
  });
  return path;
}

export async function deleteStoredImage(path) {
  if (!path) return;
  await transact(IMAGES_STORE, 'readwrite', (transaction) => {
    transaction.objectStore(IMAGES_STORE).delete(path);
  });
}

export function validateImage(file) {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Choose a JPG or PNG image.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Images must be 10 MB or smaller.');
}
