import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { Role } from '../../../Utils/enums/commom.enum';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl = '/';
  googleClientId = environment.googleClientId;
  private googleInitialized = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private seoService: SeoService,
    private recaptchaService: RecaptchaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Login - EmailSieuRe',
      'Sign in to your EmailSieuRe account to manage your mail accounts',
      'login, sign in, EmailSieuRe'
    );

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    this.authService.restoreFromStorage();
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
      return;
    }

    this.initGoogleIdentity();

    // Preload reCAPTCHA script
    this.recaptchaService.loadScript();
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await this.recaptchaService.execute('login');

      const loginData = {
        ...this.loginForm.value,
        recaptchaToken
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          if (response.success) {
            this.handleLoginSuccess();
          } else {
            this.errorMessage = response.message || 'Login failed';
            this.loading = false;
          }
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'An error occurred';
          this.loading = false;
        }
      });
    } catch (error) {
      this.errorMessage = 'Could not verify captcha. Please try again.';
      this.loading = false;
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onGoogleCredential(idToken: string): void {
    if (!idToken) {
      this.errorMessage = 'Google sign-in failed. Please try again.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.googleLogin(idToken).subscribe({
      next: (response) => {
        if (response.success) {
          this.handleLoginSuccess();
        } else {
          this.errorMessage = response.message || 'Google sign-in failed';
          this.loading = false;
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Google sign-in failed';
        this.loading = false;
      }
    });
  }

  private initGoogleIdentity(): void {
    if (!this.googleClientId || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const existingScript = document.getElementById('google-identity-script') as HTMLScriptElement | null;
    const initialize = () => {
      if (this.googleInitialized || typeof google === 'undefined') {
        return;
      }

      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: { credential: string }) => this.onGoogleCredential(response.credential)
      });

      const buttonEl = document.getElementById('googleSignInButton');
      if (buttonEl) {
        google.accounts.id.renderButton(buttonEl, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill'
        });
      }

      google.accounts.id.prompt();
      this.googleInitialized = true;
    };

    if (existingScript) {
      if (typeof google !== 'undefined') {
        initialize();
      } else {
        existingScript.addEventListener('load', initialize);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-identity-script';
    script.onload = () => initialize();

    document.head.appendChild(script);
  }

  private handleLoginSuccess(): void {
    this.loading = false;
    const user = this.authService.getCurrentUser();
    if (user?.roles.includes(Role.ADMIN)) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate([this.returnUrl]);
    }
  }
}
