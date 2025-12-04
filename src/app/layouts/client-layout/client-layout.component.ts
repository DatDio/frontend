import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TransactionService } from '../../core/services/wallet.service';

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

  balance$ = this.walletService.balance$;

  // Use authReady$ - stays FALSE on SSR, only TRUE after browser localStorage check
  authReady$ = this.authService.authReady$;
  isAuthenticated$ = this.authService.isAuthenticated$;

  ngOnInit(): void {
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.walletService.getMyWallet().subscribe();
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
