import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
}

export interface PageSizeOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent implements OnInit {
  @Input() config: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };
  @Input() pageSizeOptions: PageSizeOption[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
    { label: '100', value: 100 }
  ];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  private readonly fb = inject(FormBuilder);
  formSearch!: FormGroup;
  searchPageInput = '';

  ngOnInit(): void {
    this.formSearch = this.fb.group({
      pageSize: [this.config.pageSize],
      searchPage: ['']
    });
  }

  onPreviousPage(): void {
    if (this.config.currentPage > 0) {
      this.pageChange.emit(this.config.currentPage - 1);
    }
  }

  onNextPage(): void {
    if (this.config.currentPage < this.config.totalPages - 1) {
      this.pageChange.emit(this.config.currentPage + 1);
    }
  }

  onPageClick(page: number): void {
    if (page !== this.config.currentPage && page >= 0 && page < this.config.totalPages) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSizeChange.emit(pageSize);
  }

  onSearchPage(): void {
    const pageNum = Number.parseInt(this.searchPageInput, 10);
    if (!Number.isNaN(pageNum) && pageNum > 0 && pageNum <= this.config.totalPages) {
      this.pageChange.emit(pageNum - 1); // Convert to 0-based index
      this.searchPageInput = '';
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    
    let start = Math.max(0, this.config.currentPage - half);
    let end = Math.min(this.config.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  getPageSizeLabel(): string {
    return this.config.pageSize.toString();
  }
}
