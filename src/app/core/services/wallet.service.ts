import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { TransactionResponse, TransactionFilter } from '../models/transaction.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { WalletApi } from '../../Utils/apis/wallets/client-wallet.api';
import { AdminTransactionApi } from '../../Utils/apis/transactions/admin-transaction.api';
import { WalletResponse } from '../models/wallet.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {

  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);
  private balanceSubject = new BehaviorSubject<number>(0);
  balance$ = this.balanceSubject.asObservable();

  getMyWallet(): Observable<ApiResponse<WalletResponse>> {
    return this.httpClient
      .get<ApiResponse<WalletResponse>>(WalletApi.GET_MY_WALLET)
      .pipe(
        tap(res => {
          if (res.success && res.data?.balance !== undefined) {
            this.balanceSubject.next(res.data.balance);
          }
        })
      );
  }
  // ================= REFRESH BALANCE =================
  refreshBalance(): void {
    this.httpClient.get<ApiResponse<WalletResponse>>(WalletApi.GET_MY_WALLET)
      .subscribe(res => {
        if (res.success && res.data?.balance !== undefined) {
          this.balanceSubject.next(res.data.balance);
        }
      });
  }


  // ================= MANUAL UPDATE (OPTIONAL) =================
  setBalance(balance: number): void {
    this.balanceSubject.next(balance);
  }

  // ================== CREATE DEPOSIT (CHỈ AMOUNT) ==================
  createDeposit(amount: number): Observable<ApiResponse<any>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<any>>(
        WalletApi.DEPOSIT_PAYOS,
        { amount: amount }
      )
      .pipe(finalize(() => this.loaderService.hide()));
  }

  // ================== SEARCH TRANSACTIONS ==================
  list(filter?: TransactionFilter): Observable<ApiResponse<PaginatedResponse<TransactionResponse>>> {
    const params = this.createTransactionFilter(filter);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<TransactionResponse>>>(
        WalletApi.TRANSACTOIN_SEARCH,
        { params }
      );
  }

  // ================== GET TRANSACTION BY CODE ==================
  getByCode(transactionCode: string): Observable<ApiResponse<TransactionResponse>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<TransactionResponse>>(
        WalletApi.GET_TRANSACTION(transactionCode)
      )
      .pipe(finalize(() => this.loaderService.hide()));
  }

  // ================== FILTER BUILDER ==================
  private createTransactionFilter(filter?: TransactionFilter): HttpParams {
    let params = new HttpParams()
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'createdAt,desc');

    if (!filter) return params;

    if (filter.transactionCode)
      params = params.set('transactionCode', filter.transactionCode);

    if (filter.status !== undefined && filter.status !== null)
      params = params.set('status', filter.status.toString());

    if (filter.type !== undefined && filter.type !== null)
      params = params.set('type', filter.type.toString());

    if (filter.email)
      params = params.set('email', filter.email);

    if (filter.dateFrom)
      params = params.set('dateFrom', filter.dateFrom);

    if (filter.dateTo)
      params = params.set('dateTo', filter.dateTo);

    return params;
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.httpClient
      .delete<ApiResponse<void>>(WalletApi.DELETE(id))
  }

  // ================== ADMIN: SEARCH ALL TRANSACTIONS ==================
  adminList(filter?: TransactionFilter): Observable<ApiResponse<PaginatedResponse<TransactionResponse>>> {
    const params = this.createTransactionFilter(filter);
    return this.httpClient
      .get<ApiResponse<PaginatedResponse<TransactionResponse>>>(
        AdminTransactionApi.SEARCH,
        { params }
      );
  }

  // ================== ADMIN: UPDATE TRANSACTION STATUS ==================
  updateStatus(id: number, status: number, reason?: string): Observable<ApiResponse<TransactionResponse>> {
    this.loaderService.show();
    return this.httpClient
      .put<ApiResponse<TransactionResponse>>(
        AdminTransactionApi.UPDATE_STATUS(id),
        { status, reason }
      )
      .pipe(finalize(() => this.loaderService.hide()));
  }
}
