import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SeoService } from '../../../core/services/seo.service';

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string;
    route: string;
    status: 'active' | 'coming-soon';
    gradient: string;
}

@Component({
    selector: 'app-tools',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule],
    templateUrl: './tools.component.html',
    styleUrls: ['./tools.component.scss']
})
export class ToolsComponent implements OnInit {
    private readonly seoService = inject(SeoService);
    tools: Tool[] = [
        {
            id: 'get-code',
            name: 'Get Code',
            description: 'Lấy mã xác thực OTP từ email Hotmail/Outlook một cách nhanh chóng và tự động',
            icon: 'bi bi-code-slash',
            route: '/get-code-mail',
            status: 'active',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            id: 'check-live-facebook',
            name: 'Check Live Facebook',
            description: 'Kiểm tra trạng thái hoạt động của tài khoản Facebook bằng UID',
            icon: 'bi bi-facebook',
            route: '/check-live-facebook',
            status: 'active',
            gradient: 'linear-gradient(135deg, #1877f2 0%, #3b5998 100%)'
        },
        {
            id: 'check-live-mail',
            name: 'Check Live Mail',
            description: 'Kiểm tra trạng thái hoạt động của email Hotmail/Outlook',
            icon: 'bi bi-envelope-check',
            route: '/check-live-mail',
            status: 'active',
            gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
        },
        {
            id: 'get-2fa',
            name: 'Get 2FA',
            description: 'Lấy mã xác thực 2 bước (TOTP) từ secret key',
            icon: 'bi bi-shield-lock',
            route: '/get-2fa',
            status: 'active',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        },
        {
            id: 'get-oauth2',
            name: 'Get OAuth2 Token',
            description: 'Lấy Access Token từ Refresh Token cho email',
            icon: 'bi bi-key',
            route: '/get-oauth2',
            status: 'active',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        }
    ];

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Công Cụ Hỗ Trợ - EmailSieuRe',
            'Bộ công cụ hỗ trợ mạnh mẽ: Lấy mã OTP, kiểm tra live Facebook, kiểm tra live Mail, Get 2FA, Get OAuth2 Token.',
            'tools, công cụ, get code, check live, 2FA, OAuth2, EmailSieuRe'
        );
    }
}
