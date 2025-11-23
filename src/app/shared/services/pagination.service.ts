import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PageableResponse {
  pageNumber?: number;
  number?: number;
  pageSize?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  private readonly defaultPageSize = 10;

  /**
   * Extract pagination info từ backend response
   * Support cả BE pagination format
   */
  extractPaginationInfo(pageableResponse: any): PaginationState {
    const pageNumber = pageableResponse?.number ?? pageableResponse?.pageNumber ?? 0;
    const pageSize = pageableResponse?.size ?? pageableResponse?.pageSize ?? this.defaultPageSize;
    const totalElements = pageableResponse?.totalElements ?? 0;
    const totalPages = pageableResponse?.totalPages ?? Math.ceil(totalElements / pageSize);

    return {
      currentPage: pageNumber,
      pageSize,
      totalElements,
      totalPages
    };
  }

  /**
   * Tính toán pages để hiển thị với "..."
   * Ví dụ: 1 2 3 4 5 ... 98 99 100
   */
  getVisiblePages(currentPage: number, totalPages: number, maxVisible: number = 5): number[] {
    const pages: number[] = [];
    
    if (totalPages <= maxVisible) {
      // Nếu pages ít, hiển thị hết
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(0, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible);

    // Đảm bảo luôn hiển thị đúng số pages
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Check xem có cần hiển thị "..." ở đầu
   */
  shouldShowStartEllipsis(visiblePages: number[]): boolean {
    return visiblePages.length > 0 && visiblePages[0] > 0;
  }

  /**
   * Check xem có cần hiển thị "..." ở cuối
   */
  shouldShowEndEllipsis(visiblePages: number[], totalPages: number): boolean {
    return visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages - 1;
  }
}
