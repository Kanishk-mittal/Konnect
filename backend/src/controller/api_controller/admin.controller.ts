import { Request, Response } from 'express';
// import { OTP } from '../../utils/otp.utils';
import { validateAdminLoginData, AdminLoginData } from '../../inputSchema/admin.schema';
import { verifyHash } from '../../utils/encryption/hash.utils';
// import { encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { generateAESKeyFromString, decryptAES } from '../../utils/encryption/aes.utils';
// import { sendOTPEmail } from '../../utils/mailer.utils';
import UserModel from '../../models/user.model';
// import { checkExistingAdmin } from '../../services/admin.services';
// import type { AdminDocument } from '../../models/admin.model';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';

// Admin Login Controller - Removed
// Admin Logout Controller - Removed