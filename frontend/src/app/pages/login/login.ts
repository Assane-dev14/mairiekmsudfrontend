import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly year = new Date().getFullYear();
  protected readonly demoAccounts = environment.demoAccounts;
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sessionExpired = this.route.snapshot.queryParamMap.get('session') === 'expiree';

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected useDemo(email: string): void {
    this.form.setValue({ email, password: environment.demoPassword });
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl(this.safeReturnUrl());
    } catch (e) {
      this.error.set(loginErrorMessage(e));
      this.form.controls.password.reset();
    } finally {
      this.loading.set(false);
    }
  }

  // N'accepte que des chemins internes, pour éviter toute redirection vers un site tiers.
  private safeReturnUrl(): string {
    const back = this.route.snapshot.queryParamMap.get('retour');
    return back && back.startsWith('/') && !back.startsWith('//') ? back : '/espace';
  }
}

function loginErrorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.';
    if (e.status === 400 || e.status === 401) return 'Adresse e-mail ou mot de passe incorrect.';
    if (e.status === 403 && typeof e.error?.message === 'string') return `${e.error.message}.`;
    if (e.status === 429) return 'Trop de tentatives de connexion. Patientez une minute avant de réessayer.';
    if (e.status >= 500) return 'Le service est momentanément indisponible. Réessayez dans quelques instants.';
  }
  return 'Une erreur inattendue est survenue. Réessayez dans quelques instants.';
}
