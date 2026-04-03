import { type DBSchema } from 'idb';

export const DB_VERSION = 3; // Incremented version for message schema addition

// Define store names as constants
export const CHAT_LIST_STORE = 'chats';
export const GROUP_STORE = 'groups';
export const ANNOUNCEMENT_STORE = 'announcements';
export const KEY_STORE = 'keys'; // New store for crypto keys
export const CHAT_MESSAGES_STORE = 'chatMessages'; // Store for direct chat messages
export const GROUP_MESSAGES_STORE = 'groupMessages'; // Store for group messages
export const ANNOUNCEMENT_MESSAGES_STORE = 'announcementMessages'; // Store for announcement group messages

// Define a union type for store names for type safety
export type ListStoreName = typeof CHAT_LIST_STORE | typeof GROUP_STORE | typeof ANNOUNCEMENT_STORE;

// Define the shape of the data in our stores
export interface ContactListItem {
  id: string;
  name: string;
  profilePicture: string | null;
  lastAccessed: number;
}

// Specific type for chat list items, extending ContactListItem with an optional publicKey
export interface ChatListItem extends ContactListItem {
  publicKey?: string;
}

// Base message interface with common attributes
export interface BaseMessage {
  senderId: string;
  message: string;
  readStatus: boolean;
  timestamp?: number; // Optional timestamp
}

// Chat message schema (direct messages between users)
export interface ChatMessage extends BaseMessage {
  id: string;
}

// Group message schema (messages in regular groups)
export interface GroupMessage extends BaseMessage {
  id: string;
  groupId: string;
}

// Announcement message schema (messages in announcement groups)
export interface AnnouncementMessage extends BaseMessage {
  id: string;
  groupId: string;
}

// Define the database schema
export interface KonnectDBSchema extends DBSchema {
  [CHAT_LIST_STORE]: {
    key: string;
    value: ChatListItem;
    indexes: { 'by-lastAccessed': number };
  };
  [GROUP_STORE]: {
    key: string;
    value: ContactListItem;
    indexes: { 'by-lastAccessed': number };
  };
  [ANNOUNCEMENT_STORE]: {
    key: string;
    value: ContactListItem;
    indexes: { 'by-lastAccessed': number };
  };
  [KEY_STORE]: {
    key: string; // Key will be the user's ID
    value: CryptoKey; // Value is the non-extractable CryptoKey
  };
  [CHAT_MESSAGES_STORE]: {
    key: string; // Message ID
    value: ChatMessage;
    indexes: { 'by-senderId': string; 'by-timestamp': number };
  };
  [GROUP_MESSAGES_STORE]: {
    key: string; // Message ID
    value: GroupMessage;
    indexes: { 'by-groupId': string; 'by-senderId': string; 'by-timestamp': number };
  };
  [ANNOUNCEMENT_MESSAGES_STORE]: {
    key: string; // Message ID
    value: AnnouncementMessage;
    indexes: { 'by-groupId': string; 'by-senderId': string; 'by-timestamp': number };
  };
}
