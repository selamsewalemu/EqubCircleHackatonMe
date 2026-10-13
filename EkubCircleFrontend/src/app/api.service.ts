import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CircleDetails,
  CircleSummary,
  CreateCircleRequest,
  DashboardSummary,
  HistoryItem,
  MemberPayoutOrder,
  PayoutResponse,
  Round,
  StartRequest,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ── Circles ──────────────────────────────────────────────────────────────

  mine(): Observable<CircleSummary[]> {
    return this.http.get<CircleSummary[]>('/api/circles/mine');
  }

  available(search = '', frequency = ''): Observable<CircleSummary[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (frequency) params = params.set('frequency', frequency);
    return this.http.get<CircleSummary[]>('/api/circles/available', { params });
  }

  createCircle(body: CreateCircleRequest): Observable<CircleSummary> {
    return this.http.post<CircleSummary>('/api/circles', body);
  }

  details(id: number): Observable<CircleDetails> {
    return this.http.get<CircleDetails>(`/api/circles/${id}`);
  }

  join(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/circles/${id}/join`, {});
  }

  addMember(id: number, emailOrPhone: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/circles/${id}/members`, { emailOrPhone });
  }

  start(id: number, body: StartRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/circles/${id}/start`, body);
  }

  // ── Rounds ────────────────────────────────────────────────────────────────

  currentRound(circleId: number): Observable<Round> {
    return this.http.get<Round>(`/api/circles/${circleId}/current-round`);
  }

  rounds(circleId: number): Observable<Round[]> {
    return this.http.get<Round[]>(`/api/circles/${circleId}/rounds`);
  }

  history(circleId: number): Observable<HistoryItem[]> {
    return this.http.get<HistoryItem[]>(`/api/circles/${circleId}/history`);
  }

  // ── Payments & Payouts ────────────────────────────────────────────────────

  payment(
    roundId: number,
    membershipId: number,
    amount: number,
    referenceNote = '',
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `/api/rounds/${roundId}/payments/${membershipId}`,
      { amount, referenceNote, paidAt: new Date().toISOString() },
    );
  }

  payout(circleId: number): Observable<PayoutResponse> {
    return this.http.post<PayoutResponse>(`/api/circles/${circleId}/payout`, {});
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  dashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>('/api/dashboard/summary');
  }
}
