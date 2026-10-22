import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { RealtimeService } from '../realtime.service';
import { CircleSummary, DashboardSummary } from '../models';

const RELOAD_EVENTS = [
  'circleCreated',
  'memberJoined',
  'circleStarted',
  'paymentRecorded',
  'payoutCompleted',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page page-enter">
      <!-- Modern Hero Row -->
      <div class="hero-row">
        <div>
          <div class="eyebrow">
            <span class="live-dot-mini"></span>
            <span>OVERVIEW & ANALYTICS</span>
          </div>
          <h1>Welcome back, {{ firstName }}</h1>
          <p class="muted">Monitor circle cycles, verify contributions, and track your scheduled payouts in real time.</p>
        </div>
        <a routerLink="/circles/new" class="btn primary hero-cta">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Start New Circle</span>
        </a>
      </div>

      <!-- Bento Stats Grid -->
      <div class="stats bento-stats">
        <ng-container *ngIf="!isLoading; else statsSkeleton">
          <div class="stat-card">
            <div class="stat-icon-wrap icon-emerald">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="stat-meta">
              <span class="stat-label">My Active Circles</span>
              <strong class="stat-val">{{mine.length}}</strong>
              <span class="stat-sub">Enrolled memberships</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap icon-blue">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <div class="stat-meta">
              <span class="stat-label">Total Contributed</span>
              <strong class="stat-val">{{(summary?.totalContributions ?? 0) | number: '1.0-2'}} <small>ETB</small></strong>
              <span class="stat-sub">Across all active rounds</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap icon-amber">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                <rect x="2" y="7" width="20" height="5"></rect>
                <line x1="12" y1="22" x2="12" y2="7"></line>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
            </div>
            <div class="stat-meta">
              <span class="stat-label">Payouts Received</span>
              <strong class="stat-val">{{(summary?.totalPayoutsReceived ?? 0) | number: '1.0-2'}} <small>ETB</small></strong>
              <span class="stat-sub">Disbursed to your account</span>
            </div>
          </div>
        </ng-container>

        <ng-template #statsSkeleton>
          <div class="stat-card" *ngFor="let s of [1,2,3]">
            <span class="skeleton" style="width:44px; height:44px; border-radius:12px;"></span>
            <div class="stat-meta" style="width: 100%;">
              <span class="skeleton" style="width:90px; height:14px;"></span>
              <span class="skeleton" style="width:120px; height:28px; margin: 8px 0;"></span>
              <span class="skeleton" style="width:100px; height:12px;"></span>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- Next Action Cards (Next Payment / Next Payout) -->
      <div class="next-grid">
        <ng-container *ngIf="summary?.nextPaymentCircle as p; else noPayment">
          <a class="next-card active-action-card" [routerLink]="['/circles', p.circleId]">
            <div class="next-top">
              <span class="action-pill due-pill">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Next Contribution Due
              </span>
              <span class="next-arrow">→</span>
            </div>
            <h3>{{ p.circleName }}</h3>
            <div class="next-money">{{ p.contributionAmount | number: '1.0-2' }} <span class="currency">ETB</span></div>
            <div class="next-badges">
              <span class="chip">Round {{ p.roundNumber }}</span>
              <span class="chip">{{ p.frequency }}</span>
            </div>
            <p class="next-status">{{ p.message }}</p>
          </a>
        </ng-container>
        <ng-template #noPayment>
          <div class="next-card muted-card">
            <div class="next-top">
              <span class="action-pill ok-pill">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Up To Date
              </span>
            </div>
            <h3>No payments due</h3>
            <p class="muted">All scheduled circle contributions are currently settled.</p>
          </div>
        </ng-template>

        <ng-container *ngIf="summary?.nextPayoutCircle as p; else noPayout">
          <a class="next-card payout-action-card" [routerLink]="['/circles', p.circleId]">
            <div class="next-top">
              <span class="action-pill gold-pill">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Upcoming Payout
              </span>
              <span class="next-arrow">→</span>
            </div>
            <h3>{{ p.circleName }}</h3>
            <div class="next-money highlight-green">{{ p.ready ? 'Ready for Disbursal' : 'Collecting Pool' }}</div>
            <div class="next-badges">
              <span class="chip">Round {{ p.roundNumber }}</span>
              <span class="chip">Receiver: {{ p.receiverName }}</span>
            </div>
            <p class="next-status">{{ p.message }}</p>
          </a>
        </ng-container>
        <ng-template #noPayout>
          <div class="next-card muted-card">
            <div class="next-top">
              <span class="action-pill neutral-pill">Queue Empty</span>
            </div>
            <h3>No payout queued</h3>
            <p class="muted">You are not currently scheduled as the next round recipient.</p>
          </div>
        </ng-template>
      </div>

      <!-- My circles section -->
      <div class="section-head">
        <div>
          <h2>My Enrolled Circles</h2>
          <p class="muted">Active savings circles you are currently participating in.</p>
        </div>
      </div>

      <div class="cards" *ngIf="!isLoading && mine.length; else mineLoadingOrEmpty">
        <a class="circle-card" *ngFor="let c of mine" [routerLink]="['/circles', c.id]">
          <div class="card-top">
            <span class="status" [class.active]="c.status === 'Active'">
              <span class="dot-indicator"></span>
              {{c.status}}
            </span>
            <span class="frequency-pill">{{c.frequency}}</span>
          </div>
          <h3>{{c.name}}</h3>
          <p class="organizer-line">Organized by <strong>{{c.organizerName}}</strong></p>
          
          <div class="capacity-section">
            <div class="capacity-meta">
              <span>Pool Filling</span>
              <span><strong>{{c.memberCount}}</strong> / {{c.memberLimit}}</span>
            </div>
            <div class="capacity-track">
              <div class="capacity-bar" [style.width.%]="memberPercent(c)"></div>
            </div>
          </div>

          <div class="card-bottom">
            <div class="price-tag">
              <span class="price-val">{{c.contributionAmount | number: '1.0-2'}}</span>
              <span class="price-curr">ETB / round</span>
            </div>
            <span class="view-link">View details →</span>
          </div>
        </a>
      </div>

      <ng-template #mineLoadingOrEmpty>
        <div class="cards" *ngIf="isLoading">
          <div class="circle-card" *ngFor="let sk of [1,2,3]" style="pointer-events:none">
            <div class="card-top">
              <span class="skeleton" style="width:70px; height:24px; border-radius:99px;"></span>
              <span class="skeleton" style="width:60px; height:20px; border-radius:6px;"></span>
            </div>
            <span class="skeleton" style="width:75%; height:24px; margin:20px 0 8px;"></span>
            <span class="skeleton" style="width:45%; height:16px; margin-bottom:20px;"></span>
            <span class="skeleton" style="width:100%; height:6px; margin-bottom:20px; border-radius:4px;"></span>
            <div class="card-bottom">
              <span class="skeleton" style="width:90px; height:22px;"></span>
              <span class="skeleton" style="width:80px; height:18px;"></span>
            </div>
          </div>
        </div>
        <div class="empty empty-state-card" *ngIf="!isLoading">
          <div class="empty-icon-wrap">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
          </div>
          <h3>No circles joined yet</h3>
          <p>Join an existing public circle below or launch your own savings group.</p>
          <a routerLink="/circles/new" class="btn primary small" style="margin-top:14px; display:inline-flex;">+ Create New Circle</a>
        </div>
      </ng-template>

      <!-- Available circles section -->
      <div class="section-head browse">
        <div>
          <h2>Available Circles to Join</h2>
          <p class="muted">Discover and enroll in verified community rotating funds.</p>
        </div>
        <div class="filters modern-filters">
          <div class="search-input-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="search-svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              [(ngModel)]="search"
              (keyup.enter)="loadAvailable()"
              placeholder="Search circles by title…"
            />
          </div>
          <select [(ngModel)]="frequency" (change)="loadAvailable()" class="modern-select">
            <option value="">All frequencies</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>
      </div>

      <div class="cards" *ngIf="available.length; else noAvailable">
        <div class="circle-card join-card" *ngFor="let c of available">
          <div class="card-top">
            <span class="status open-status">
              <span class="dot-indicator blue-dot"></span>
              OPEN FOR MEMBERS
            </span>
            <span class="frequency-pill">{{ c.frequency }}</span>
          </div>
          <h3>{{ c.name }}</h3>
          <p class="organizer-line">Organized by <strong>{{ c.organizerName }}</strong></p>
          
          <div class="capacity-section">
            <div class="capacity-meta">
              <span>Spots Occupied</span>
              <span><strong>{{c.memberCount}}</strong> / {{c.memberLimit}}</span>
            </div>
            <div class="capacity-track">
              <div class="capacity-bar" [style.width.%]="memberPercent(c)"></div>
            </div>
          </div>

          <div class="card-bottom">
            <div class="price-tag">
              <span class="price-val">{{ c.contributionAmount | number: '1.0-2' }}</span>
              <span class="price-curr">ETB / round</span>
            </div>
            <button class="btn primary small" (click)="join(c.id)" [disabled]="joiningId === c.id">
              <span *ngIf="joiningId === c.id" class="loading-spinner" style="width:12px;height:12px;border-width:1.5px;"></span>
              {{joiningId === c.id ? 'Joining…' : 'Join Circle'}}
            </button>
          </div>
        </div>
      </div>
      <ng-template #noAvailable>
        <div class="empty empty-state-card">
          <div class="empty-icon-wrap">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <h3>No open circles match your search</h3>
          <p>Try resetting the search filters or start a new circle for your group.</p>
        </div>
      </ng-template>

      <div class="error shake" *ngIf="error">{{ error }}</div>
    </section>
  `,
})
export class DashboardComponent {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);

  mine: CircleSummary[] = [];
  available: CircleSummary[] = [];
  summary: DashboardSummary | null = null;
  search = '';
  frequency = '';
  joiningId: number | null = null;
  error = '';
  isLoading = true;

  get firstName(): string {
    const raw = localStorage.getItem('ekub_user');
    if (!raw) return 'there';
    try {
      const name: string = JSON.parse(raw).fullName ?? 'there';
      return name.split(' ')[0];
    } catch {
      return 'there';
    }
  }

  memberPercent(c: CircleSummary): number {
    if (!c.memberLimit || c.memberLimit <= 0) return 0;
    return Math.min(100, Math.round((c.memberCount / c.memberLimit) * 100));
  }

  constructor() {
    this.load();
    this.realtime.events$.subscribe(e => {
      if (RELOAD_EVENTS.includes(e.type)) this.load();
    });
  }

  load(): void {
    this.isLoading = true;
    this.api.mine().subscribe({
      next: r => {
        this.mine = r;
        this.isLoading = false;
      },
      error: e => {
        this.error = this.errorMsg(e);
        this.isLoading = false;
      },
    });
    this.api.dashboardSummary().subscribe({
      next: r => (this.summary = r),
      error: e => (this.error = this.errorMsg(e)),
    });
    this.loadAvailable();
  }

  loadAvailable(): void {
    this.api.available(this.search, this.frequency).subscribe({
      next: r => (this.available = r),
      error: e => (this.error = this.errorMsg(e)),
    });
  }

  join(id: number): void {
    this.joiningId = id;
    this.api.join(id).subscribe({
      next: () => {
        this.joiningId = null;
        this.load();
      },
      error: e => {
        this.error = this.errorMsg(e);
        this.joiningId = null;
      },
    });
  }

  private errorMsg(e: unknown): string {
    const err = e as { error?: { message?: string; title?: string } };
    return err?.error?.message ?? err?.error?.title ?? 'Request failed.';
  }
}
