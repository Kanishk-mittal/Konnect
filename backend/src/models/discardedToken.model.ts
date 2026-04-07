import { Schema, model, Document } from 'mongoose';

export interface IDiscardedToken extends Document {
  token: string;
  expiresAt: Date;
}

const discardedTokenSchema = new Schema<IDiscardedToken>({
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// TTL index to automatically remove the document when expiresAt is reached
discardedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model<IDiscardedToken>('DiscardedToken', discardedTokenSchema);
