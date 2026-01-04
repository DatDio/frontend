import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TransactionService } from '../../core/services/wallet.service';
import { ThemeService } from '../../core/services/theme.service';
import { SystemSettingService } from '../../core/services/system-setting.service';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-layout.component.html',
  styleUrls: ['./client-layout.component.scss']
})
export class ClientLayoutComponent implements OnInit {
  readonly walletService = inject(TransactionService);
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly settingService = inject(SystemSettingService);

  balance$ = this.walletService.balance$;
  theme$ = this.themeService.theme$;

  // Use authReady$ - stays FALSE on SSR, only TRUE after browser localStorage check
  authReady$ = this.authService.authReady$;
  isAuthenticated$ = this.authService.isAuthenticated$;

  // Social links with defaults
  telegramGroupUrl = 'https://t.me/EmailSieuRegroupchat';
  telegramChannelUrl = 'https://t.me/EmailSieuResupport';

  ngOnInit(): void {
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.walletService.getMyWallet().subscribe();
      }
    });

    // Load public settings for footer links
    this.settingService.getPublicSettings().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.telegramGroupUrl = response.data['social.telegram_group'] || this.telegramGroupUrl;
          this.telegramChannelUrl = response.data['social.telegram_channel'] || this.telegramChannelUrl;
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

