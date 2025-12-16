import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../../core/services/seo.service';

@Component({
    selector: 'app-support',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {
    private readonly seoService = inject(SeoService);

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Hỗ Trợ Khách Hàng - MailShop',
            'Liên hệ hỗ trợ qua Telegram để được giải đáp nhanh nhất. Kênh thông báo và group chat hỗ trợ.',
            'hỗ trợ, support, liên hệ, telegram, MailShop'
        );
    }
}
