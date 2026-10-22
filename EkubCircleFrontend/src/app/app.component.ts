import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';

const REALTIME_MESSAGES: Record<string, string> = {
  circleCreated: 'A new Ekub circle is available.',
  memberJoined: 'A new member joined a circle.',
  circleStarted: 'A circle has started and payout order is locked.',
  paymentRecorded: 'A member payment was recorded.',
  payoutCompleted: 'A circle payout was completed.',
};

interface ToastItem { message: string; type: 'success' | 'error' | 'info'; id: number; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, AsyncPipe],
  template: `
    <div class="app-shell">
      <!-- Top navigation bar -->
      <header class="topbar" *ngIf="auth.isLoggedIn()">
        <a routerLink="/dashboard" class="brand">
          <span class="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v10M8 12h8"/>
            </svg>
          </span>
          <span class="brand-text">Ekub<span>Circle</span></span>
        </a>
        <nav class="nav-links">
          <a routerLink="/dashboard" routerLinkActive="active">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>
          <a routerLink="/circles/new" routerLinkActive="active">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span>Create Circle</span>
          </a>
          <a routerLink="/profile" routerLinkActive="active">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </a>
        </nav>
        <div class="topbar-right">
          <div class="rt-status-pill" [class.rt-connected]="(realtime.isConnected$ | async)"
               [title]="(realtime.isConnected$ | async) ? 'Live updates connected' : 'Connecting to network…'">
            <span class="rt-dot"></span>
            <span class="rt-text">{{ (realtime.isConnected$ | async) ? 'Live Network' : 'Connecting…' }}</span>
          </div>
          <div class="user-pill">
            <span class="user-avatar" [ngClass]="userAvatarClass">{{ userInitials }}</span>
            <span class="user-name">{{ auth.user()?.fullName }}</span>
            <button class="btn-logout" (click)="logout()" title="Sign out">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Toast notifications -->
      <div class="toast-stack" *ngIf="notifications.length">
        <div
          class="toast"
          [class.success-toast]="n.type === 'success'"
          [class.error-toast]="n.type === 'error'"
          [class.info-toast]="n.type === 'info'"
          *ngFor="let n of notifications; let i = index"
          (click)="dismiss(i)"
        >
          <span class="toast-icon">{{toastIcon(n.type)}}</span>
          <span class="toast-msg">{{n.message}}</span>
          <div class="toast-progress"></div>
        </div>
      </div>

      <!-- Page content -->
      <main [class.with-nav]="auth.isLoggedIn()">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  realtime = inject(RealtimeService);

  notifications: ToastItem[] = [];
  private nextId = 0;

  get userInitials(): string {
    const name = this.auth.user()?.fullName ?? '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'U';
  }

  get userAvatarClass(): string {
    const name = this.auth.user()?.fullName ?? '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `avatar-${Math.abs(hash) % 8}`;
  }

  constructor() {
    if (this.auth.isLoggedIn()) {
      this.realtime.connect();
    }

    this.realtime.events$.subscribe(e => this.showNotification(e.type));
  }

  dismiss(index: number): void {
    this.notifications.splice(index, 1);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  toastIcon(type: string): string {
    if (type === 'error') return '✕';
    if (type === 'info') return 'ℹ';
    return '✓';
  }

  private showNotification(type: string): void {
    const message = REALTIME_MESSAGES[type] ?? 'EkubCircle updated.';
    this.notifications = [{ message, type: 'success' as const, id: this.nextId++ }, ...this.notifications].slice(0, 4);
    setTimeout(() => this.notifications.pop(), 5000);
  }
}
