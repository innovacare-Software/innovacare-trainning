import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Functions, httpsCallable } from '@angular/fire/functions';

interface VerifyResult {
  valid: boolean;
  learnerName?: string;
  courseTitle?: string;
  issuedAt?: string | null;
  orgName?: string;
  verificationCode?: string;
  certificateUrl?: string | null;
  status?: string;
}

@Component({
  selector: 'certificate-verify-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <main class="cert-verify">
      <header class="cv-head">
        <h1>Certificate verification</h1>
        <p>Innovacare Review &amp; Training — public authenticity check</p>
      </header>

      <section class="cv-card" *ngIf="loading()">
        <p>Verifying certificate…</p>
      </section>

      <section class="cv-card error" *ngIf="!loading() && error()">
        <h2>Could not verify</h2>
        <p>{{ error() }}</p>
        <a routerLink="/">Back to home</a>
      </section>

      <section class="cv-card valid" *ngIf="!loading() && result()?.valid">
        <div class="badge ok">Verified</div>
        <h2>{{ result()!.courseTitle }}</h2>
        <p class="lead">Issued to <strong>{{ result()!.learnerName }}</strong></p>
        <dl>
          <dt>Issued on</dt>
          <dd>{{ result()!.issuedAt ? (result()!.issuedAt | date:'mediumDate') : '—' }}</dd>
          <dt>Issued by</dt>
          <dd>{{ result()!.orgName || 'Innovacare' }}</dd>
          <dt>Verification code</dt>
          <dd class="code">{{ result()!.verificationCode }}</dd>
        </dl>
        <p class="actions" *ngIf="result()!.certificateUrl">
          <a [href]="result()!.certificateUrl" target="_blank" rel="noopener">Download certificate</a>
        </p>
      </section>

      <section class="cv-card invalid" *ngIf="!loading() && result() && !result()!.valid">
        <div class="badge ko">Not found</div>
        <h2>This certificate could not be verified</h2>
        <p>The verification code does not match any issued certificate. Please double-check the code on the document.</p>
        <a routerLink="/">Back to home</a>
      </section>
    </main>
  `,
  styles: [`
    .cert-verify { max-width: 640px; margin: 2rem auto; padding: 0 1rem; font-family: inherit; }
    .cv-head h1 { margin: 0; font-size: 1.6rem; color: #102f4f; }
    .cv-head p { color: #5a7590; margin: .25rem 0 1.25rem; }
    .cv-card { background: #fff; border: 1px solid #d8e2ec; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 4px 14px rgba(20,40,60,.05); }
    .cv-card.valid { border-color: #b6e0bf; }
    .cv-card.invalid { border-color: #f0c1b6; }
    .cv-card.error { border-color: #f0c1b6; }
    .badge { display: inline-block; padding: .25rem .7rem; border-radius: 999px; font-size: .78rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; margin-bottom: .65rem; }
    .badge.ok { background: #2c7a3c; color: #fff; }
    .badge.ko { background: #b21010; color: #fff; }
    h2 { margin: .25rem 0 .5rem; color: #102f4f; }
    .lead { color: #44607a; margin: 0 0 1rem; }
    dl { display: grid; grid-template-columns: 160px 1fr; gap: .35rem .75rem; margin: .5rem 0 0; font-size: .92rem; }
    dt { color: #5a7590; font-weight: 600; }
    dd { margin: 0; word-break: break-all; }
    dd.code { font-family: ui-monospace, monospace; }
    .actions { margin-top: 1rem; }
    .actions a { display: inline-block; padding: .5rem .9rem; background: #1f486c; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; }
  `],
})
export class CertificateVerifyPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly functions = inject(Functions);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly result = signal<VerifyResult | null>(null);

  async ngOnInit(): Promise<void> {
    const code = String(this.route.snapshot.paramMap.get('code') || '').trim();
    if (!code) {
      this.loading.set(false);
      this.error.set('No verification code provided.');
      return;
    }
    try {
      const callable = httpsCallable<{ code: string }, VerifyResult>(
        this.functions,
        'verifyCertificateByCode',
      );
      const ret = await callable({ code });
      this.result.set(ret.data || { valid: false });
    } catch (err: any) {
      console.error('[CertificateVerify] failed', err);
      this.error.set(err?.message || 'Verification service unavailable.');
    } finally {
      this.loading.set(false);
    }
  }
}
