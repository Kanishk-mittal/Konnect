import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_VERSION = 2; // Incremented version for schema change

// Define store names as constants
export const CHAT_STORE = 'chats';
export const GROUP_STORE = 'groups';
export const ANNOUNCEMENT_STORE = 'announcements';
export const KEY_STORE = 'keys'; // New store for crypto keys

// Define a union type for store names for type safety
export type StoreName = typeof CHAT_STORE | typeof GROUP_STORE | typeof ANNOUNCEMENT_STORE;

// Define the shape of the data in our stores
export interface StoredItem {
  id: string;
  name: string;
  profilePicture: string | null;
  lastAccessed: number;
}

// Define the database schema
interface KonnectDBSchema extends DBSchema {
  [CHAT_STORE]: {
    key: string;
    value: StoredItem;
    indexes: { 'by-lastAccessed': number };
  };
  [GROUP_STORE]: {
    key: string;
    value: StoredItem;
    indexes: { 'by-lastAccessed': number };
  };
  [ANNOUNCEMENT_STORE]: {
    key: string;
    value: StoredItem;
    indexes: { 'by-lastAccessed': number };
  };
  [KEY_STORE]: {
    key: string; // Key will be the user's ID
    value: CryptoKey; // Value is the non-extractable CryptoKey
  };
}

let dbPromises = new Map<string, Promise<IDBPDatabase<KonnectDBSchema>>>();

const getDb = (userId: string) => {
  if (!userId) {
    throw new Error("User ID is required to access the database.");
  }

  const DB_NAME = `konnect-db-${userId}`;

  if (!dbPromises.has(userId)) {
    const promise = openDB<KonnectDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Function to create a store
        const createStore = (storeName: StoreName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('by-lastAccessed', 'lastAccessed');
          }
        };

        if (oldVersion < 1) {
          // Create all stores for a fresh install
          createStore(CHAT_STORE);
          createStore(GROUP_STORE);
          createStore(ANNOUNCEMENT_STORE);
        }
        
        if (oldVersion < 2) {
          // Add the new key store
          if (!db.objectStoreNames.contains(KEY_STORE)) {
            db.createObjectStore(KEY_STORE);
          }
        }
      },
    });
    dbPromises.set(userId, promise);
  }
  return dbPromises.get(userId)!;
};


/**
 * Gets all items from a store, sorted by lastAccessed descending.
 */
export const getItems = async (userId: string, storeName: StoreName): Promise<StoredItem[]> => {
  const db = await getDb(userId);
  const tx = db.transaction(storeName, 'readonly');
  const index = tx.store.index('by-lastAccessed');
  // getAll returns items sorted by the index key
  const sortedItems = await index.getAll();
  // The index sorts in ascending order, so we reverse for descending
  return sortedItems.reverse();
};

/**
 * Inserts or updates items in a store.
 * New items get a `lastAccessed` timestamp.
 * Existing items preserve their `lastAccessed` timestamp.
 */
export const upsertItems = async (
  userId: string,
  storeName: StoreName,
  items: Array<{ id: string; name: string; profilePicture: string | null }>
) => {
  const db = await getDb(userId);
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  const promises = items.map(async (item) => {
    const existingItem = await store.get(item.id);
    if (existingItem) {
      // It exists, update it but preserve lastAccessed
      return store.put({
        ...item,
        lastAccessed: existingItem.lastAccessed,
      });
    } else {
      // It's new, add it with a default lastAccessed
      return store.put({
        ...item,
        lastAccessed: Date.now(),
      });
    }
  });

  await Promise.all(promises);
  await tx.done;
};

/**
 * Updates the lastAccessed timestamp for a specific item in a store.
 */
export const updateItemTimestamp = async (userId: string, storeName: StoreName, itemId: string) => {
  const db = await getDb(userId);
  const item = await db.get(storeName, itemId);
  if (item) {
    item.lastAccessed = Date.now();
    await db.put(storeName, item);
  }
};

// --- Crypto Key Storage Functions ---

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

/**
 * Deletes the entire IndexedDB database for a user.
 * @param userId The ID of the user whose database should be deleted.
 */
export const deleteUserDatabase = async (userId: string): Promise<void> => {
    const dbName = `konnect-db-${userId}`;
    if (dbPromises.has(userId)) {
        const db = await dbPromises.get(userId);
        db?.close();
        dbPromises.delete(userId);
    }
    await window.indexedDB.deleteDatabase(dbName);
};
