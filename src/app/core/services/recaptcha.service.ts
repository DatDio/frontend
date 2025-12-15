import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

declare const grecaptcha: any;

@Injectable({
    providedIn: 'root'
})
export class RecaptchaService {
    private siteKey = environment.recaptchaSiteKey;
    private scriptLoaded = false;
    private scriptLoading: Promise<void> | null = null;
    private loadError: Error | null = null;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

    /**
     * Check if reCAPTCHA is enabled
     */
    isEnabled(): boolean {
        return !!this.siteKey && this.siteKey.length > 0;
    }

    /**
     * Load the reCAPTCHA script dynamically
     */
    loadScript(): Promise<void> {
        if (!isPlatformBrowser(this.platformId)) {
            return Promise.resolve();
        }

        if (!this.isEnabled()) {
            console.warn('reCAPTCHA is not configured');
            return Promise.resolve();
        }

        if (this.scriptLoaded) {
            return Promise.resolve();
        }

        // If there was a previous load error, reset and try again
        if (this.loadError) {
            this.scriptLoading = null;
            this.loadError = null;
        }

        if (this.scriptLoading) {
            return this.scriptLoading;
        }

        this.scriptLoading = new Promise<void>((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.getElementById('recaptcha-script');
            if (existingScript) {
                // Wait for grecaptcha to be ready
                this.waitForGrecaptcha(resolve, reject, 0);
                return;
            }

            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
            script.id = 'recaptcha-script';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                this.waitForGrecaptcha(resolve, reject, 0);
            };

            script.onerror = (event) => {
                this.loadError = new Error('Failed to load reCAPTCHA script. Please check your site key.');
                console.error('reCAPTCHA script load error:', event);
                reject(this.loadError);
            };

            document.head.appendChild(script);
        });

        return this.scriptLoading;
    }

    /**
     * Wait for grecaptcha object to be available
     */
    private waitForGrecaptcha(resolve: () => void, reject: (error: Error) => void, attempts: number): void {
        if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.ready === 'function') {
            grecaptcha.ready(() => {
                this.scriptLoaded = true;
                resolve();
            });
        } else if (attempts < 50) {
            // Retry up to 50 times (5 seconds total)
            setTimeout(() => this.waitForGrecaptcha(resolve, reject, attempts + 1), 100);
        } else {
            this.loadError = new Error('reCAPTCHA failed to initialize after loading');
            reject(this.loadError);
        }
    }

    /**
     * Execute reCAPTCHA and get a token for the specified action
     * @param action The action name (e.g., 'login', 'register')
     * @returns Promise with the reCAPTCHA token (empty string if disabled/errored)
     */
    async execute(action: string): Promise<string> {
        if (!isPlatformBrowser(this.platformId)) {
            return '';
        }

        if (!this.isEnabled()) {
            console.warn('reCAPTCHA not configured, skipping verification');
            return '';
        }

        try {
            await this.loadScript();
        } catch (error) {
            console.error('Failed to load reCAPTCHA:', error);
            // Return empty token and let backend decide what to do
            throw error;
        }

        return new Promise((resolve, reject) => {
            if (typeof grecaptcha === 'undefined') {
                reject(new Error('reCAPTCHA not loaded'));
                return;
            }

            grecaptcha.ready(() => {
                grecaptcha.execute(this.siteKey, { action })
                    .then((token: string) => {
                        console.log('reCAPTCHA token generated for action:', action);
                        resolve(token);
                    })
                    .catch((error: any) => {
                        console.error('reCAPTCHA execute error:', error);
                        reject(error);
                    });
            });
        });
    }
}
