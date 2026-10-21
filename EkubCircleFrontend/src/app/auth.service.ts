import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RealtimeService } from './realtime.service';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  VerifyOtpRequest,
} from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);

  private readonly TOKEN_KEY = 'ekub_token';
  private readonly USER_KEY = 'ekub_user';

  register(body: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', body);
  }

  verifyOtp(body: VerifyOtpRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/verify-otp', body)
      .pipe(tap(r => this.startSession(r)));
  }

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', body)
      .pipe(tap(r => this.startSession(r)));
  }

  saveSession(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response));
  }

  token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  user(): AuthResponse | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }

  logout(): void {
    this.realtime.disconnect();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  private startSession(response: AuthResponse): void {
    this.saveSession(response);
    this.realtime.connect();
  }
}
