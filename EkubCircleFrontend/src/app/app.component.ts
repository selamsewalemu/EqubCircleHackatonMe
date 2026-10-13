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
          <span class="brand-mark">E</span>
          <span>Ekub<span>Circle</span></span>
        </a>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/circles/new" routerLinkActive="active">Create Circle</a>
          <a routerLink="/profile" routerLinkActive="active">Profile</a>
          <button class="nav-user" (click)="logout()">
            {{ auth.user()?.fullName }} · Logout
          </button>
        </nav>
        <span class="rt-dot" [class.rt-connected]="(realtime.isConnected$ | async)"
              [title]="(realtime.isConnected$ | async) ? 'Live updates connected' : 'Connecting…'"></span>
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
          <span>{{n.message}}</span>
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
    if (type === 'error') return '✗';
    if (type === 'info') return 'ℹ';
    return '✓';
  }

  private showNotification(type: string): void {
    const message = REALTIME_MESSAGES[type] ?? 'EkubCircle updated.';
    this.notifications = [{ message, type: 'success' as const, id: this.nextId++ }, ...this.notifications].slice(0, 4);
    setTimeout(() => this.notifications.pop(), 5000);
  }
}
