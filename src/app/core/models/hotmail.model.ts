/**
 * Request DTO for getting verification code from Hotmail
 */
export interface HotmailGetCodeRequest {
    /** Email data format: email|password|refresh_token|client_id (multiple lines supported) */
    emailData: string;
    /** Type of get method: Graph API or Oauth2 */
    getType: 'Graph API' | 'Oauth2';
    /** Types of email/services to get code for (supports multi-select) */
    emailTypes: string[];
}

/**
 * Response DTO containing verification code information
 */
export interface HotmailGetCodeResponse {
    email: string;
    password?: string;
    status: boolean;
    code?: string;
    content?: string;
    date?: string;
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
    | 'Telegram'
    | 'Google'
    | 'WeChat';

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
    'Telegram',
    'Google',
    'WeChat'
];

/**
 * Supported get types
 */
export const GET_TYPES: Array<'Graph API' | 'Oauth2'> = ['Graph API', 'Oauth2'];

