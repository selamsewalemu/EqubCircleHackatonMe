import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-layout">
      <div class="auth-card otp-card">
        <div class="eyebrow">VERIFICATION</div>
        <h1>Verify your account</h1>
        <p class="muted">Enter the six-digit simulated Fayda OTP from registration.</p>

        <form (ngSubmit)="submit()">
          <label>
            OTP
            <input
              name="otp"
              [(ngModel)]="otp"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              required
            />
          </label>
          <button class="btn primary full" type="submit" [disabled]="loading">
            {{ loading ? 'Verifying…' : 'Verify account' }}
          </button>
        </form>

        <div class="demo-otp" *ngIf="demoOtp">
          Demo OTP: <strong>{{ demoOtp }}</strong>
        </div>

        <div class="error" *ngIf="error">{{ error }}</div>

        <p class="switch">
          <a routerLink="/login">Back to sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class VerifyOtpComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  otp = '';
  loading = false;
  error = '';
  demoOtp = sessionStorage.getItem('ekub_demo_otp') ?? '';

  submit(): void {
    const userId = Number(sessionStorage.getItem('ekub_pending_user'));

    if (!userId) {
      this.error = 'No pending registration was found.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.verifyOtp({ userId, otp: this.otp }).subscribe({
      next: () => {
        sessionStorage.removeItem('ekub_pending_user');
        sessionStorage.removeItem('ekub_demo_otp');
        this.router.navigateByUrl('/dashboard');
      },
      error: e => {
        this.error =
          e?.error?.message ?? e?.error?.title ?? 'Verification failed.';
        this.loading = false;
      },
    });
  }
}
