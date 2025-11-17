export enum MailProvider {
  GMAIL = 'Gmail',
  OUTLOOK = 'Outlook',
  YAHOO = 'Yahoo',
  CUSTOM = 'Custom'
}

export enum MailAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SOLD = 'SOLD'
}

export interface MailAccount {
  id: string;
  email: string;
  password: string;
  provider: MailProvider;
  status: MailAccountStatus;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMailAccountRequest {
  email: string;
  password: string;
  provider: MailProvider;
}

export interface UpdateMailAccountRequest {
  email?: string;
  password?: string;
  provider?: MailProvider;
  status?: MailAccountStatus;
}

export interface BulkUpdateStatusRequest {
  ids: string[];
  status: MailAccountStatus;
}
