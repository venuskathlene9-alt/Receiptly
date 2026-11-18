import { supabase } from './supabaseClient.js';

const DATABASE_NAME = 'receiptly-local';
const DATABASE_VERSION = 1;
const EXPENSES_STORE = 'expenses';
const PROFILES_STORE = 'profiles';
const IMAGES_STORE = 'images';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const RECEIPT_BUCKET = 'receipt-images';
const RECEIPT_IMAGE_PREFIX = `${RECEIPT_BUCKET}/`;

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

function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.');
  return supabase;
}

function isRemoteReceiptPath(path) {
  return typeof path === 'string' && path.startsWith(RECEIPT_IMAGE_PREFIX);
}

function storageObjectPath(path) {
  return path.slice(RECEIPT_IMAGE_PREFIX.length);
}

async function removeRemoteReceipt(path) {
  const { error } = await getSupabase().storage.from(RECEIPT_BUCKET).remove([storageObjectPath(path)]);
  return error;
}

async function markLocalExpenseSynced(id) {
  await transact(EXPENSES_STORE, 'readwrite', (transaction) => {
    const store = transaction.objectStore(EXPENSES_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, supabase_synced: true });
    };
  });
}

async function syncLegacyExpenses(userId, remoteExpenses) {
  const database = await openDatabase();
  const localExpenses = await requestValue(database.transaction(EXPENSES_STORE).objectStore(EXPENSES_STORE).getAll());
  const remoteIds = new Set(remoteExpenses.map((expense) => expense.id));
  const syncedExpenses = [];

  for (const localExpense of localExpenses) {
    if (localExpense.user_id !== userId || localExpense.supabase_synced) continue;
    if (remoteIds.has(localExpense.id)) {
      await markLocalExpenseSynced(localExpense.id);
      continue;
    }

    let remoteImagePath = null;
    if (localExpense.receipt_image_path) {
      const localImage = await requestValue(
        database.transaction(IMAGES_STORE).objectStore(IMAGES_STORE).get(localExpense.receipt_image_path),
      );
      if (localImage?.blob) {
        const extension = localImage.blob.type === 'image/png' ? 'png' : 'jpg';
        remoteImagePath = `${RECEIPT_IMAGE_PREFIX}${userId}/${localExpense.id}.${extension}`;
        const { error } = await getSupabase().storage.from(RECEIPT_BUCKET).upload(
          storageObjectPath(remoteImagePath),
          localImage.blob,
          { contentType: localImage.blob.type, upsert: true },
        );
        if (error) throw new Error(`Could not upload a saved receipt image: ${error.message}`);
      }
    }

    const legacyExpense = { ...localExpense };
    delete legacyExpense.supabase_synced;
    const { data, error } = await getSupabase()
      .from('expenses')
      .upsert({ ...legacyExpense, receipt_image_path: remoteImagePath })
      .select()
      .single();
    if (error) {
      const cleanupError = remoteImagePath ? await removeRemoteReceipt(remoteImagePath) : null;
      const cleanupNotice = cleanupError ? ` Receipt cleanup also failed: ${cleanupError.message}` : '';
      throw new Error(`Could not sync an existing expense to Supabase: ${error.message}.${cleanupNotice}`);
    }
    syncedExpenses.push(data);
    await markLocalExpenseSynced(localExpense.id);
  }

  return syncedExpenses;
}

export async function listExpenses(userId) {
  const { data, error } = await getSupabase()
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load expenses from Supabase: ${error.message}`);
  const migrated = await syncLegacyExpenses(userId, data);
  return [...data, ...migrated]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at));
}

export async function saveExpense(userId, values, imageFile = null, existingImagePath = null) {
  if (imageFile) validateImage(imageFile);
  const client = getSupabase();
  const now = new Date().toISOString();
  const id = values.id || crypto.randomUUID();
  const imagePath = imageFile
    ? `${RECEIPT_IMAGE_PREFIX}${userId}/${crypto.randomUUID()}.${imageFile.type === 'image/png' ? 'png' : 'jpg'}`
    : existingImagePath || null;
  if (imageFile) {
    const { error } = await client.storage.from(RECEIPT_BUCKET).upload(
      storageObjectPath(imagePath),
      imageFile,
      { contentType: imageFile.type, upsert: false },
    );
    if (error) throw new Error(`Could not upload receipt image: ${error.message}`);
  }
  const expense = {
    ...values,
    id,
    user_id: userId,
    receipt_image_path: imagePath,
    created_at: values.created_at || now,
    updated_at: now,
  };
  const { data, error } = await client.from('expenses').upsert(expense).select().single();
  if (error) {
    let cleanupError = null;
    if (imageFile) cleanupError = await removeRemoteReceipt(imagePath);
    const cleanupNotice = cleanupError ? ` Receipt cleanup also failed: ${cleanupError.message}` : '';
    throw new Error(`Could not save expense to Supabase: ${error.message}.${cleanupNotice}`);
  }

  let storageCleanupError = null;
  if (imageFile && existingImagePath && existingImagePath !== imagePath && isRemoteReceiptPath(existingImagePath)) {
    storageCleanupError = await removeRemoteReceipt(existingImagePath);
  }
  return { expense: data, storageCleanupError };
}

export async function deleteExpense(userId, expense) {
  const { data, error } = await getSupabase()
    .from('expenses')
    .delete()
    .eq('id', expense.id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Could not delete expense from Supabase: ${error.message}`);
  if (!data) throw new Error('This expense was not found in your Supabase account. Refresh the page and try again.');

  const storageCleanupError = isRemoteReceiptPath(expense.receipt_image_path)
    ? await removeRemoteReceipt(expense.receipt_image_path)
    : null;
  return { storageCleanupError };
}

export async function getReceiptUrl(path) {
  if (!path) return null;
  if (isRemoteReceiptPath(path)) {
    const { data, error } = await getSupabase().storage
      .from(RECEIPT_BUCKET)
      .createSignedUrl(storageObjectPath(path), 60 * 60);
    if (error) throw new Error(`Could not load receipt image: ${error.message}`);
    return data.signedUrl;
  }

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
  if (isRemoteReceiptPath(path)) {
    const error = await removeRemoteReceipt(path);
    if (error) throw new Error(`Could not delete the receipt image: ${error.message}`);
    return;
  }
  await transact(IMAGES_STORE, 'readwrite', (transaction) => {
    transaction.objectStore(IMAGES_STORE).delete(path);
  });
}

export function validateImage(file) {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Choose a JPG or PNG image.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Images must be 10 MB or smaller.');
}
