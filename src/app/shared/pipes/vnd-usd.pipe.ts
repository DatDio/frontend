import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../../core/services/currency.service';

/**
 * Pipe to display VND with USD equivalent
 * Usage: {{ amount | vndUsd }}
 * Output: "50,000 VNĐ (~$1.92)"
 * 
 * Optional parameter to show only USD:
 * Usage: {{ amount | vndUsd:'usdOnly' }}
 * Output: "$1.92"
 */
@Pipe({
    name: 'vndUsd',
    standalone: true,
    pure: false // Impure to react to rate changes
})
export class VndUsdPipe implements PipeTransform {
    private readonly currencyService = inject(CurrencyService);

    transform(vnd: number | null | undefined, format: 'full' | 'usdOnly' = 'full'): string {
        if (vnd === null || vnd === undefined) {
            return format === 'usdOnly' ? '$0.00' : '0 VNĐ (~$0.00)';
        }

        const usd = this.currencyService.convertVndToUsd(vnd);
        const formattedUsd = this.formatUsd(usd);

        if (format === 'usdOnly') {
            return `$${formattedUsd}`;
        }

        const formattedVnd = vnd.toLocaleString('vi-VN');
        return `${formattedVnd} VNĐ (~$${formattedUsd})`;
    }

    /**
     * Format USD with smart decimal places
     * - For amounts >= 0.01: show 2 decimals (e.g., $1.50)
     * - For amounts < 0.01: show enough decimals to display 2 significant digits (e.g., $0.0015)
     */
    private formatUsd(usd: number): string {
        if (usd === 0) return '0.00';

        if (usd >= 0.01) {
            return usd.toFixed(2);
        }

        // For small amounts, find how many decimals needed to show 2 significant digits
        const absUsd = Math.abs(usd);
        const logValue = Math.floor(Math.log10(absUsd));
        const decimals = Math.max(2, -logValue + 1);

        return usd.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, ''); // Remove trailing zeros
    }
}
