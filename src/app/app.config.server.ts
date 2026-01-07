import { ApplicationConfig, mergeApplicationConfig, importProvidersFrom, PLATFORM_ID, inject } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { isPlatformServer } from '@angular/common';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { appConfig } from './app.config';

// Import translations directly for SSR
import viTranslations from '../assets/i18n/vi.json';
import enTranslations from '../assets/i18n/en.json';

/**
 * Custom TranslateLoader for SSR that uses bundled translations.
 * This avoids HTTP requests during server-side rendering.
 */
export class TranslateServerLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    switch (lang) {
      case 'en':
        return of(enTranslations);
      case 'vi':
      default:
        return of(viTranslations);
    }
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // Provide server-side TranslateLoader
    {
      provide: TranslateLoader,
      useClass: TranslateServerLoader
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
