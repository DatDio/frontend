import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'vi' | 'en';

export interface LanguageOption {
    code: Language;
    name: string;
    flag: string;
}

/**
 * Service for managing application language/locale.
 * Supports Vietnamese (default) and English.
 * Persists user preference in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
    private readonly STORAGE_KEY = 'preferred_language';
    private readonly DEFAULT_LANG: Language = 'vi';
    private readonly platformId = inject(PLATFORM_ID);

    readonly supportedLanguages: LanguageOption[] = [
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'en', name: 'English', flag: '🇬🇧' }
    ];

    private _currentLang$ = new BehaviorSubject<Language>(this.DEFAULT_LANG);
    currentLang$ = this._currentLang$.asObservable();

    private translate = inject(TranslateService);

    constructor() {
        this.initLanguage();
    }

    /**
     * Initialize language on app start.
     * Reads from localStorage (browser only) or uses default.
     */
    private initLanguage(): void {
        // Set available languages
        this.translate.addLangs(['vi', 'en']);
        this.translate.setDefaultLang(this.DEFAULT_LANG);

        // Only access localStorage in browser
        if (isPlatformBrowser(this.platformId)) {
            const savedLang = localStorage.getItem(this.STORAGE_KEY) as Language;
            const langToUse = this.isValidLanguage(savedLang) ? savedLang : this.DEFAULT_LANG;
            this.setLanguage(langToUse);
        } else {
            // SSR: use default language
            this.translate.use(this.DEFAULT_LANG);
        }
    }

    /**
     * Change current language.
     * Updates TranslateService and persists to localStorage.
     */
    setLanguage(lang: Language): void {
        if (!this.isValidLanguage(lang)) {
            lang = this.DEFAULT_LANG;
        }

        this.translate.use(lang);
        this._currentLang$.next(lang);

        // Persist to localStorage (browser only)
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(this.STORAGE_KEY, lang);
        }
    }

    /**
     * Get current language code.
     */
    getCurrentLanguage(): Language {
        return this._currentLang$.value;
    }

    /**
     * Toggle between Vietnamese and English.
     */
    toggleLanguage(): void {
        const current = this.getCurrentLanguage();
        const newLang: Language = current === 'vi' ? 'en' : 'vi';
        this.setLanguage(newLang);
    }

    /**
     * Get language option by code.
     */
    getLanguageOption(code: Language): LanguageOption | undefined {
        return this.supportedLanguages.find(lang => lang.code === code);
    }

    /**
     * Get current language option.
     */
    getCurrentLanguageOption(): LanguageOption {
        return this.getLanguageOption(this.getCurrentLanguage()) || this.supportedLanguages[0];
    }

    /**
     * Check if language code is valid.
     */
    private isValidLanguage(lang: string | null): lang is Language {
        return lang === 'vi' || lang === 'en';
    }

    /**
     * Check if current language is Vietnamese.
     */
    isVietnamese(): boolean {
        return this.getCurrentLanguage() === 'vi';
    }

    /**
     * Check if current language is English.
     */
    isEnglish(): boolean {
        return this.getCurrentLanguage() === 'en';
    }
}
