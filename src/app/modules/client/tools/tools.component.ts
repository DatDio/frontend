import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
    imports: [CommonModule, RouterModule],
    templateUrl: './tools.component.html',
    styleUrls: ['./tools.component.scss']
})
export class ToolsComponent {
    tools: Tool[] = [
        {
            id: 'get-code',
            name: 'Get Code',
            description: 'Lấy mã xác thực OTP từ email Hotmail/Outlook một cách nhanh chóng và tự động',
            icon: 'assets/images/icon-getCode.png',
            route: '/get-code-mail',
            status: 'active',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            id: 'check-mail',
            name: 'Check Mail',
            description: 'Kiểm tra trạng thái hoạt động của email',
            icon: 'bi bi-envelope-check',
            route: '',
            status: 'coming-soon',
            gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
        },
        {
            id: 'read-inbox',
            name: 'Đọc hòm thư',
            description: 'Đọc nội dung email trong hòm thư',
            icon: 'bi bi-inbox',
            route: '',
            status: 'coming-soon',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
            id: 'get-2fa',
            name: 'Get 2FA',
            description: 'Lấy mã xác thực 2 bước',
            icon: 'bi bi-shield-lock',
            route: '',
            status: 'coming-soon',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        }
    ];
}
