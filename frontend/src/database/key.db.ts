import { getDb } from './main.db';
import { KEY_STORE } from './schema.db';

/**
 * Stores a CryptoKey in the key store.
 * @param userId The ID of the user owning the key.
 * @param key The CryptoKey object to store.
 */
export const storeCryptoKey = async (userId: string, key: CryptoKey): Promise<void> => {
  const db = await getDb(userId);
  await db.put(KEY_STORE, key, userId); // Use userId as the key in the key store
};

/**
 * Retrieves a CryptoKey from the key store.
 * @param userId The ID of the user owning the key.
 * @returns The CryptoKey object, or undefined if not found.
 */
export const getCryptoKey = async (userId: string): Promise<CryptoKey | undefined> => {
  const db = await getDb(userId);
  return db.get(KEY_STORE, userId);
};

/**
 * Deletes a CryptoKey from the key store.
 * @param userId The ID of the user owning the key.
 */
export const deleteCryptoKey = async (userId: string): Promise<void> => {
  const db = await getDb(userId);
  await db.delete(KEY_STORE, userId);
};
