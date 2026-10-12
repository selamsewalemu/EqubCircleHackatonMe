import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RealtimeService } from '../realtime.service';
import { DashboardSummary } from '../models';
import { ApiService } from '../api.service';
import { CircleSummary } from '../models';

@Component({ selector: 'app-dashboard', standalone: true, imports: [CommonModule, FormsModule, RouterLink], template: `
<section class="page">
  <div class="hero-row"><div><div class="eyebrow">YOUR EKUB</div><h1>Good to see you, {{firstName}}.</h1><p class="muted">Track every contribution and payout with confidence.</p></div><a routerLink="/circles/new" class="btn primary">+ Create circle</a></div>
  <div class="stats"><div><span>My circles</span><strong>{{mine.length}}</strong></div><div><span>Total contributions</span><strong>{{(summary?.totalContributions ?? 0) | number:'1.0-2'}} ETB</strong></div><div><span>Total payouts received</span><strong>{{(summary?.totalPayoutsReceived ?? 0) | number:'1.0-2'}} ETB</strong></div></div>
  <div class="next-grid">
    <a class="next-card" *ngIf="summary?.nextPaymentCircle as p; else noPayment" [routerLink]="['/circles', p.circleId]"><div class="eyebrow">NEXT PAYMENT CIRCLE</div><h3>{{p.circleName}}</h3><strong>{{p.contributionAmount | number:'1.0-2'}} ETB</strong><p>Round {{p.roundNumber}} · {{p.frequency}}</p><span class="next-status">{{p.message}}</span></a>
    <ng-template #noPayment><div class="next-card muted-card"><div class="eyebrow">NEXT PAYMENT CIRCLE</div><h3>No payment due</h3><p>You are up to date on your active circles.</p></div></ng-template>
    <a class="next-card" *ngIf="summary?.nextPayoutCircle as p; else noPayout" [routerLink]="['/circles', p.circleId]"><div class="eyebrow">NEXT PAYOUT CIRCLE</div><h3>{{p.circleName}}</h3><strong>{{p.ready ? 'Ready for payout' : 'Waiting for payments'}}</strong><p>Round {{p.roundNumber}} · Receiver: {{p.receiverName}}</p><span class="next-status">{{p.message}}</span></a>
    <ng-template #noPayout><div class="next-card muted-card"><div class="eyebrow">NEXT PAYOUT CIRCLE</div><h3>No payout queued</h3><p>You are not currently next in an active circle.</p></div></ng-template>
  </div>
  <div class="section-head"><div><h2>My circles</h2><p class="muted">Circles where you are an active member.</p></div></div>
  <div class="cards" *ngIf="mine.length; else noMine"><a class="circle-card" *ngFor="let c of mine" [routerLink]="['/circles', c.id]"><div class="card-top"><span class="status" [class.active]="c.status==='Active'">{{c.status}}</span><span>{{c.frequency}}</span></div><h3>{{c.name}}</h3><p>{{c.organizerName}}</p><div class="card-bottom"><strong>{{c.contributionAmount | number:'1.0-2'}} ETB</strong><span>{{c.memberCount}} / {{c.memberLimit}} members</span></div></a></div>
  <ng-template #noMine><div class="empty"><h3>No circles yet</h3><p>Create your first circle or join an available one.</p></div></ng-template>
  <div class="section-head browse"><div><h2>Available circles</h2><p class="muted">Join an open community circle.</p></div><div class="filters"><input [(ngModel)]="search" (keyup.enter)="loadAvailable()" placeholder="Search circles…"/><select [(ngModel)]="frequency" (change)="loadAvailable()"><option value="">All frequencies</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option></select></div></div>
  <div class="cards" *ngIf="available.length; else noAvailable"><div class="circle-card join-card" *ngFor="let c of available"><div class="card-top"><span class="status">OPEN</span><span>{{c.frequency}}</span></div><h3>{{c.name}}</h3><p>Organized by {{c.organizerName}}</p><div class="card-bottom"><strong>{{c.contributionAmount | number:'1.0-2'}} ETB</strong><button class="btn small" (click)="join(c.id)">{{joiningId===c.id ? 'Joining…' : 'Join'}}</button></div></div></div>
  <ng-template #noAvailable><div class="empty"><h3>No open circles found</h3><p>Try another search or create your own.</p></div></ng-template>
  <div class="error" *ngIf="error">{{error}}</div>
</section>` })
export class DashboardComponent {
  private api = inject(ApiService); private realtime = inject(RealtimeService); mine: CircleSummary[] = []; available: CircleSummary[] = []; summary: DashboardSummary | null = null; search=''; frequency=''; joiningId:number|null=null; error='';
  get firstName(){ return this.mineUserName(); } get activeCount(){ return this.mine.filter(c=>c.status==='Active').length; }
  constructor(){ this.load(); this.realtime.events$.subscribe(e=>{ if(['circleCreated','memberJoined','circleStarted','paymentRecorded','payoutCompleted'].includes(e.type)) this.load(); }); }
  private mineUserName(){ const raw=localStorage.getItem('ekub_user'); if(!raw)return 'there'; const n=JSON.parse(raw).fullName||'there'; return n.split(' ')[0]; }
  load(){ this.api.mine().subscribe({next:r=>this.mine=r,error:e=>this.error=this.msg(e)}); this.api.dashboardSummary().subscribe({next:r=>this.summary=r,error:e=>this.error=this.msg(e)}); this.loadAvailable(); }
  loadAvailable(){ this.api.available(this.search,this.frequency).subscribe({next:r=>this.available=r,error:e=>this.error=this.msg(e)}); }
  join(id:number){ this.joiningId=id; this.api.join(id).subscribe({next:()=>{this.joiningId=null; this.load();},error:e=>{this.error=this.msg(e);this.joiningId=null;}}); }
  private msg(e:any){return e?.error?.message||e?.error?.title||'Request failed.';}
}
