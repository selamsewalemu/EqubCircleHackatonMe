import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { AuthService } from '../auth.service';
import { RealtimeService } from '../realtime.service';
import { CircleDetails, CircleMember, HistoryItem, MemberPayoutOrder, Round } from '../models';

const RELOAD_EVENTS = [
  'memberJoined',
  'circleStarted',
  'paymentRecorded',
  'payoutCompleted',
];

@Component({
  selector: 'app-circle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <!-- Loading skeleton -->
    <section class="page page-enter" *ngIf="isLoading">
      <div class="page-back"><span class="skeleton" style="width:80px; height:16px;"></span></div>
      <div class="hero-row">
        <div>
          <span class="skeleton" style="width:120px; height:12px;"></span>
          <span class="skeleton" style="width:280px; height:40px; margin:12px 0 8px;"></span>
          <span class="skeleton" style="width:220px; height:16px;"></span>
        </div>
      </div>
      <div class="stats">
        <div><span class="skeleton" style="width:80px"></span><span class="skeleton" style="width:100px; height:28px; margin-top:8px;"></span></div>
        <div><span class="skeleton" style="width:60px"></span><span class="skeleton" style="width:60px; height:28px; margin-top:8px;"></span></div>
        <div><span class="skeleton" style="width:70px"></span><span class="skeleton" style="width:90px; height:28px; margin-top:8px;"></span></div>
      </div>
    </section>
    <!-- Actual content -->
    <section class="page page-enter" *ngIf="!isLoading && circle as c">
      <!-- Back link + header -->
      <div class="page-back">
        <a routerLink="/dashboard">← Dashboard</a>
      </div>

      <div class="hero-row">
        <div>
          <div class="eyebrow">{{ c.status }} · {{ c.frequency }}</div>
          <h1>{{ c.name }}</h1>
          <p class="muted">
            {{ c.contributionAmount | number: '1.0-2' }} ETB per
            {{ c.frequency.toLowerCase() }} · Organized by {{ c.organizerName }}
          </p>
        </div>
        <span class="status big" [class.active]="c.status === 'Active'">
          {{ c.status }}
        </span>
      </div>

      <!-- Top stats -->
      <div class="stats">
        <div>
          <span>Contribution</span>
          <strong>{{ c.contributionAmount | number: '1.0-2' }} ETB</strong>
        </div>
        <div>
          <span>Members</span>
          <strong>{{ c.members.length }} / {{ c.memberLimit }}</strong>
        </div>
        <div>
          <span>Start date</span>
          <strong>
            {{ c.startDate ? (c.startDate | date: 'mediumDate') : 'Not set' }}
          </strong>
        </div>
      </div>

      <!-- Main two-column layout -->
      <div class="two-col">
        <!-- Left column -->
        <div>
          <!-- Active round card -->
          <div class="panel" *ngIf="round as r">
            <div class="panel-head">
              <div>
                <span class="eyebrow">CURRENT ROUND</span>
                <h2>Round {{ r.roundNumber }}</h2>
              </div>
              <span class="round-progress">{{ r.paidCount }} / {{ r.totalMembers }} paid</span>
            </div>

            <div class="round-main">
              <div>
                <span class="muted">Current pot</span>
                <strong class="money">{{ r.pot | number: '1.0-2' }} ETB</strong>
              </div>
              <div>
                <span class="muted">Receiver</span>
                <strong>{{ r.receiverName }}</strong>
              </div>
              <div>
                <span class="muted">Required contribution</span>
                <strong>{{ r.contribution | number: '1.0-2' }} ETB</strong>
              </div>
            </div>

            <div class="progress">
              <span
                [style.width.%]="
                  r.totalMembers ? (r.paidCount / r.totalMembers) * 100 : 0
                "
              ></span>
            </div>

            <!-- Organizer payout button -->
            <div class="action-row" *ngIf="isOrganizer">
              <button
                class="btn primary"
                (click)="payout()"
                [disabled]="payoutLoading || r.paidCount < r.totalMembers"
              >
                <span *ngIf="payoutLoading" class="loading-spinner"></span>
                {{payoutLoading ? 'Processing…' : 'Pay out current round'}}
              </button>
            </div>

            <!-- Member pay-self button -->
            <div
              class="action-row"
              *ngIf="myMembership && !myMembership.paidCurrentRound"
            >
              <button
                class="btn primary"
                (click)="paySelf()"
                [disabled]="paymentLoading"
              >
                <span *ngIf="paymentLoading" class="loading-spinner"></span>
                {{paymentLoading ? 'Processing…' : 'Pay my contribution'}}
              </button>
              <span class="hint">
                Simulated payment · {{ r.contribution | number: '1.0-2' }} ETB
              </span>
            </div>

            <div class="hint" *ngIf="r.paidCount < r.totalMembers">
              Payout unlocks after every active member has paid.
            </div>
          </div>

          <!-- Completed circle message -->
          <div class="panel empty" *ngIf="!round && c.status === 'Completed'">
            <h3>Circle completed 🎉</h3>
            <p>Every member has received the Ekub once.</p>
          </div>

          <!-- Organizer setup panel (Open status) -->
          <div class="panel" *ngIf="isOrganizer && c.status === 'Open'">
            <div class="panel-head">
              <div>
                <span class="eyebrow">ORGANIZER</span>
                <h2>Prepare the circle</h2>
              </div>
            </div>

            <!-- Add member row -->
            <div class="add-row">
              <input [(ngModel)]="memberIdentifier" placeholder="Member email or phone" />
              <button class="btn" (click)="addMember()">Add member</button>
            </div>

            <!-- Roll payout order section -->
            <div class="roll-section" *ngIf="c.members.length === c.memberLimit">
              <div class="roll-header">
                <span class="eyebrow">STEP 2 — DRAW PAYOUT ORDER</span>
                <p class="muted">
                  Toss the members to randomly assign who receives in which round.
                  Roll as many times as you like, then confirm to lock the order.
                </p>
              </div>

              <!-- Roll result table -->
              <div class="roll-result" *ngIf="rolledOrder.length">
                <div class="roll-row" *ngFor="let entry of rolledOrder">
                  <div class="roll-number">{{ entry.order }}</div>
                  <div class="avatar avatar-sm" [ngClass]="avatarClass(entry.name)">
                    {{ initials(entry.name) }}
                  </div>
                  <span class="roll-name">{{ entry.name }}</span>
                  <span class="roll-label">receives round {{ entry.order }}</span>
                </div>
              </div>

              <div class="action-row">
                <button class="btn ghost" (click)="rollOrder(c.members)" [disabled]="actionLoading">
                  🎲 {{ rolledOrder.length ? 'Re-roll' : 'Roll payout order' }}
                </button>
                <button
                  class="btn primary"
                  (click)="start()"
                  [disabled]="!rolledOrder.length || actionLoading"
                >
                  <span *ngIf="actionLoading" class="loading-spinner"></span>
                  {{ actionLoading ? 'Starting…' : 'Confirm & start circle' }}
                </button>
              </div>
              <div class="hint">
                The rolled order is final once you confirm. Every member will see it.
              </div>
            </div>

            <!-- Waiting for members -->
            <div *ngIf="c.members.length < c.memberLimit">
              <div class="hint" style="margin-top:14px">
                {{ c.memberLimit - c.members.length }} more member(s) needed before you can roll.
              </div>
            </div>
          </div>

          <!-- Non-organizer join panel (Open status) -->
          <div class="panel" *ngIf="!isOrganizer && c.status === 'Open'">
            <h3>Ready to join?</h3>
            <p class="muted">This circle is still accepting members.</p>
            <button class="btn primary" (click)="join()">Join this circle</button>
          </div>

          <!-- Payout schedule (Active circles) -->
          <div class="panel" *ngIf="allRounds.length">
            <div class="panel-head">
              <div>
                <span class="eyebrow">PAYOUT SCHEDULE</span>
                <h2>Who receives each round</h2>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Receiver</th>
                    <th>Amount</th>
                    <th>Date paid out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let r of allRounds"
                    [class.current-round-row]="round && r.roundNumber === round.roundNumber"
                  >
                    <td>
                      <strong>Round {{ r.roundNumber }}</strong>
                      <span
                        *ngIf="round && r.roundNumber === round.roundNumber"
                        class="current-badge"
                      >Current</span>
                    </td>
                    <td>
                      <div class="receiver-cell">
                        <div class="avatar avatar-sm" [ngClass]="avatarClass(r.receiverName)">
                          {{ initials(r.receiverName) }}
                        </div>
                        {{ r.receiverName }}
                      </div>
                    </td>
                    <td>
                      <span *ngIf="r.payoutAmount">
                        {{ r.payoutAmount | number: '1.0-2' }} ETB
                      </span>
                      <span *ngIf="!r.payoutAmount" class="muted">
                        {{ c.contributionAmount * c.members.length | number: '1.0-2' }} ETB
                      </span>
                    </td>
                    <td>
                      <span *ngIf="r.paidOutAt">{{ r.paidOutAt | date: 'mediumDate' }}</span>
                      <span *ngIf="!r.paidOutAt" class="muted">—</span>
                    </td>
                    <td>
                      <span class="status" [class.active]="r.status === 'PaidOut'">
                        {{ r.status === 'PaidOut' ? 'Paid out' : r.status === 'Open' ? 'Pending' : r.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Round history table -->
          <div class="panel">
            <div class="panel-head">
              <div>
                <span class="eyebrow">HISTORY</span>
                <h2>Completed rounds</h2>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Receiver</th>
                    <th>Pot</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let h of history">
                    <td>#{{ h.roundNumber }}</td>
                    <td>{{ h.receiverName }}</td>
                    <td>{{ h.pot | number: '1.0-2' }} ETB</td>
                    <td>
                      <span *ngIf="h.paidOutAt">{{ h.paidOutAt | date: 'mediumDate' }}</span>
                      <span *ngIf="!h.paidOutAt" class="muted">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="empty small-empty" *ngIf="!history.length">
                No completed rounds yet.
              </div>
            </div>
          </div>
        </div>

        <!-- Right sidebar -->
        <aside>
          <!-- Members list -->
          <div class="panel">
            <div class="panel-head">
              <div>
                <span class="eyebrow">MEMBERS</span>
                <h2>{{ c.members.length }} members</h2>
              </div>
            </div>
            <div class="member-list">
              <div class="member" *ngFor="let m of c.members">
                <div class="avatar" [ngClass]="avatarClass(m.fullName)">{{ initials(m.fullName) }}</div>
                <div class="member-info">
                  <strong>{{ m.fullName }}</strong>
                  <span>
                    {{ m.roleInCircle }}
                    <ng-container *ngIf="m.payoutOrder">
                      · Order {{ m.payoutOrder }}
                    </ng-container>
                  </span>
                </div>
                <div class="member-state">
                  <span *ngIf="m.paidCurrentRound" class="check">✓ Paid</span>
                  <button
                    *ngIf="isOrganizer && round && !m.paidCurrentRound"
                    class="btn small"
                    (click)="payMember(m.membershipId)"
                  >
                    Record payment
                  </button>
                  <span *ngIf="m.hasReceived" class="received">Received</span>
                </div>
              </div>
            </div>
          </div>

          <!-- How it works -->
          <div class="panel">
            <span class="eyebrow">HOW IT WORKS</span>
            <div class="steps">
              <div><b>1</b><span>Everyone contributes each round.</span></div>
              <div><b>2</b><span>Pot is locked until all payments are recorded.</span></div>
              <div><b>3</b><span>Receiver follows the fixed payout order.</span></div>
              <div><b>4</b><span>Previous receivers keep contributing.</span></div>
            </div>
          </div>
        </aside>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>
    </section>
  `,
})
export class CircleComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private realtime = inject(RealtimeService);

  circle: CircleDetails | null = null;
  round: Round | null = null;
  history: HistoryItem[] = [];
  allRounds: Round[] = [];

  error = '';
  memberIdentifier = '';
  actionLoading = false;
  payoutLoading = false;
  paymentLoading = false;
  isLoading = true;

  // Roll state: each entry holds membershipId, display name, and drawn order
  rolledOrder: { membershipId: number; name: string; order: number }[] = [];

  get isOrganizer(): boolean {
    return (
      !!this.circle &&
      this.circle.organizerName === this.auth.user()?.fullName
    );
  }

  get myMembership(): CircleMember | null {
    const userId = this.auth.user()?.userId;
    return this.circle?.members.find(m => m.userId === userId) ?? null;
  }

  constructor() {
    this.route.paramMap.subscribe(p => {
      const id = Number(p.get('id'));
      if (id) this.load(id);
    });

    this.realtime.events$.subscribe(e => {
      const id = this.circle?.id;
      const eventCircleId = (e.data as { circleId?: number })?.circleId;
      if (
        id &&
        (!eventCircleId || eventCircleId === id) &&
        RELOAD_EVENTS.includes(e.type)
      ) {
        this.load(id);
      }
    });
  }

  load(id: number): void {
    this.isLoading = true;
    this.api.details(id).subscribe({
      next: c => {
        this.circle = c;
        this.isLoading = false;
        this.api.history(id).subscribe({
          next: h => (this.history = h),
          error: () => {},
        });
        if (c.status === 'Active' || c.status === 'Completed') {
          this.api.rounds(id).subscribe({
            next: r => (this.allRounds = r),
            error: () => (this.allRounds = []),
          });
        } else {
          this.allRounds = [];
        }
        if (c.status === 'Active') {
          this.api.currentRound(id).subscribe({
            next: r => (this.round = r),
            error: () => (this.round = null),
          });
        } else {
          this.round = null;
        }
      },
      error: e => (this.error = this.errorMsg(e)),
    });
  }

  /** Randomly shuffle members and preview the payout order — does NOT call the API yet. */
  rollOrder(members: CircleMember[]): void {
    const shuffled = [...members];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.rolledOrder = shuffled.map((m, idx) => ({
      membershipId: m.membershipId,
      name: m.fullName,
      order: idx + 1,
    }));
  }

  /** Send the rolled order to the API and start the circle. */
  start(): void {
    if (!this.circle) return;
    this.actionLoading = true;
    this.error = '';

    const payoutOrder: MemberPayoutOrder[] = this.rolledOrder.map(e => ({
      membershipId: e.membershipId,
      order: e.order,
    }));

    this.api.start(this.circle.id, { payoutOrder }).subscribe({
      next: () => {
        this.actionLoading = false;
        this.rolledOrder = [];
        this.load(this.circle!.id);
      },
      error: e => {
        this.error = this.errorMsg(e);
        this.actionLoading = false;
      },
    });
  }

  addMember(): void {
    if (!this.circle || !this.memberIdentifier.trim()) return;
    this.api.addMember(this.circle.id, this.memberIdentifier.trim()).subscribe({
      next: () => {
        this.memberIdentifier = '';
        this.load(this.circle!.id);
      },
      error: e => (this.error = this.errorMsg(e)),
    });
  }

  join(): void {
    if (!this.circle) return;
    this.api.join(this.circle.id).subscribe({
      next: () => this.load(this.circle!.id),
      error: e => (this.error = this.errorMsg(e)),
    });
  }

  payout(): void {
    if (!this.circle) return;
    this.payoutLoading = true;
    this.api.payout(this.circle.id).subscribe({
      next: r => {
        this.payoutLoading = false;
        alert(r.message);
        this.load(this.circle!.id);
      },
      error: e => {
        this.error = this.errorMsg(e);
        this.payoutLoading = false;
      },
    });
  }

  paySelf(): void {
    if (!this.round || !this.myMembership || !this.circle) return;
    this.paymentLoading = true;
    this.api
      .payment(
        this.round.id,
        this.myMembership.membershipId,
        this.round.contribution,
        'Member simulated payment',
      )
      .subscribe({
        next: () => {
          this.paymentLoading = false;
          this.load(this.circle!.id);
        },
        error: e => {
          this.error = this.errorMsg(e);
          this.paymentLoading = false;
        },
      });
  }

  payMember(membershipId: number): void {
    if (!this.circle || !this.round) return;
    this.api
      .payment(
        this.round.id,
        membershipId,
        this.round.contribution,
        'Organizer recorded payment',
      )
      .subscribe({
        next: () => this.load(this.circle!.id),
        error: e => (this.error = this.errorMsg(e)),
      });
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map(x => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  avatarClass(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `avatar-${Math.abs(hash) % 8}`;
  }

  private errorMsg(e: unknown): string {
    const err = e as { error?: { message?: string; title?: string } };
    return err?.error?.message ?? err?.error?.title ?? 'Request failed.';
  }
}
