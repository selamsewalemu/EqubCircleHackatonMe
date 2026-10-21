import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { AuthResponse } from '../models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page narrow">
      <div class="page-back">
        <a routerLink="/dashboard">← Dashboard</a>
      </div>

      <div class="eyebrow">ACCOUNT</div>
      <h1>Your profile</h1>
      <p class="muted">Your verified identity and active session.</p>

      <div class="panel profile">
        <div class="profile-avatar">{{ initials }}</div>
        <div>
          <h2>{{ user?.fullName }}</h2>
          <p>{{ user?.email }}</p>
          <span class="status active">Verified</span>
        </div>
      </div>

      <div class="panel">
        <div class="info-row">
          <span>User ID</span>
          <strong>{{ user?.userId }}</strong>
        </div>
        <div class="info-row">
          <span>Account role</span>
          <strong>{{ user?.role }}</strong>
        </div>
        <div class="info-row">
          <span>Session</span>
          <strong>JWT · 12 hours</strong>
        </div>
      </div>
    </section>
  `,
})
export class ProfileComponent {
  private auth = inject(AuthService);

  user: AuthResponse | null = this.auth.user();

  get initials(): string {
    return (this.user?.fullName ?? 'U')
      .split(' ')
      .map(x => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
