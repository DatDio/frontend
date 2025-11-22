import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-users-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class UsersDetailComponent implements OnInit {
  readonly #userService = inject(UserService);
  readonly #notificationService = inject(NotificationService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  user: User | null = null;
  loading = true;
  userId: number | null = null;

  ngOnInit(): void {
    this.#route.params.subscribe(params => {
      this.userId = Number(params['id']);
      if (this.userId) {
        this.loadUser();
      }
    });
  }

  private loadUser(): void {
    if (!this.userId) return;

    this.loading = true;
    this.#userService.getById(this.userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.user = response.data;
        } else {
          this.#notificationService.error('Error', response.message || 'Failed to load user');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error('Error', error.error?.message || 'An error occurred while loading user');
        this.loading = false;
      }
    });
  }

  onEdit(): void {
    if (this.userId) {
      this.#router.navigate(['/admin/users/edit', this.userId]);
    }
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this user?')) {
      if (this.userId) {
        this.#userService.delete([this.userId]).subscribe({
          next: (response) => {
            if (response.success) {
              this.#notificationService.success('Success', 'User deleted successfully');
              this.#router.navigate(['/admin/users']);
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
  }

  onBack(): void {
    this.#router.navigate(['/admin/users']);
  }
}
