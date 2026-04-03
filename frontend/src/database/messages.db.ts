import { getDb } from './main.db';
import { updateItemTimestamp } from './userList.db';
import {
    CHAT_MESSAGES_STORE,
    GROUP_MESSAGES_STORE,
    ANNOUNCEMENT_MESSAGES_STORE,
    CHAT_LIST_STORE,
    GROUP_STORE,
    ANNOUNCEMENT_STORE,
    type BaseMessage,
    type GroupMessage,
    type ChatMessage,
} from './schema.db';
import { getDatabaseEncryptionKey } from '../api/requests';
import { encryptAES, decryptAES } from '../encryption/AES_utils';

let dbEncryptionKey: string | null = null;

const getKey = async (): Promise<string> => {
    if (!dbEncryptionKey) {
        dbEncryptionKey = await getDatabaseEncryptionKey();
    }
    return dbEncryptionKey;
};

/**
 * Adds a direct chat message to the database and updates the contact's lastAccessed timestamp.
 * The message content is encrypted before being stored.
 */
export const addChatMessage = async (
    userId: string,
    contactId: string,
    message: BaseMessage
): Promise<void> => {
    const db = await getDb(userId);
    const key = await getKey();
    const encryptedContent = encryptAES(message.content, key);

    const tx = db.transaction(CHAT_MESSAGES_STORE, 'readwrite');
    const msgStore = tx.objectStore(CHAT_MESSAGES_STORE);

    const chatMessage: ChatMessage = {
        ...message,
        content: encryptedContent,
        contactId,
        timestamp: message.timestamp ?? Date.now(),
    };

    await msgStore.put(chatMessage);
    await tx.done;
    await updateItemTimestamp(userId, CHAT_LIST_STORE, contactId);
};

/**
 * Adds a group message to the database and updates the group's lastAccessed timestamp.
 * The message content is encrypted before being stored.
 */
export const addGroupMessage = async (
    userId: string,
    message: GroupMessage
): Promise<void> => {
    const db = await getDb(userId);
    const key = await getKey();
    const encryptedContent = encryptAES(message.content, key);

    const tx = db.transaction(GROUP_MESSAGES_STORE, 'readwrite');
    const msgStore = tx.objectStore(GROUP_MESSAGES_STORE);

    const groupMessage: GroupMessage = {
        ...message,
        content: encryptedContent,
        timestamp: message.timestamp ?? Date.now(),
    };

    await msgStore.put(groupMessage);
    await tx.done;
    await updateItemTimestamp(userId, GROUP_STORE, message.groupId);
};

/**
 * Adds an announcement message to the database and updates the announcement group's lastAccessed timestamp.
 * The message content is encrypted before being stored.
 */
export const addAnnouncementMessage = async (
    userId: string,
    message: GroupMessage
): Promise<void> => {
    const db = await getDb(userId);
    const key = await getKey();
    const encryptedContent = encryptAES(message.content, key);

    const tx = db.transaction(ANNOUNCEMENT_MESSAGES_STORE, 'readwrite');
    const msgStore = tx.objectStore(ANNOUNCEMENT_MESSAGES_STORE);

    const announcementMessage: GroupMessage = {
        ...message,
        content: encryptedContent,
        timestamp: message.timestamp ?? Date.now(),
    };

    await msgStore.put(announcementMessage);
    await tx.done;
    await updateItemTimestamp(userId, ANNOUNCEMENT_STORE, message.groupId);
};

/**
 * Retrieves and decrypts all chat messages for a specific contact.
 */
export const getChatMessages = async (userId: string, contactId: string): Promise<ChatMessage[]> => {
    const db = await getDb(userId);
    const key = await getKey();
    const messages = await db.getAllFromIndex(CHAT_MESSAGES_STORE, 'by-contactId', contactId);
    return messages.map(msg => ({
        ...msg,
        content: decryptAES(msg.content, key),
    }));
};

/**
 * Retrieves and decrypts all group messages for a specific group.
 */
export const getGroupMessages = async (userId: string, groupId: string): Promise<GroupMessage[]> => {
    const db = await getDb(userId);
    const key = await getKey();
    const messages = await db.getAllFromIndex(GROUP_MESSAGES_STORE, 'by-groupId', groupId);
    return messages.map(msg => ({
        ...msg,
        content: decryptAES(msg.content, key),
    }));
};

/**
 * Retrieves and decrypts all announcement messages for a specific announcement group.
 */
export const getAnnouncementMessages = async (userId: string, groupId: string): Promise<GroupMessage[]> => {
    const db = await getDb(userId);
    const key = await getKey();
    const messages = await db.getAllFromIndex(ANNOUNCEMENT_MESSAGES_STORE, 'by-groupId', groupId);
    return messages.map(msg => ({
        ...msg,
        content: decryptAES(msg.content, key),
    }));
};

/**
 * Counts unread chat messages for a specific contact.
 */
export const getUnreadChatMessagesCount = async (userId: string, contactId: string): Promise<number> => {
    const db = await getDb(userId);
    const messages = await db.getAllFromIndex(CHAT_MESSAGES_STORE, 'by-contactId', contactId);
    return messages.filter(msg => !msg.readStatus).length;
};

/**
 * Counts unread messages for a specific group.
 */
export const getUnreadGroupMessagesCount = async (userId: string, groupId: string): Promise<number> => {
    const db = await getDb(userId);
    const messages = await db.getAllFromIndex(GROUP_MESSAGES_STORE, 'by-groupId', groupId);
    return messages.filter(msg => !msg.readStatus).length;
};

/**
 * Counts unread messages for a specific announcement group.
 */
export const getUnreadAnnouncementMessagesCount = async (userId: string, groupId: string): Promise<number> => {
    const db = await getDb(userId);
    const messages = await db.getAllFromIndex(ANNOUNCEMENT_MESSAGES_STORE, 'by-groupId', groupId);
    return messages.filter(msg => !msg.readStatus).length;
};

/**
 * Marks all chat messages for a specific contact as read.
 */
export const markChatRead = async (userId: string, contactId: string): Promise<void> => {
    const db = await getDb(userId);
    const tx = db.transaction(CHAT_MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(CHAT_MESSAGES_STORE);
    const index = store.index('by-contactId');
    let cursor = await index.openCursor(contactId);

    while (cursor) {
        const message = { ...cursor.value, readStatus: true };
        cursor.update(message);
        cursor = await cursor.continue();
    }
    await tx.done;
};

/**
 * Marks all group messages for a specific group as read.
 */
export const markGroupRead = async (userId: string, groupId: string): Promise<void> => {
    const db = await getDb(userId);
    const tx = db.transaction(GROUP_MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(GROUP_MESSAGES_STORE);
    const index = store.index('by-groupId');
    let cursor = await index.openCursor(groupId);

    while (cursor) {
        const message = { ...cursor.value, readStatus: true };
        cursor.update(message);
        cursor = await cursor.continue();
    }
    await tx.done;
};

/**
 * Marks all announcement messages for a specific announcement group as read.
 */
export const markAnnouncementRead = async (userId: string, groupId: string): Promise<void> => {
    const db = await getDb(userId);
    const tx = db.transaction(ANNOUNCEMENT_MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(ANNOUNCEMENT_MESSAGES_STORE);
    const index = store.index('by-groupId');
    let cursor = await index.openCursor(groupId);

    while (cursor) {
        const message = { ...cursor.value, readStatus: true };
        cursor.update(message);
        cursor = await cursor.continue();
    }
    await tx.done;
};
