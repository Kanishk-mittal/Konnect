interface OTPEntry {
    email: string;
    otp: string;
    timestamp: number;
    expiryTime: number;
}

/**
 * Optimized OTP (One-Time Password) management class
 * Uses a combination of sorted array for timestamp-based operations
 * and a Map for efficient email lookups
 */
export class OTP {
    // Timeline-based queue of all OTPs sorted by expiry time (oldest first)
    private static otpQueue: OTPEntry[] = [];
    
    // Map for quick lookup by email
    private static otpByEmail: Map<string, OTPEntry[]> = new Map();
    
    // OTP expiry time in milliseconds
    static otpExpiry: number = 5 * 60 * 1000; // 5 minutes
    
    // No need for binary search insertion as new OTPs will always have later expiry times

    /**
     * Generate a new OTP for the given email
     * @param email - Email address for which OTP is generated
     * @returns The generated OTP
     */
    static generateOTP(email: string): string {
        // Clean expired OTPs first
        this.cleanupExpiredOTPs();
        
        // Generate OTP and timestamps
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const timestamp = Date.now();
        const expiryTime = timestamp + this.otpExpiry;
        
        // Create the new OTP entry
        const newEntry: OTPEntry = { email, otp, timestamp, expiryTime };
        
        // Simply push to the end of the queue - O(1) operation
        // Since new OTPs always have later expiry times than existing ones
        this.otpQueue.push(newEntry);
        
        // Add to the email map for quick lookup
        if (!this.otpByEmail.has(email)) {
            this.otpByEmail.set(email, []);
        }
        
        const emailEntries = this.otpByEmail.get(email);
        if (emailEntries) {
            emailEntries.unshift(newEntry); // Most recent first
        }
        
        return otp;
    }
    
    /**
     * Verify if the provided OTP is valid for the given email
     * @param email - Email address to verify
     * @param otpToVerify - OTP to be verified
     * @returns Boolean indicating if the OTP is valid
     */
    static verifyOTP(email: string, otpToVerify: string): boolean {
        this.cleanupExpiredOTPs();
        
        // Use the email map for O(1) lookup
        const emailEntries = this.otpByEmail.get(email);
        if (!emailEntries || emailEntries.length === 0) {
            return false;
        }
        
        // Check the most recent OTP (first in the array)
        const mostRecentEntry = emailEntries[0];
        if (mostRecentEntry && mostRecentEntry.otp === otpToVerify) {
            // Remove from the main queue
            const queueIndex = this.otpQueue.findIndex(entry => 
                entry.email === email && entry.otp === otpToVerify
            );
            
            if (queueIndex >= 0) {
                this.otpQueue.splice(queueIndex, 1);
            }
            
            // Remove from the email map
            emailEntries.shift();
            if (emailEntries.length === 0) {
                this.otpByEmail.delete(email);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Remove expired OTPs from the queue
     * This takes advantage of the queue being sorted by expiry time
     */
    private static cleanupExpiredOTPs(): void {
        if (this.otpQueue.length === 0) return;
        
        const currentTime = Date.now();
        
        // Since entries are sorted by expiry time, we can efficiently
        // remove all expired entries in one operation
        let expiredCount = 0;
        
        while (expiredCount < this.otpQueue.length) {
            const entry = this.otpQueue[expiredCount];
            if (entry && entry.expiryTime < currentTime) {
                // Also remove from the email map
                const emailEntries = this.otpByEmail.get(entry.email);
                
                if (emailEntries) {
                    // Remove this specific entry from the email array
                    const emailIndex = emailEntries.findIndex(e => 
                        e.otp === entry.otp && 
                        e.timestamp === entry.timestamp
                    );
                    
                    if (emailIndex >= 0) {
                        emailEntries.splice(emailIndex, 1);
                    }
                    
                    // If no more entries for this email, remove the key
                    if (emailEntries.length === 0) {
                        this.otpByEmail.delete(entry.email);
                    }
                }
                expiredCount++;
            } else {
                break; // No more expired entries
            }
        }
        
        // Remove all expired entries at once from the queue
        if (expiredCount > 0) {
            this.otpQueue = this.otpQueue.slice(expiredCount);
        }
    }
}