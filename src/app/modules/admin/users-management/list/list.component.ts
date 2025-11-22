import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class UsersListComponent implements OnInit {
  readonly #userService = inject(UserService);
  readonly #notificationService = inject(NotificationService);
  readonly #router = inject(Router);

  users: User[] = [];
  loading = true;
  searchTerm = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    
    this.#userService.list().subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data as any;
          this.users = data.items || data;
          this.#notificationService.success('Success', 'Users loaded successfully');
        } else {
          this.#notificationService.error('Error', response.message || 'Failed to load users');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error('Error', error.error?.message || 'An error occurred while loading users');
        this.loading = false;
      }
    });
  }

  onCreate(): void {
    this.#router.navigate(['/admin/users-management/create']);
  }

  onView(id: number): void {
    this.#router.navigate(['/admin/users-management', id]);
  }

  onEdit(id: number): void {
    this.#router.navigate(['/admin/users-management/edit', id]);
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.#userService.delete([id]).subscribe({
        next: (response) => {
          if (response.success) {
            this.#notificationService.success('Success', 'User deleted successfully');
            this.loadUsers();
          } else {
            this.#notificationService.error('Error', response.message || 'Failed to delete user');
          }
        },
        error: (error) => {
          this.#notificationService.error('Error', error.error?.message || 'An error occurred while deleting user');
        }
      });
    }
  }

  getRoleBadgeClass(roles: string[]): string {
    return roles.includes('ADMIN') ? 'badge bg-danger' : 'badge bg-primary';
  }
}
