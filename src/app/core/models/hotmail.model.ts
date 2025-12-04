/**
 * Request DTO for getting verification code from Hotmail
 */
export interface HotmailGetCodeRequest {
    /** Email data format: email|password|refresh_token|client_id */
    emailData: string;
    /** Type of get method: Pop3 or Oauth2 */
    getType: 'Pop3' | 'Oauth2';
    /** Type of email/service to get code for */
    emailType: EmailType;
}

/**
 * Response DTO containing verification code information
 */
export interface HotmailGetCodeResponse {
    email: string;
    subject?: string;
    code?: string;
    sender?: string;
    receivedTime?: string;
    body?: string;
}

/**
 * Supported email types for verification code extraction
 */
export type EmailType =
    | 'Auto'
    | 'Facebook'
    | 'Instagram'
    | 'Twitter'
    | 'Apple'
    | 'Tiktok'
    | 'Amazon'
    | 'Lazada'
    | 'Shopee'
    | 'KakaoTalk'
    | 'Telegram';

/**
 * List of all supported email types
 */
export const EMAIL_TYPES: EmailType[] = [
    'Auto',
    'Facebook',
    'Instagram',
    'Twitter',
    'Apple',
    'Tiktok',
    'Amazon',
    'Lazada',
    'Shopee',
    'KakaoTalk',
    'Telegram'
];

/**
 * Supported get types
 */
export const GET_TYPES: Array<'Pop3' | 'Oauth2'> = ['Pop3', 'Oauth2'];
