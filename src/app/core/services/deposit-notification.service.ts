import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { NotificationService } from './notification.service';
import { TransactionService } from './wallet.service';
import { AuthService } from './auth.service';
import { TranslateService } from '@ngx-translate/core';

// WebSocket message interface for deposit notifications
export interface DepositSuccessMessage {
    userId: number;
    transactionCode: number;
    amount: number;
    bonusAmount: number;
    totalAmount: number;
    newBalance: number;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class DepositNotificationService {
    // Observable for components to subscribe and react to deposit success
    private readonly depositSuccessSubject = new Subject<DepositSuccessMessage>();
    readonly depositSuccess$ = this.depositSuccessSubject.asObservable();

    private readonly webSocketService = inject(WebSocketService);
    private readonly notificationService = inject(NotificationService);
    private readonly transactionService = inject(TransactionService);
    private readonly authService = inject(AuthService);
    private readonly translate = inject(TranslateService);

    private depositWsUnsub?: () => void;
    private currentTransactionCode?: number;

    /**
     * Start listening for deposit success notification.
     * Will keep listening until explicitly stopped (no timeout).
     */
    startListening(transactionCode: number): void {
        // Clean up any existing subscription first
        this.stopListening();

        const user = this.authService.getCurrentUser();
        if (!user?.id) return;

        this.currentTransactionCode = transactionCode;
        const topic = `/topic/deposit/${user.id}`;

        console.info(`[DepositNotification] Subscribing to ${topic} for transaction ${transactionCode}`);

        // Subscribe to WebSocket (no timeout - keep listening while user is on page)
        this.depositWsUnsub = this.webSocketService.subscribe<DepositSuccessMessage>(
            topic,
            (payload) => this.handleDepositSuccess(payload)
        );
    }

    /**
     * Stop listening and clean up resources
     */
    stopListening(): void {
        if (this.depositWsUnsub) {
            this.depositWsUnsub();
            this.depositWsUnsub = undefined;
        }

        this.currentTransactionCode = undefined;
    }

    /**
     * Check if currently listening for a deposit
     */
    isListening(): boolean {
        return !!this.depositWsUnsub;
    }

    private handleDepositSuccess(payload: DepositSuccessMessage): void {
        // Verify this is for the current transaction
        if (this.currentTransactionCode && payload.transactionCode !== this.currentTransactionCode) {
            return;
        }

        console.info('[DepositNotification] Deposit success received:', payload);

        // Show success notification with bonus info
        let message = this.translate.instant('MESSAGE.DEPOSIT_SUCCESS_AMOUNT', { amount: payload.amount.toLocaleString() });
        if (payload.bonusAmount > 0) {
            message += ` (Bonus: +${payload.bonusAmount.toLocaleString()} VNĐ)`;
        }
        this.notificationService.success(message);

        // Refresh balance
        this.transactionService.refreshBalance();

        // Emit event for components to react (e.g., close modal, reload data)
        this.depositSuccessSubject.next(payload);

        // Clean up
        this.stopListening();
    }
}
