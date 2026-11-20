import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PublicApi } from '../core/public-api';

/** « Signaler une information obsolète » (§4.2), en bas des pages d'information. */
@Component({
  selector: 'app-report-outdated',
  imports: [ReactiveFormsModule],
  template: `
    <details class="report" [open]="open()" (toggle)="open.set($any($event.target).open)">
      <summary>Une information est inexacte ou obsolète ? Signalez-la</summary>

      @if (sent()) {
        <p class="notice notice-success" role="status">Merci, votre signalement a bien été transmis à la mairie.</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-field">
            <label for="report-message">Qu’est-ce qui n’est plus à jour ?</label>
            <textarea
              id="report-message"
              formControlName="message"
              rows="4"
              maxlength="1000"
              [attr.aria-invalid]="invalid('message')"
              [attr.aria-describedby]="invalid('message') ? 'report-message-error' : null"
            ></textarea>
            @if (invalid('message')) {
              <p class="field-error" id="report-message-error">Décrivez le problème en 10 caractères au moins.</p>
            }
          </div>
          <div class="form-field">
            <label for="report-email">Votre adresse e-mail <span class="optional">(facultatif, pour être recontacté)</span></label>
            <input
              id="report-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              [attr.aria-invalid]="invalid('email')"
              [attr.aria-describedby]="invalid('email') ? 'report-email-error' : null"
            />
            @if (invalid('email')) {
              <p class="field-error" id="report-email-error">Saisissez une adresse e-mail valide ou laissez le champ vide.</p>
            }
          </div>
          @if (error(); as message) {
            <p class="notice notice-error" role="alert">{{ message }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="sending()">
            {{ sending() ? 'Envoi…' : 'Envoyer le signalement' }}
          </button>
        </form>
      }
    </details>
  `,
})
export class ReportOutdated {
  private readonly api = inject(PublicApi);
  private readonly router = inject(Router);

  readonly pageTitle = input<string>();

  protected readonly open = signal(false);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    email: ['', Validators.email],
  });

  protected invalid(name: 'message' | 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    const { message, email } = this.form.getRawValue();
    try {
      await this.api.reportContent({
        pagePath: this.router.url.split(/[?#]/)[0],
        pageTitle: this.pageTitle(),
        message: message.trim(),
        email: email.trim() || undefined,
      });
      this.sent.set(true);
    } catch (e) {
      this.error.set(
        e instanceof HttpErrorResponse && e.status === 429
          ? 'Trop de signalements envoyés. Réessayez dans une minute.'
          : 'L’envoi a échoué. Vérifiez votre connexion puis réessayez.',
      );
    } finally {
      this.sending.set(false);
    }
  }
}
