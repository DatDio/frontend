import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { SystemSettingService } from './system-setting.service';

const CACHE_KEY = 'usd_vnd_rate';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedRate {
    rate: number;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class CurrencyService {
    private readonly systemSettingService = inject(SystemSettingService);

    private usdVndRateSubject = new BehaviorSubject<number>(26000); // Default rate
    public usdVndRate$ = this.usdVndRateSubject.asObservable();

    constructor() {
        this.initExchangeRate();
    }

    /**
     * Initialize exchange rate - ALWAYS fetch from API on app load
     * localStorage is only used as fallback if API fails
     */
    private initExchangeRate(): void {
        // Always fetch fresh from API on app load
        this.fetchExchangeRate().subscribe();
    }

    /**
     * Fetch exchange rate from API and cache it
     */
    fetchExchangeRate(): Observable<number> {
        return this.systemSettingService.getPublicSettings().pipe(
            map(res => {
                if (res.success && res.data) {
                    const rateStr = res.data['fpayment.usd_vnd_rate'];
                    if (rateStr) {
                        return parseInt(rateStr, 10) || 26000;
                    }
                }
                return 26000;
            }),
            tap(rate => {
                this.usdVndRateSubject.next(rate);
                this.cacheRate(rate);
            }),
            catchError(() => {
                // On error, use cached or default
                const cached = this.getCachedRate();
                return of(cached?.rate || 26000);
            })
        );
    }

    /**
     * Get current exchange rate synchronously
     */
    getRate(): number {
        return this.usdVndRateSubject.getValue();
    }

    /**
     * Convert VND to USD
     */
    convertVndToUsd(vnd: number): number {
        const rate = this.getRate();
        if (!rate || rate <= 0) return 0;
        return vnd / rate;
    }

    /**
     * Convert USD to VND
     */
    convertUsdToVnd(usd: number): number {
        const rate = this.getRate();
        return usd * rate;
    }

    /**
     * Format VND with USD equivalent
     * Example: "50,000 VNĐ (~$1.92)"
     */
    formatVndWithUsd(vnd: number): string {
        const formattedVnd = vnd.toLocaleString('vi-VN');
        const usd = this.convertVndToUsd(vnd);
        const formattedUsd = usd.toFixed(2);
        return `${formattedVnd} VNĐ (~$${formattedUsd})`;
    }

    // ==================== CACHE METHODS ====================

    private cacheRate(rate: number): void {
        const cached: CachedRate = {
            rate,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    }

    private getCachedRate(): CachedRate | null {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }

    private isCacheExpired(cached: CachedRate): boolean {
        return Date.now() - cached.timestamp > CACHE_TTL_MS;
    }

    /**
     * Force refresh exchange rate from API
     */
    refreshRate(): Observable<number> {
        return this.fetchExchangeRate();
    }
}
