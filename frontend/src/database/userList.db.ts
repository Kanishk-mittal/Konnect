import { getDb } from './main.db';
import { type ListStoreName, type ContactListItem, CHAT_LIST_STORE, type ChatListItem } from './schema.db';

/**
 * Gets all items from a store, sorted by lastAccessed descending.
 */
export const getItems = async (userId: string, storeName: ListStoreName): Promise<ContactListItem[]> => {
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
  storeName: ListStoreName,
  items: ContactListItem[]
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
export const updateItemTimestamp = async (userId: string, storeName: ListStoreName, itemId: string) => {
  const db = await getDb(userId);
  const item = await db.get(storeName, itemId);
  if (item) {
    item.lastAccessed = Date.now();
    await db.put(storeName, item);
  }
};

/**
 * Gets the publicKey for a specific chat list item.
 */
export const getPublicKey = async (userId: string, contactId: string): Promise<string | undefined> => {
  const db = await getDb(userId);
  const chatItem = await db.get(CHAT_LIST_STORE, contactId) as ChatListItem | undefined;
  return chatItem?.publicKey;
};

/**
 * Sets or updates the publicKey for a specific chat list item.
 */
export const setPublicKey = async (userId: string, contactId: string, publicKey: string): Promise<void> => {
  const db = await getDb(userId);
  const tx = db.transaction(CHAT_LIST_STORE, 'readwrite');
  const store = tx.objectStore(CHAT_LIST_STORE);

  const existingItem = await store.get(contactId) as ChatListItem | undefined;

  if (existingItem) {
    existingItem.publicKey = publicKey;
    await store.put(existingItem);
  } else {
    // If the item doesn't exist, we should ideally upsert it with other required fields.
    // For now, we'll log a warning or throw an error as this function is for updating existing items.
    console.warn(`Attempted to set public key for non-existent chat item: ${contactId}`);
    // Depending on desired behavior, could create a new item here or ensure upsertItems is called prior.
  }
  await tx.done;
};
