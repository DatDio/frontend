import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RankService } from '../../../core/services/rank.service';
import { SystemSettingService } from '../../../core/services/system-setting.service';
import { ApiResponse } from '../../../core/models/common.model';

@Component({
    selector: 'app-collaborator',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule],
    templateUrl: './collaborator.component.html',
    styleUrls: ['./collaborator.component.scss']
})
export class CollaboratorComponent implements OnInit {
    readonly #rankService = inject(RankService);
    readonly #settingsService = inject(SystemSettingService);

    isCollaborator = false;
    bonusPercent = 0;
    telegramChannel = '';
    loading = true;

    ngOnInit(): void {
        this.loadUserInfo();
        this.loadTelegramChannel();
    }

    // Load CTV info from API (realtime, not from localStorage)
    private loadUserInfo(): void {
        this.#rankService.getMyRank().subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.isCollaborator = res.data.isCollaborator ?? false;
                    this.bonusPercent = res.data.ctvBonusPercent ?? 0;
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    private loadTelegramChannel(): void {
        this.#settingsService.getPublicSettings().subscribe({
            next: (response: ApiResponse<Record<string, string>>) => {
                if (response.success && response.data) {
                    this.telegramChannel = response.data['social.telegram_channel'] || '';
                }
            }
        });
    }

    get telegramUrl(): string {
        if (!this.telegramChannel) return '';
        // Handle both @username and https://t.me/... formats
        if (this.telegramChannel.startsWith('http')) {
            return this.telegramChannel;
        }
        const channel = this.telegramChannel.startsWith('@')
            ? this.telegramChannel.substring(1)
            : this.telegramChannel;
        return `https://t.me/${channel}`;
    }
}
