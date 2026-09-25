import { Router } from 'express';
import multer from 'multer';
import {
  uploadAttachmentController,
  deleteAttachmentController,
} from '../controllers/attachment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Configure multer for memory storage (files will be validated and stored by our storage service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
});

// Upload attachments
router.post('/', requireAuth, upload.array('attachments', 10), uploadAttachmentController);

// Delete an attachment
router.delete('/:id', requireAuth, deleteAttachmentController);

export default router;