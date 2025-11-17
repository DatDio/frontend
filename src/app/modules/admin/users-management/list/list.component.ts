import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  users: User[] = [];
  loading = true;
  searchTerm = '';

  constructor(
    private userService: UserService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    
    this.userService.list().subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.data.items || response.data as any;
          this.notificationService.success('Success', 'Users loaded successfully');
        } else {
          this.notificationService.error('Error', response.message || 'Failed to load users');
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error('Error', error.error?.message || 'An error occurred while loading users');
        this.loading = false;
      }
    });
  }

  deleteUser(id: string): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.delete([id]).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Success', 'User deleted successfully');
            this.loadUsers();
          } else {
            this.notificationService.error('Error', response.message || 'Failed to delete user');
          }
        },
        error: (error) => {
          this.notificationService.error('Error', error.error?.message || 'An error occurred while deleting user');
        }
      });
    }
  }

  getRoleBadgeClass(role: string): string {
    return role === 'ADMIN' ? 'badge bg-danger' : 'badge bg-primary';
  }
}
