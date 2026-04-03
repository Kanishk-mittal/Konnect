import { openDB, type IDBPDatabase } from 'idb';
import {
  type KonnectDBSchema,
  DB_VERSION,
  CHAT_LIST_STORE,
  GROUP_STORE,
  ANNOUNCEMENT_STORE,
  KEY_STORE,
  CHAT_MESSAGES_STORE,
  GROUP_MESSAGES_STORE,
  ANNOUNCEMENT_MESSAGES_STORE,
} from './schema.db';

let dbPromises = new Map<string, Promise<IDBPDatabase<KonnectDBSchema>>>();

export const getDb = (userId: string) => {
  if (!userId) {
    throw new Error("User ID is required to access the database.");
  }

  const DB_NAME = `konnect-db-${userId}`;

  if (!dbPromises.has(userId)) {
    const promise = openDB<KonnectDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create contact list stores
        if (!db.objectStoreNames.contains(CHAT_LIST_STORE)) {
          const chatStore = db.createObjectStore(CHAT_LIST_STORE, { keyPath: 'id' });
          chatStore.createIndex('by-lastAccessed', 'lastAccessed');
        }

        if (!db.objectStoreNames.contains(GROUP_STORE)) {
          const groupStore = db.createObjectStore(GROUP_STORE, { keyPath: 'id' });
          groupStore.createIndex('by-lastAccessed', 'lastAccessed');
        }

        if (!db.objectStoreNames.contains(ANNOUNCEMENT_STORE)) {
          const announcementStore = db.createObjectStore(ANNOUNCEMENT_STORE, { keyPath: 'id' });
          announcementStore.createIndex('by-lastAccessed', 'lastAccessed');
        }

        // Create key store
        if (!db.objectStoreNames.contains(KEY_STORE)) {
          db.createObjectStore(KEY_STORE);
        }

        // Create message stores
        if (!db.objectStoreNames.contains(CHAT_MESSAGES_STORE)) {
          const chatMessagesStore = db.createObjectStore(CHAT_MESSAGES_STORE, { keyPath: 'id' });
          chatMessagesStore.createIndex('by-senderId', 'senderId');
          chatMessagesStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains(GROUP_MESSAGES_STORE)) {
          const groupMessagesStore = db.createObjectStore(GROUP_MESSAGES_STORE, { keyPath: 'id' });
          groupMessagesStore.createIndex('by-groupId', 'groupId');
          groupMessagesStore.createIndex('by-senderId', 'senderId');
          groupMessagesStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains(ANNOUNCEMENT_MESSAGES_STORE)) {
          const announcementMessagesStore = db.createObjectStore(ANNOUNCEMENT_MESSAGES_STORE, { keyPath: 'id' });
          announcementMessagesStore.createIndex('by-groupId', 'groupId');
          announcementMessagesStore.createIndex('by-senderId', 'senderId');
          announcementMessagesStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
    dbPromises.set(userId, promise);
  }
  return dbPromises.get(userId)!;
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
