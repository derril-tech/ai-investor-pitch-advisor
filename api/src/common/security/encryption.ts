import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltRounds = 10000;

  constructor(private configService: ConfigService) {}

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string, key?: string): string {
    const encryptionKey = key || this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipher(this.algorithm, encryptionKey);
    cipher.setAAD(Buffer.from('pitch-advisor')); // Additional authenticated data

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    return Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]).toString('base64');
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: string, key?: string): string {
    const encryptionKey = key || this.getEncryptionKey();
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract IV, encrypted data, and auth tag
    const iv = buffer.subarray(0, this.ivLength);
    const authTag = buffer.subarray(-16); // Last 16 bytes are auth tag
    const encrypted = buffer.subarray(this.ivLength, -16);

    const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
    decipher.setAAD(Buffer.from('pitch-advisor'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, this.saltRounds, 64, 'sha512');

    return `${actualSalt}:${hash.toString('hex')}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    const [salt, hash] = hashedData.split(':');
    const newHash = crypto.pbkdf2Sync(data, salt, this.saltRounds, 64, 'sha512');

    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), newHash);
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt file data
   */
  encryptFile(fileData: Buffer, key?: string): Buffer {
    const encryptionKey = key || this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipher(this.algorithm, encryptionKey);
    cipher.setAAD(Buffer.from('pitch-advisor-file'));

    const encrypted = Buffer.concat([
      iv,
      cipher.update(fileData),
      cipher.final(),
      cipher.getAuthTag()
    ]);

    return encrypted;
  }

  /**
   * Decrypt file data
   */
  decryptFile(encryptedData: Buffer, key?: string): Buffer {
    const encryptionKey = key || this.getEncryptionKey();

    // Extract components
    const iv = encryptedData.subarray(0, this.ivLength);
    const authTag = encryptedData.subarray(-16);
    const encrypted = encryptedData.subarray(this.ivLength, -16);

    const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
    decipher.setAAD(Buffer.from('pitch-advisor-file'));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted;
  }

  /**
   * Generate encryption key from password
   */
  deriveKey(password: string, salt: string): string {
    const key = crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
    return key.toString('hex');
  }

  /**
   * Get encryption key from environment or generate one
   */
  private getEncryptionKey(): string {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    // Ensure key is the right length
    if (key.length !== this.keyLength * 2) {
      throw new Error('ENCRYPTION_KEY must be 256 bits (64 hex characters)');
    }

    return key;
  }

  /**
   * Create encrypted database field transformer
   */
  createFieldTransformer() {
    return {
      to: (value: string) => value ? this.encrypt(value) : value,
      from: (value: string) => value ? this.decrypt(value) : value,
    };
  }
}

// Database field encryption decorator
export function EncryptedField() {
  return function (target: any, propertyName: string) {
    const encryptionService = new EncryptionService(null);

    Object.defineProperty(target, propertyName, {
      get: function () {
        return this[`_${propertyName}`];
      },
      set: function (value: string) {
        this[`_${propertyName}`] = value ? encryptionService.encrypt(value) : value;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

// Utility functions for common encryption tasks
export class EncryptionUtils {
  static generateSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static validateEncryptionKey(key: string): boolean {
    return key.length === 64 && /^[a-f0-9]+$/i.test(key);
  }

  static hashPassword(password: string): string {
    const salt = this.generateSalt();
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
    return `${salt}:${hash.toString('hex')}`;
  }

  static verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const newHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), newHash);
  }
}
