import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreateUserRequest } from '../../../../core/models/user.model';

@Component({
  selector: 'app-users-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class UsersCreateComponent implements OnInit {
  readonly #userService = inject(UserService);
  readonly #notificationService = inject(NotificationService);
  readonly #router = inject(Router);
  readonly #formBuilder = inject(FormBuilder);

  form!: FormGroup;
  loading = false;
  submitted = false;

  roles = ['ADMIN', 'USER', 'MANAGER'];
  statuses = ['ACTIVE', 'INACTIVE', 'BANNED'];

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.#formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: [''],
      address: [''],
      roles: [['USER'], Validators.required],
      status: ['ACTIVE']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.#notificationService.warning('Warning', 'Please fill in all required fields correctly');
      return;
    }

    this.submitted = true;
    this.loading = true;

    const formValue = this.form.value;
    const request: CreateUserRequest = {
      email: formValue.email,
      fullName: formValue.fullName,
      password: formValue.password,
      phone: formValue.phone || undefined,
      address: formValue.address || undefined,
      roles: formValue.roles,
      status: formValue.status
    };

    this.#userService.create(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.#notificationService.success('Success', 'User created successfully');
          this.#router.navigate(['/admin/users']);
        } else {
          this.#notificationService.error('Error', response.message || 'Failed to create user');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error('Error', error.error?.message || 'An error occurred while creating user');
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.#router.navigate(['/admin/users']);
  }

  get email() {
    return this.form.get('email');
  }

  get fullName() {
    return this.form.get('fullName');
  }

  get password() {
    return this.form.get('password');
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
