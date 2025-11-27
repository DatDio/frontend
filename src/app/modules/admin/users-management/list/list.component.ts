import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { UserDetailModalComponent } from '../detail-modal/detail-modal.component';
import { User } from '../../../../core/models/user.model';
import { ActiveStatusSelectComponent } from '../../../../shared/components/active-status-select/active-status-select.component';
import { ActiveStatusBadgeComponent } from '../../../../shared/components/active-status-badge/active-status-badge.component';
interface UserSearchFilter {
  email?: string;
  status?: string;
  pagination?: any;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, PaginationComponent, UserDetailModalComponent, ActiveStatusSelectComponent,ActiveStatusBadgeComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class UsersListComponent implements OnInit {
  @ViewChild(UserDetailModalComponent) userDetailModal!: UserDetailModalComponent;

  readonly #userService = inject(UserService);
  readonly #notificationService = inject(NotificationService);
  readonly #router = inject(Router);
  readonly #fb = inject(FormBuilder);
  readonly #paginationService = inject(PaginationService);

  users: User[] = [];
  loading = true;
  
  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };
  
  dataFormSearch: UserSearchFilter = {};
  formSearch!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
  }

  private initForm(): void {
    this.formSearch = this.createSearchForm();
  }

  private createSearchForm(): FormGroup {
    return this.#fb.group({
      email: new FormControl(''),
      status: new FormControl(''),
      searchPage: new FormControl('')
    });
  }

  handleSearch(): void {
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadUsers();
  }

  handleSearchPage(): void {
    const pageNum = this.formSearch.get('searchPage')?.value;
    if (!pageNum) {
      return;
    }
    
    if (pageNum > this.paginationConfig.totalPages || pageNum < 1) {
      this.#notificationService.error(`Page must be between 1 and ${this.paginationConfig.totalPages}`);
    } else {
      this.paginationConfig.currentPage = pageNum - 1;
      this.dataFormSearch = {
        ...this.formSearch.getRawValue(),
        pagination: this.paginationConfig
      };
      this.loadUsers();
      this.formSearch.get('searchPage')?.reset();
    }
  }

  selectPageSize(pageSize: number): void {
    this.paginationConfig.currentPage = 0;
    this.paginationConfig.pageSize = pageSize;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadUsers();
  }

  handlePageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadUsers();
  }

  clearForm(): void {
    this.formSearch = this.createSearchForm();
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {};
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading = true;
    
    // Build query params
    const params: any = {
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize
    };
    
    if (this.dataFormSearch.email) {
      params.email = this.dataFormSearch.email;
    }
    if (this.dataFormSearch.status) {
      params.status = this.dataFormSearch.status;
    }

    this.#userService.list(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.data.content;
          
          // Extract pagination từ backend
          const paginationInfo = this.#paginationService.extractPaginationInfo(response.data);
          this.paginationConfig = {
            currentPage: paginationInfo.currentPage,
            pageSize: paginationInfo.pageSize,
            totalElements: paginationInfo.totalElements,
            totalPages: paginationInfo.totalPages
          };
          
        } else {
          this.#notificationService.error(response.message || 'Có lỗi xảy ra');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
        this.loading = false;
      }
    });
  }

  onCreate(): void {
    this.#router.navigate(['/admin/users-management/create']);
  }

  onView(id: number): void {
    this.userDetailModal.openModal(id);
  }

  onEdit(id: number): void {
    this.#router.navigate(['/admin/users-management/edit', id]);
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.#userService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.#notificationService.success('Xoá thành công');
            this.loadUsers();
          } else {
            this.#notificationService.error(response.message || 'Có lỗi xảy ra');
          }
        },
        error: (error) => {
          this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
        }
      });
    }
  }
}
