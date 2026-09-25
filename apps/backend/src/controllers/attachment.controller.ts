import { Request, Response } from 'express';
import { storageService, DEFAULT_ATTACHMENT_CONFIG } from '../config/storage.js';
import prisma from '../config/database.js';

export async function uploadAttachmentController(req: Request, res: Response) {
  const storedFilenames: string[] = [];
  
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check file count limit
    if (files.length > DEFAULT_ATTACHMENT_CONFIG.maxFiles) {
      return res.status(400).json({ 
        error: `Maximum ${DEFAULT_ATTACHMENT_CONFIG.maxFiles} files allowed` 
      });
    }

    const uploadedAttachments: Array<{
      id: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
    }> = [];
    let currentTotalSize = 0;
    const errors: Array<{ filename: string; error: string }> = [];

    for (const file of files) {
      // Validate file
      const validationError = storageService.validateFile(file, currentTotalSize);
      
      if (validationError) {
        errors.push({
          filename: file.originalname,
          error: validationError.message,
        });
        
        // Clean up any files that were already stored
        await storageService.deleteFiles(storedFilenames);
        
        return res.status(400).json({ 
          error: validationError.message,
          details: errors,
        });
      }

      // Store file
      const uploadedFile = await storageService.storeFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      storedFilenames.push(uploadedFile.storedFilename);

      const attachment = await prisma.emailAttachment.create({
        data: {
          campaignId: null,
          originalFilename: uploadedFile.originalFilename,
          storedFilename: uploadedFile.storedFilename,
          mimeType: uploadedFile.mimeType,
          sizeBytes: uploadedFile.sizeBytes,
        },
      });

      uploadedAttachments.push({
        id: attachment.id,
        originalFilename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      });

      currentTotalSize += file.size;
    }

    // Clear stored filenames array since upload was successful
    storedFilenames.length = 0;

    res.status(201).json({
      message: 'Attachments uploaded successfully',
      attachments: uploadedAttachments,
      totalSize: currentTotalSize,
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    
    // Clean up any files that were stored before the error
    if (storedFilenames.length > 0) {
      await storageService.deleteFiles(storedFilenames);
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload attachments' 
    });
  }
}

export async function deleteAttachmentController(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Find attachment
    const attachment = await prisma.emailAttachment.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Check ownership
    if (!attachment.campaign || attachment.campaign.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete from storage
    await storageService.deleteFile(attachment.storedFilename);

    // Delete from database
    await prisma.emailAttachment.delete({
      where: { id },
    });

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete attachment' 
    });
  }
}