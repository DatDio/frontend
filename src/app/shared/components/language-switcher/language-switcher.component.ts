import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService, Language, LanguageOption } from '../../../core/services/language.service';

/**
 * Language switcher dropdown component.
 * Displays current language with flag and allows user to switch between Vietnamese and English.
 */
@Component({
    selector: 'app-language-switcher',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './language-switcher.component.html',
    styleUrls: ['./language-switcher.component.scss']
})
export class LanguageSwitcherComponent {
    private readonly languageService = inject(LanguageService);

    currentLang$ = this.languageService.currentLang$;
    supportedLanguages = this.languageService.supportedLanguages;

    /**
     * Get current language option for display.
     */
    getCurrentLanguageOption(): LanguageOption {
        return this.languageService.getCurrentLanguageOption();
    }

    /**
     * Switch to specified language.
     */
    switchLanguage(lang: Language): void {
        this.languageService.setLanguage(lang);
    }

    /**
     * Check if language is currently selected.
     */
    isCurrentLanguage(lang: Language): boolean {
        return this.languageService.getCurrentLanguage() === lang;
    }
}
