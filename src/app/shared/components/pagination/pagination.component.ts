import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationService } from '../../services/pagination.service';

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
export class PaginationComponent implements OnInit, OnChanges {
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
  private readonly paginationService = inject(PaginationService);
  
  formSearch!: FormGroup;
  searchPageInput = '';
  visiblePages: number[] = [];

  ngOnInit(): void {
    this.formSearch = this.fb.group({
      pageSize: [this.config.pageSize],
      searchPage: ['']
    });
    this.updateVisiblePages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.updateVisiblePages();
    }
  }

  private updateVisiblePages(): void {
    this.visiblePages = this.paginationService.getVisiblePages(
      this.config.currentPage,
      this.config.totalPages,
      5
    );
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

  shouldShowStartEllipsis(): boolean {
    return this.paginationService.shouldShowStartEllipsis(this.visiblePages);
  }

  shouldShowEndEllipsis(): boolean {
    return this.paginationService.shouldShowEndEllipsis(this.visiblePages, this.config.totalPages);
  }

  getPageSizeLabel(): string {
    return this.config.pageSize.toString();
  }
}
