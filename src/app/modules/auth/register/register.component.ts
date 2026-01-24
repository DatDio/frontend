import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  currentLang: string;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private seoService: SeoService,
    private recaptchaService: RecaptchaService,
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'vi';
  }

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Sign Up - EmailSieuRe',
      'Create your EmailSieuRe account and start managing mail accounts today',
      'register, sign up, create account, EmailSieuRe'
    );

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    // Preload reCAPTCHA script
    if (isPlatformBrowser(this.platformId)) {
      this.recaptchaService.loadScript();
    }
  }

  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await this.recaptchaService.execute('register');

      const { confirmPassword, ...registerData } = this.registerForm.value;
      const registerPayload = {
        ...registerData,
        recaptchaToken
      };

      this.authService.register(registerPayload).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/']);
          } else {
            this.errorMessage = response.message || 'Registration failed';
            this.loading = false;
          }
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'An error occurred during registration';
          this.loading = false;
        }
      });
    } catch (error) {
      this.errorMessage = 'Could not verify captcha. Please try again.';
      this.loading = false;
    }
  }

  get email() {
    return this.registerForm.get('email');
  }

  get fullName() {
    return this.registerForm.get('fullName');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  switchLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
    localStorage.setItem('language', lang);
  }
}
