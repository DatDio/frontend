import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interfaces
export interface TokenRefreshResponse {
    accessToken: string;
    refreshToken: string;
    success: boolean;
    error?: string;
}

export interface GraphMessage {
    id: string;
    subject: string;
    bodyPreview: string;
    body?: { content: string; contentType: string };
    from: { emailAddress: { name: string; address: string } };
    receivedDateTime: string;
    isRead: boolean;
    hasAttachments: boolean;
}

export interface GraphMessagesResponse {
    value: GraphMessage[];
    '@odata.nextLink'?: string;
}

export interface EmailCodeResult {
    email: string;
    password?: string;
    refreshToken?: string;
    clientId?: string;
    code?: string;
    content?: string;
    date?: string;
    status: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
}

export interface CheckLiveResult {
    email: string;
    password?: string;
    refreshToken?: string;
    clientId?: string;
    isLive: boolean;
    error?: string;
    status: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
}

export interface OAuth2Result {
    email: string;
    password?: string;
    refreshToken?: string;
    clientId?: string;
    accessToken?: string;
    fullData?: string;
    status: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
    error?: string;
}

// Email type filters
const EMAIL_TYPE_PATTERNS: Record<string, string[]> = {
    facebook: ['facebook', 'fb.com'],
    instagram: ['instagram'],
    twitter: ['twitter', 'x.com'],
    apple: ['apple'],
    tiktok: ['tiktok'],
    amazon: ['amazon'],
    lazada: ['lazada'],
    shopee: ['shopee'],
    kakaotalk: ['kakao'],
    telegram: ['telegram'],
    google: ['google'],
    wechat: ['wechat', 'weixin']
};

// Code extraction regex (5-10 digit codes)
const CODE_PATTERN = /(\d{5,10})/;

// Date formatter
const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
        return '';
    }
};

@Injectable({
    providedIn: 'root'
})
export class MicrosoftGraphService {
    private readonly graphApiUrl = 'https://graph.microsoft.com/v1.0';
    private readonly tokenRefreshUrl = `${environment.apiUrl}/tools/hotmail/refresh-token`;
    private readonly defaultClientId = '9e5f94bc-e8a4-4e73-b8be-63364c29d753';

    constructor(private http: HttpClient) { }

    /**
     * Refresh OAuth2 token via backend proxy (bypasses CORS)
     */
    refreshToken(refreshToken: string, clientId?: string): Observable<TokenRefreshResponse> {
        const effectiveClientId = clientId || this.defaultClientId;

        return this.http.post<{ success: boolean; data: TokenRefreshResponse; message: string }>(
            this.tokenRefreshUrl,
            { refreshToken, clientId: effectiveClientId }
        ).pipe(
            map(response => {
                if (response.success && response.data) {
                    return response.data;
                }
                return { success: false, error: response.message, accessToken: '', refreshToken: '' };
            }),
            catchError(error => of({
                success: false,
                error: error.message || 'Token refresh failed',
                accessToken: '',
                refreshToken: ''
            }))
        );
    }

    /**
     * Read messages directly from Microsoft Graph API
     */
    readMessages(accessToken: string, top: number = 50): Observable<GraphMessage[]> {
        const url = `${this.graphApiUrl}/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime,isRead,hasAttachments`;

        return from(
            fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }).then(res => {
                if (!res.ok) throw new Error(`Graph API error: ${res.status}`);
                return res.json();
            })
        ).pipe(
            map((response: GraphMessagesResponse) => response.value || []),
            catchError(error => {
                console.error('Error reading messages:', error);
                return of([]);
            })
        );
    }

    /**
     * Extract verification code from messages
     */
    extractCode(messages: GraphMessage[], emailTypes: string[]): { code: string; content: string; date: string } | null {
        for (const msg of messages) {
            const fromAddr = msg.from?.emailAddress?.address || '';
            const subject = msg.subject || '';

            // Filter by email types
            if (!this.matchesEmailTypes(fromAddr, subject, emailTypes)) {
                continue;
            }

            // Extract code from subject
            const code = this.extractCodeFromText(subject);
            if (code) {
                return {
                    code,
                    content: subject,
                    date: formatDate(msg.receivedDateTime)
                };
            }
        }
        return null;
    }

    /**
     * Get verification code for a single email
     */
    getCode(
        email: string,
        password: string,
        refreshToken: string,
        clientId: string,
        emailTypes: string[]
    ): Observable<EmailCodeResult> {
        const effectiveClientId = clientId || this.defaultClientId;

        return this.refreshToken(refreshToken, effectiveClientId).pipe(
            switchMap(tokenResult => {
                if (!tokenResult.success || !tokenResult.accessToken) {
                    return of<EmailCodeResult>({
                        email,
                        password,
                        refreshToken,
                        clientId: effectiveClientId,
                        status: 'FAILED',
                        content: tokenResult.error || 'Token refresh failed'
                    });
                }

                return this.readMessages(tokenResult.accessToken, 50).pipe(
                    map(messages => {
                        const result = this.extractCode(messages, emailTypes);
                        if (result) {
                            return {
                                email,
                                password,
                                refreshToken: tokenResult.refreshToken || refreshToken,
                                clientId: effectiveClientId,
                                code: result.code,
                                content: result.content,
                                date: result.date,
                                status: 'SUCCESS' as const
                            };
                        }
                        return {
                            email,
                            password,
                            refreshToken: tokenResult.refreshToken || refreshToken,
                            clientId: effectiveClientId,
                            status: 'FAILED' as const,
                            content: 'No verification code found'
                        };
                    })
                );
            }),
            catchError(error => of({
                email,
                password,
                refreshToken,
                clientId: effectiveClientId,
                status: 'UNKNOWN' as const,
                content: `Error: ${error.message}`
            }))
        );
    }

    /**
     * Check if email is live (token can be refreshed)
     */
    checkLive(
        email: string,
        password: string,
        refreshToken: string,
        clientId: string
    ): Observable<CheckLiveResult> {
        const effectiveClientId = clientId || this.defaultClientId;

        return this.refreshToken(refreshToken, effectiveClientId).pipe(
            map(tokenResult => ({
                email,
                password,
                refreshToken: tokenResult.refreshToken || refreshToken,
                clientId: effectiveClientId,
                isLive: tokenResult.success,
                error: tokenResult.success ? undefined : tokenResult.error,
                status: (tokenResult.success ? 'SUCCESS' : 'FAILED') as 'SUCCESS' | 'FAILED'
            })),
            catchError(error => of({
                email,
                password,
                refreshToken,
                clientId: effectiveClientId,
                isLive: false,
                error: error.message,
                status: 'UNKNOWN' as const
            }))
        );
    }

    /**
     * Renew OAuth2 refresh token
     */
    getOAuth2(
        email: string,
        password: string,
        refreshToken: string,
        clientId: string
    ): Observable<OAuth2Result> {
        const effectiveClientId = clientId || this.defaultClientId;

        return this.refreshToken(refreshToken, effectiveClientId).pipe(
            map(tokenResult => {
                if (tokenResult.success && tokenResult.accessToken && tokenResult.refreshToken) {
                    const fullData = `${email}|${password}|${tokenResult.refreshToken}|${effectiveClientId}`;
                    return {
                        email,
                        password,
                        refreshToken: tokenResult.refreshToken,
                        clientId: effectiveClientId,
                        accessToken: tokenResult.accessToken,
                        fullData,
                        status: 'SUCCESS' as const
                    };
                }
                return {
                    email,
                    password,
                    refreshToken,
                    clientId: effectiveClientId,
                    status: 'FAILED' as const,
                    error: tokenResult.error || 'Token refresh failed'
                };
            }),
            catchError(error => of({
                email,
                password,
                refreshToken,
                clientId: effectiveClientId,
                status: 'UNKNOWN' as const,
                error: error.message
            }))
        );
    }

    /**
     * Process multiple emails in parallel with concurrency limit
     */
    async processEmailsParallel<T>(
        emailLines: string[],
        processor: (email: string, password: string, refreshToken: string, clientId: string) => Observable<T>,
        onResult: (result: T) => void,
        concurrency: number = 10
    ): Promise<void> {
        const queue = [...emailLines];
        const active: Promise<void>[] = [];

        const processNext = async (): Promise<void> => {
            if (queue.length === 0) return;

            const line = queue.shift()!;
            const parts = line.split('|');

            if (parts.length < 3) {
                return;
            }

            const email = parts[0].trim();
            const password = parts[1].trim();
            const refreshToken = parts[2].trim();
            const clientId = parts.length > 3 ? parts[3].trim() : this.defaultClientId;

            try {
                const result = await processor(email, password, refreshToken, clientId).toPromise();
                if (result) {
                    onResult(result);
                }
            } catch (error) {
                console.error('Error processing email:', email, error);
            }

            // Process next item
            await processNext();
        };

        // Start initial batch
        for (let i = 0; i < Math.min(concurrency, emailLines.length); i++) {
            active.push(processNext());
        }

        await Promise.all(active);
    }

    // ==================== Private Helpers ====================

    private matchesEmailTypes(from: string, subject: string, emailTypes: string[]): boolean {
        if (!emailTypes || emailTypes.length === 0 || emailTypes.includes('Auto')) {
            return true;
        }

        const combined = (from + ' ' + subject).toLowerCase();

        for (const type of emailTypes) {
            const patterns = EMAIL_TYPE_PATTERNS[type.toLowerCase()];
            if (patterns) {
                for (const pattern of patterns) {
                    if (combined.includes(pattern)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private extractCodeFromText(text: string): string | null {
        if (!text) return null;
        const match = text.match(CODE_PATTERN);
        return match ? match[1] : null;
    }
}
