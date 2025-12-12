/**
 * Status categories for 3-column display
 */
export type CheckStatus = 'SUCCESS' | 'FAILED' | 'UNKNOWN';

/**
 * Request DTO for getting verification code from Hotmail
 */
export interface HotmailGetCodeRequest {
    /** Email data format: email|password|refresh_token|client_id (multiple lines supported) */
    emailData: string;
    /** Types of get method: Graph API and/or Oauth2 (supports multi-select) */
    getTypes: string[];
    /** Types of email/services to get code for (supports multi-select) */
    emailTypes: string[];
}

/**
 * Response DTO containing verification code information
 */
export interface HotmailGetCodeResponse {
    email: string;
    password?: string;
    refreshToken?: string;
    clientId?: string;
    status: boolean;
    checkStatus?: CheckStatus;
    code?: string;
    content?: string;
    date?: string;
}

/**
 * Request DTO for checking if email accounts are live
 */
export interface CheckLiveMailRequest {
    /** Email data format: email|password|refresh_token|client_id (multiple lines supported) */
    emailData: string;
}

/**
 * Response DTO for check live mail result
 */
export interface CheckLiveMailResponse {
    email: string;
    password?: string;
    refreshToken?: string;
    clientId?: string;
    isLive: boolean;
    status?: CheckStatus;
    error?: string;
}

/**
 * Request DTO for getting OAuth2 access tokens
 */
export interface GetOAuth2Request {
    /** Email data format: email|password|refresh_token|client_id (multiple lines supported) */
    emailData: string;
}

/**
 * Response DTO for get OAuth2 token result
 */
export interface GetOAuth2Response {
    email: string;
    password?: string;
    refreshToken?: string;
    clientId?: string;
    accessToken?: string;
    success: boolean;
    status?: CheckStatus;
    error?: string;
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


