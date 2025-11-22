import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { TransactionResponse, TransactionFilter } from '../models/transaction.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';

const API_URL = '/api/transactions';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  /**
   * Get list of transactions with pagination
   */
  list(filter?: TransactionFilter): Observable<ApiResponse<PaginatedResponse<TransactionResponse>>> {
    this.loaderService.show();

    let params = new HttpParams()
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'id,desc');

    if (filter?.transactionCode) params = params.set('transactionCode', filter.transactionCode);
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.minAmount !== undefined) params = params.set('minAmount', filter.minAmount.toString());
    if (filter?.maxAmount !== undefined) params = params.set('maxAmount', filter.maxAmount.toString());
    if (filter?.startDate) params = params.set('startDate', filter.startDate);
    if (filter?.endDate) params = params.set('endDate', filter.endDate);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<TransactionResponse>>>(`${API_URL}/search`, { params })
      .pipe(finalize(() => this.loaderService.hide()));
  }
}
