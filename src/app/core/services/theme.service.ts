import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly THEME_KEY = 'EmailSieuRe-theme';
    private readonly themeSubject = new BehaviorSubject<Theme>('light');

    theme$ = this.themeSubject.asObservable();

    private isBrowser: boolean;

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);

        if (this.isBrowser) {
            this.initializeTheme();
        }
    }

    private initializeTheme(): void {
        const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const theme = savedTheme || 'dark';
        this.setTheme(theme);
    }

    getCurrentTheme(): Theme {
        return this.themeSubject.value;
    }

    setTheme(theme: Theme): void {
        if (!this.isBrowser) return;

        this.themeSubject.next(theme);
        localStorage.setItem(this.THEME_KEY, theme);

        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);

        // Update body class for Bootstrap compatibility
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
    }

    toggleTheme(): void {
        const newTheme = this.getCurrentTheme() === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    isDarkMode(): boolean {
        return this.getCurrentTheme() === 'dark';
    }
}
