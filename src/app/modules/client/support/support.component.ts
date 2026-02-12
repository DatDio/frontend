import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SeoService } from '../../../core/services/seo.service';
import { SystemSettingService } from '../../../core/services/system-setting.service';

@Component({
    selector: 'app-support',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {
    private readonly seoService = inject(SeoService);
    private readonly settingService = inject(SystemSettingService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    // Social links with defaults
    telegramGroupUrl = 'https://t.me/EmailSieuRegroupchat';
    telegramChannelUrl = 'https://t.me/EmailSieuResupport';

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Hỗ Trợ Khách Hàng - EmailSieuRe',
            'Liên hệ hỗ trợ qua Telegram để được giải đáp nhanh nhất. Kênh thông báo và group chat hỗ trợ.',
            'hỗ trợ, support, liên hệ, telegram, EmailSieuRe'
        );

        // Load settings (browser only — no backend during prerender)
        if (!this.isBrowser) return;
        this.settingService.getPublicSettings().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.telegramGroupUrl = response.data['social.telegram_group'] || this.telegramGroupUrl;
                    this.telegramChannelUrl = response.data['social.telegram_channel'] || this.telegramChannelUrl;
                }
            }
        });
    }
}
