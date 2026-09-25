import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface AttachmentValidationConfig {
  maxFiles: number;
  maxFileSize: number;
  maxTotalSize: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
}

export const DEFAULT_ATTACHMENT_CONFIG: AttachmentValidationConfig = {
  maxFiles: 10,
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxTotalSize: 25 * 1024 * 1024, // 25 MB
  allowedExtensions: [
    // Documents
    '.pdf', '.doc', '.docx', '.txt',
    // Spreadsheets
    '.xls', '.xlsx', '.csv',
    // Presentations
    '.ppt', '.pptx',
    // Images
    '.png', '.jpg', '.jpeg', '.webp',
  ],
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    // Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Images
    'image/png',
    'image/jpeg',
    'image/webp',
  ],
};

export interface UploadedFile {
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class StorageService {
  private uploadDir: string;
  private config: AttachmentValidationConfig;

  constructor(uploadDir: string, config: AttachmentValidationConfig = DEFAULT_ATTACHMENT_CONFIG) {
    this.uploadDir = uploadDir;
    this.config = config;
  }

  async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  generateSafeFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename).toLowerCase();
    const baseName = path.basename(originalFilename, ext);
    
    // Sanitize filename: remove special characters, spaces
    const sanitizedBase = baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50); // Limit length
    
    // Add random suffix for uniqueness
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    
    return `${sanitizedBase}_${randomSuffix}${ext}`;
  }

  validateFile(file: {
    originalname: string;
    mimetype: string;
    size: number;
  }, currentTotalSize: number = 0): ValidationError | null {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        field: 'size',
        message: `File size exceeds maximum of ${this.formatBytes(this.config.maxFileSize)}`,
      };
    }

    // Check total size
    if (currentTotalSize + file.size > this.config.maxTotalSize) {
      return {
        field: 'totalSize',
        message: `Total attachment size exceeds maximum of ${this.formatBytes(this.config.maxTotalSize)}`,
      };
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.config.allowedExtensions.includes(ext)) {
      return {
        field: 'extension',
        message: `File type ${ext} is not allowed`,
      };
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      return {
        field: 'mimeType',
        message: `MIME type ${file.mimetype} is not allowed`,
      };
    }

    // Check for path traversal in filename
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return {
        field: 'filename',
        message: 'Invalid filename',
      };
    }

    return null;
  }

  async storeFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<UploadedFile> {
    await this.ensureUploadDir();

    const storedFilename = this.generateSafeFilename(originalFilename);
    const storagePath = path.join(this.uploadDir, storedFilename);

    await fs.writeFile(storagePath, fileBuffer);

    return {
      originalFilename,
      storedFilename,
      mimeType,
      sizeBytes: fileBuffer.length,
      storagePath,
    };
  }

  async getFile(storedFilename: string): Promise<Buffer> {
    const storagePath = path.join(this.uploadDir, storedFilename);
    return await fs.readFile(storagePath);
  }

  async deleteFile(storedFilename: string): Promise<void> {
    const storagePath = path.join(this.uploadDir, storedFilename);
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      console.error(`Failed to delete file ${storedFilename}:`, error);
    }
  }

  async deleteFiles(storedFilenames: string[]): Promise<void> {
    await Promise.allSettled(
      storedFilenames.map(filename => this.deleteFile(filename))
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getConfig(): AttachmentValidationConfig {
    return { ...this.config };
  }
}

// Create singleton instance
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
export const storageService = new StorageService(uploadDir);