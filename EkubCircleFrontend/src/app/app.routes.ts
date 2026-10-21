import { Routes } from '@angular/router';
import { authGuard } from './guards';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { VerifyOtpComponent } from './pages/verify-otp.component';
import { DashboardComponent } from './pages/dashboard.component';
import { CircleComponent } from './pages/circle.component';
import { CreateCircleComponent } from './pages/create-circle.component';
import { ProfileComponent } from './pages/profile.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-otp', component: VerifyOtpComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'circles/new', component: CreateCircleComponent, canActivate: [authGuard] },
  { path: 'circles/:id', component: CircleComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
