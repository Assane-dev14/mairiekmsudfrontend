import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, firstValueFrom, Observable, shareReplay, tap } from 'rxjs';

export type Role =
  | 'CITOYEN'
  | 'ORGANISATION'
  | 'AGENT'
  | 'RESPONSABLE'
  | 'EDITEUR'
  | 'ADMIN_FONCTIONNEL'
  | 'SUPER_ADMIN';

export interface Me {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  CITOYEN: 'Citoyen',
  ORGANISATION: 'Organisation',
  AGENT: 'Agent municipal',
  RESPONSABLE: 'Responsable de service',
  EDITEUR: 'Éditeur',
  ADMIN_FONCTIONNEL: 'Administrateur fonctionnel',
  SUPER_ADMIN: 'Super administrateur',
};

const API = '/api/v1/auth';
// sessionStorage : la session ne survit pas à la fermeture de l'onglet.
// À terme, le jeton de rafraîchissement passera dans un cookie httpOnly côté API.
const STORAGE_KEY = 'km.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = signal<Tokens | null>(readStoredTokens());
  private refreshing$: Observable<Tokens> | null = null;

  readonly user = signal<Me | null>(null);
  readonly isLoggedIn = computed(() => this.tokens() !== null);

  get accessToken(): string | null {
    return this.tokens()?.accessToken ?? null;
  }

  get canRefresh(): boolean {
    return !!this.tokens()?.refreshToken;
  }

  async login(email: string, password: string): Promise<Me> {
    const tokens = await firstValueFrom(this.http.post<Tokens>(`${API}/login`, { email, password }));
    this.setTokens(tokens);
    return this.loadMe();
  }

  async loadMe(): Promise<Me> {
    const me = await firstValueFrom(this.http.get<Me>(`${API}/me`));
    this.user.set(me);
    return me;
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokens()?.refreshToken;
    this.clear();
    if (refreshToken) {
      await firstValueFrom(this.http.post(`${API}/logout`, { refreshToken })).catch(() => undefined);
    }
  }

  /** Un seul rafraîchissement à la fois, partagé entre les requêtes qui ont reçu un 401. */
  refresh(): Observable<Tokens> {
    if (!this.refreshing$) {
      this.refreshing$ = this.http
        .post<Tokens>(`${API}/refresh`, { refreshToken: this.tokens()?.refreshToken })
        .pipe(
          tap((t) => this.setTokens(t)),
          finalize(() => (this.refreshing$ = null)),
          shareReplay(1),
        );
    }
    return this.refreshing$;
  }

  clear(): void {
    this.tokens.set(null);
    this.user.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible : rien à nettoyer */
    }
  }

  private setTokens(tokens: Tokens): void {
    this.tokens.set(tokens);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      /* navigation privée stricte : la session reste en mémoire */
    }
  }
}

function readStoredTokens(): Tokens | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function displayName(me: Me): string {
  return me.organizationName || [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email;
}
