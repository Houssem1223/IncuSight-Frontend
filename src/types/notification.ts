export type NotificationType = string;

export type Notification = {
  id: string;
  userId?: string;
  title?: string;
  message?: string;
  type?: NotificationType;
  isRead?: boolean;
  readAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  applicationId?: string;
  programId?: string;
  evaluationId?: string;
  decisionId?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};
