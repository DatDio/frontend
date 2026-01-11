import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RankService } from '../../../core/services/rank.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { Rank, UserRankInfo } from '../../../core/models/rank.model';
import { VndUsdPipe } from '../../../shared/pipes/vnd-usd.pipe';

@Component({
    selector: 'app-ranks',
    standalone: true,
    imports: [CommonModule, TranslateModule, VndUsdPipe],
    templateUrl: './ranks.component.html',
    styleUrls: ['./ranks.component.scss']
})
export class RanksComponent implements OnInit {
    readonly #rankService = inject(RankService);
    readonly #authService = inject(AuthService);
    readonly #notificationService = inject(NotificationService);
    readonly #seoService = inject(SeoService);

    ranks: Rank[] = [];
    myRankInfo: UserRankInfo | null = null;
    loading = true;
    isLoggedIn = false;

    ngOnInit(): void {
        this.#seoService.setPageMeta(
            'Hạng Thành Viên - EmailSieuRe',
            'Xem các cấp bậc thành viên và ưu đãi đặc biệt. Nạp tiền để nâng cấp hạng và nhận bonus hấp dẫn.',
            'hạng thành viên, membership, rank, bonus, ưu đãi, EmailSieuRe'
        );
        this.isLoggedIn = this.#authService.isAuthenticated();
        this.loadRanks();
        if (this.isLoggedIn) {
            this.loadMyRank();
        }
    }

    private loadRanks(): void {
        this.loading = true;
        this.#rankService.getAllRanks().subscribe({
            next: (response) => {
                if (response.success) {
                    this.ranks = response.data || [];
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    private loadMyRank(): void {
        this.#rankService.getMyRank().subscribe({
            next: (response) => {
                if (response.success) {
                    this.myRankInfo = response.data;
                }
            },
            error: () => {
                // Ignore error, just don't show rank
            }
        });
    }

    isCurrentRank(rank: Rank): boolean {
        return this.myRankInfo?.rankId === rank.id;
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN').format(value);
    }

    getRankProgress(): number {
        if (!this.myRankInfo || !this.myRankInfo.nextRankMinDeposit) {
            return 100;
        }
        const current = this.myRankInfo.currentDeposit;
        const next = this.myRankInfo.nextRankMinDeposit;
        return Math.min(100, Math.round((current / next) * 100));
    }
}
