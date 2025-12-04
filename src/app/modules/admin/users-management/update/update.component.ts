import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UpdateUserRequest } from '../../../../core/models/user.model';

@Component({
  selector: 'app-users-update',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.scss']
})
export class UsersUpdateComponent implements OnInit {
  readonly #userService = inject(UserService);
  readonly #notificationService = inject(NotificationService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #formBuilder = inject(FormBuilder);

  form!: FormGroup;
  loading = false;
  submitted = false;
  userId: number | null = null;

  roles = ['ADMIN', 'USER'];
  statuses = ['ACTIVE', 'INACTIVE'];

  ngOnInit(): void {
    this.initForm();
    this.#route.params.subscribe(params => {
      this.userId = Number(params['id']);
      if (this.userId) {
        this.loadUser();
      }
    });
  }

  private initForm(): void {
    this.form = this.#formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      address: [''],
      roles: ['USER', Validators.required],
      status: ['ACTIVE']
    });
  }

  private loadUser(): void {
    if (!this.userId) return;

    this.loading = true;
    this.#userService.getById(this.userId).subscribe({
      next: (response) => {
        if (response.success) {
          const user = response.data;
          this.form.patchValue({
            email: user.email,
            fullName: user.fullName,
            phone: user.phone || '',
            address: user.address || '',
            roles: user.roles && user.roles.length > 0 ? user.roles[0] : 'USER',
            status: user.status || 'ACTIVE'
          });
        } else {
          this.#notificationService.error(response.message || 'Không thể tải thông tin người dùng');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error(error.error?.message || 'Đã xảy ra lỗi khi tải thông tin người dùng');
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.userId) {
      this.#notificationService.warning('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    this.submitted = true;
    this.loading = true;

    const formValue = this.form.value;
    const request: UpdateUserRequest = {
      id: this.userId,
      email: formValue.email,
      fullName: formValue.fullName,
      phone: formValue.phone || undefined,
      address: formValue.address || undefined,
      roles: [formValue.roles],
      status: formValue.status
    };

    this.#userService.update(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.#notificationService.success('Cập nhật người dùng thành công');
          this.#router.navigate(['/admin/users-management']);
        } else {
          this.#notificationService.error(response.message || 'Cập nhật người dùng thất bại');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error(error.error?.message || 'Đã xảy ra lỗi khi cập nhật người dùng');
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.#router.navigate(['/admin/users-management']);
  }

  get email() {
    return this.form.get('email');
  }

  get fullName() {
    return this.form.get('fullName');
  }

  get phone() {
    return this.form.get('phone');
  }

  get address() {
    return this.form.get('address');
  }

  get rolesControl() {
    return this.form.get('roles');
  }

  get status() {
    return this.form.get('status');
  }
}
