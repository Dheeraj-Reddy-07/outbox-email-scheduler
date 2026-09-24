export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
}

export interface EmailJob {
  id: string;
  campaignId: string;
  recipientEmail: string;
  status: 'PENDING' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt?: string;
  sentAt?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    subject: string;
  };
}

export interface CreateCampaignRequest {
  subject: string;
  body: string;
  startAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  recipientEmails: string[];
}

export interface ParseRecipientsRequest {
  content: string;
  contentType: 'csv' | 'txt';
}

export interface ParseRecipientsResponse {
  validEmails: string[];
  invalidEmails: string[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
}