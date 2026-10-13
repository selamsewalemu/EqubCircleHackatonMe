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
      <!-- Header row -->
      <div class="hero-row">
        <div>
          <div class="eyebrow">YOUR EKUB</div>
          <h1>Good to see you, {{ firstName }}.</h1>
          <p class="muted">Track every contribution and payout with confidence.</p>
        </div>
        <a routerLink="/circles/new" class="btn primary">+ Create circle</a>
      </div>

      <!-- Stats -->
      <div class="stats">
        <ng-container *ngIf="!isLoading; else statsSkeleton">
          <div>
            <span>My circles</span>
            <strong>{{mine.length}}</strong>
          </div>
          <div>
            <span>Total contributions</span>
            <strong>{{(summary?.totalContributions ?? 0) | number: '1.0-2'}} ETB</strong>
          </div>
          <div>
            <span>Total payouts received</span>
            <strong>{{(summary?.totalPayoutsReceived ?? 0) | number: '1.0-2'}} ETB</strong>
          </div>
        </ng-container>
        <ng-template #statsSkeleton>
          <div>
            <span class="skeleton" style="width:80px"></span>
            <span class="skeleton" style="width:50px; height:28px; margin-top:8px;"></span>
          </div>
          <div>
            <span class="skeleton" style="width:130px"></span>
            <span class="skeleton" style="width:90px; height:28px; margin-top:8px;"></span>
          </div>
          <div>
            <span class="skeleton" style="width:140px"></span>
            <span class="skeleton" style="width:90px; height:28px; margin-top:8px;"></span>
          </div>
        </ng-template>
      </div>

      <!-- Next payment / payout cards -->
      <div class="next-grid">
        <ng-container *ngIf="summary?.nextPaymentCircle as p; else noPayment">
          <a class="next-card" [routerLink]="['/circles', p.circleId]">
            <div class="eyebrow">NEXT PAYMENT CIRCLE</div>
            <h3>{{ p.circleName }}</h3>
            <strong>{{ p.contributionAmount | number: '1.0-2' }} ETB</strong>
            <p>Round {{ p.roundNumber }} · {{ p.frequency }}</p>
            <span class="next-status">{{ p.message }}</span>
          </a>
        </ng-container>
        <ng-template #noPayment>
          <div class="next-card muted-card">
            <div class="eyebrow">NEXT PAYMENT CIRCLE</div>
            <h3>No payment due</h3>
            <p>You are up to date on your active circles.</p>
          </div>
        </ng-template>

        <ng-container *ngIf="summary?.nextPayoutCircle as p; else noPayout">
          <a class="next-card" [routerLink]="['/circles', p.circleId]">
            <div class="eyebrow">NEXT PAYOUT CIRCLE</div>
            <h3>{{ p.circleName }}</h3>
            <strong>{{ p.ready ? 'Ready for payout' : 'Waiting for payments' }}</strong>
            <p>Round {{ p.roundNumber }} · Receiver: {{ p.receiverName }}</p>
            <span class="next-status">{{ p.message }}</span>
          </a>
        </ng-container>
        <ng-template #noPayout>
          <div class="next-card muted-card">
            <div class="eyebrow">NEXT PAYOUT CIRCLE</div>
            <h3>No payout queued</h3>
            <p>You are not currently next in an active circle.</p>
          </div>
        </ng-template>
      </div>

      <!-- My circles -->
      <div class="section-head">
        <div>
          <h2>My circles</h2>
          <p class="muted">Circles where you are an active member.</p>
        </div>
      </div>

      <div class="cards" *ngIf="!isLoading && mine.length; else mineLoadingOrEmpty">
        <a class="circle-card" *ngFor="let c of mine" [routerLink]="['/circles', c.id]">
          <div class="card-top">
            <span class="status" [class.active]="c.status === 'Active'">{{c.status}}</span>
            <span>{{c.frequency}}</span>
          </div>
          <h3>{{c.name}}</h3>
          <p>{{c.organizerName}}</p>
          <div class="card-bottom">
            <strong>{{c.contributionAmount | number: '1.0-2'}} ETB</strong>
            <span>{{c.memberCount}} / {{c.memberLimit}} members</span>
          </div>
        </a>
      </div>
      <ng-template #mineLoadingOrEmpty>
        <div class="cards" *ngIf="isLoading">
          <div class="circle-card" *ngFor="let sk of [1,2,3]" style="pointer-events:none">
            <div class="card-top">
              <span class="skeleton" style="width:60px; height:22px;"></span>
              <span class="skeleton" style="width:50px; height:16px;"></span>
            </div>
            <span class="skeleton" style="width:70%; height:22px; margin:20px 0 8px;"></span>
            <span class="skeleton" style="width:50%; height:16px; margin-bottom:24px;"></span>
            <div class="card-bottom">
              <span class="skeleton" style="width:80px; height:18px;"></span>
            </div>
          </div>
        </div>
        <div class="empty" *ngIf="!isLoading">
          <h3>No circles yet</h3>
          <p>Create your first circle or join an available one.</p>
        </div>
      </ng-template>

      <!-- Available circles -->
      <div class="section-head browse">
        <div>
          <h2>Available circles</h2>
          <p class="muted">Join an open community circle.</p>
        </div>
        <div class="filters">
          <input
            [(ngModel)]="search"
            (keyup.enter)="loadAvailable()"
            placeholder="Search circles…"
          />
          <select [(ngModel)]="frequency" (change)="loadAvailable()">
            <option value="">All frequencies</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>
      </div>

      <div class="cards" *ngIf="available.length; else noAvailable">
        <div class="circle-card join-card" *ngFor="let c of available">
          <div class="card-top">
            <span class="status">OPEN</span>
            <span>{{ c.frequency }}</span>
          </div>
          <h3>{{ c.name }}</h3>
          <p>Organized by {{ c.organizerName }}</p>
          <div class="card-bottom">
            <strong>{{ c.contributionAmount | number: '1.0-2' }} ETB</strong>
            <button class="btn small" (click)="join(c.id)">
              <span *ngIf="joiningId === c.id" class="loading-spinner dark" style="width:12px;height:12px;border-width:1.5px;"></span>
              {{joiningId === c.id ? 'Joining…' : 'Join'}}
            </button>
          </div>
        </div>
      </div>
      <ng-template #noAvailable>
        <div class="empty">
          <h3>No open circles found</h3>
          <p>Try another search or create your own.</p>
        </div>
      </ng-template>

      <div class="error" *ngIf="error">{{ error }}</div>
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
    const name: string = JSON.parse(raw).fullName ?? 'there';
    return name.split(' ')[0];
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
