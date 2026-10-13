import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { LoginRequest } from '../models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-layout page-enter">
      <!-- Form panel -->
      <div class="auth-card">
        <div class="eyebrow">WELCOME BACK</div>
        <h1>Sign in to EkubCircle</h1>
        <p class="muted">Manage your circles, rounds, payments and payouts in one place.</p>

        <form (ngSubmit)="submit()" #f="ngForm">
          <label>
            Email or phone
            <input
              name="emailOrPhone"
              [(ngModel)]="model.emailOrPhone"
              required
              placeholder="you@example.com"
              autocomplete="username"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              [(ngModel)]="model.password"
              required
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </label>
          <button class="btn primary full" type="submit" [disabled]="loading">
            <span *ngIf="loading" class="loading-spinner"></span>
            <span>{{loading ? 'Signing in…' : 'Sign in'}}</span>
          </button>
        </form>

        <div class="error" [class.shake]="shakeError" *ngIf="error">{{error}}</div>

        <p class="switch">
          New to EkubCircle? <a routerLink="/register">Create an account</a>
        </p>
      </div>

      <!-- Decorative art panel -->
      <div class="auth-art">
        <span class="big-logo">E</span>
        <h2>Save together.<br />Grow together.</h2>
        <p>A transparent digital ledger for community Ekub circles.</p>
        <div class="art-features">
          <div class="art-feature">✓ Transparent ledger</div>
          <div class="art-feature">✓ Community savings</div>
          <div class="art-feature">✓ Automated payouts</div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  model: LoginRequest = { emailOrPhone: '', password: '' };
  loading = false;
  error = '';
  shakeError = false;

  submit(): void {
    this.loading = true;
    this.error = '';

    this.auth.login(this.model).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: e => {
        this.error = e?.error?.message ?? e?.error?.title ?? 'Unable to sign in.';
        this.shakeError = true;
        setTimeout(() => (this.shakeError = false), 500);
        this.loading = false;
      },
    });
  }
}
