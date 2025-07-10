import { generateRSAKeyPair } from './RSA_utils';

interface KeyPair {
    id: string;
    publicKey: string;
    privateKey: string;
}

export class KeyManager {
    private static currentKeys: KeyPair | null = null;
    private static pastKeys: KeyPair | null = null;
    private static lastReroll: Date | null = null;

    /**
     * Initializes the KeyManager with initial key pairs
     * Generates new RSA key pairs if not provided
     */
    public static initialize(): void {
        // Generate initial current keys
        const [privateKey, publicKey] = generateRSAKeyPair();
        this.currentKeys = {
            id: this.generateKeyId(),
            publicKey,
            privateKey
        };

        // Initialize past keys as null (no previous keys on first init)
        this.pastKeys = null;
        
        // Set initial reroll time
        this.lastReroll = new Date();
        
        console.log('KeyManager initialized with new key pair');
    }

    /**
     * Rerolls the keys - moves current to past and generates new current keys
     * Only executes if at least 5 minutes have passed since last reroll
     * @returns boolean indicating if reroll was successful
     */
    public static reroll(): boolean {
        // Check if enough time has passed since last reroll (5 minutes = 300,000 ms)
        if (this.lastReroll) {
            const timeSinceLastReroll = Date.now() - this.lastReroll.getTime();
            const fiveMinutesInMs = 5 * 60 * 1000;
            
            if (timeSinceLastReroll < fiveMinutesInMs) {
                return false;
            }
        }

        // Move current keys to past keys
        this.pastKeys = this.currentKeys;

        // Generate new current keys
        const [privateKey, publicKey] = generateRSAKeyPair();
        this.currentKeys = {
            id: this.generateKeyId(),
            publicKey,
            privateKey
        };

        // Update last reroll timestamp
        this.lastReroll = new Date();

        console.log('Key reroll successful - new keys generated');
        return true;
    }

    /**
     * Gets the current public key
     * @returns string current public key or null if not initialized
     */
    public static getCurrentPublicKey(): string | null {
        return this.currentKeys?.publicKey || null;
    }

    /**
     * Gets the current private key
     * @returns string current private key or null if not initialized
     */
    public static getCurrentPrivateKey(): string | null {
        return this.currentKeys?.privateKey || null;
    }

    /**
     * Gets the past public key
     * @returns string past public key or null if not available
     */
    public static getPastPublicKey(): string | null {
        return this.pastKeys?.publicKey || null;
    }

    /**
     * Gets the past private key
     * @returns string past private key or null if not available
     */
    public static getPastPrivateKey(): string | null {
        return this.pastKeys?.privateKey || null;
    }

    /**
     * Gets the current key pair ID
     * @returns string current key ID or null if not initialized
     */
    public static getCurrentKeyId(): string | null {
        return this.currentKeys?.id || null;
    }

    /**
     * Gets the past key pair ID
     * @returns string past key ID or null if not available
     */
    public static getPastKeyId(): string | null {
        return this.pastKeys?.id || null;
    }

    /**
     * Gets the timestamp of the last reroll
     * @returns Date last reroll timestamp or null if never rerolled
     */
    public static getLastRerollTime(): Date | null {
        return this.lastReroll;
    }

    /**
     * Gets a private key by key ID (checks both current and past keys)
     * @param keyId The key ID to search for
     * @returns string private key or null if not found
     */
    public static getPrivateKey(keyId: string): string | null {
        // Check current keys first
        if (this.currentKeys?.id === keyId) {
            return this.currentKeys.privateKey;
        }
        
        // Check past keys
        if (this.pastKeys?.id === keyId) {
            return this.pastKeys.privateKey;
        }
        
        // Key ID not found
        return null;
    }

    /**
     * Gets a public key by key ID (checks both current and past keys)
     * @param keyId The key ID to search for
     * @returns string public key or null if not found
     */
    public static getPublicKey(keyId: string): string | null {
        // Check current keys first
        if (this.currentKeys?.id === keyId) {
            return this.currentKeys.publicKey;
        }
        
        // Check past keys
        if (this.pastKeys?.id === keyId) {
            return this.pastKeys.publicKey;
        }
        
        // Key ID not found
        return null;
    }

    /**
     * Generates a unique key ID based on timestamp and random string
     * @returns string unique key identifier
     */
    private static generateKeyId(): string {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `key_${timestamp}_${randomStr}`;
    }

    /**
     * Checks if the KeyManager has been initialized
     * @returns boolean indicating initialization status
     */
    public static isInitialized(): boolean {
        return this.currentKeys !== null;
    }
}