import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, displayName, ROLE_LABELS } from '../../core/auth.service';

const APPLICANT_SHORTCUTS = [
  { title: 'Mes démarches', text: 'Déposer une demande et suivre vos dossiers.' },
  { title: 'Rendez-vous', text: 'Réserver un créneau auprès d’un service.' },
  { title: 'Signalements', text: 'Signaler un problème dans votre quartier.' },
];

const STAFF_SHORTCUTS = [
  { title: 'Dossiers à traiter', text: 'Qualifier, instruire et suivre les demandes.' },
  { title: 'Rendez-vous du jour', text: 'Accueil et planning du service.' },
  { title: 'Tableau de bord', text: 'Volumes, délais et dossiers en retard.' },
];

@Component({
  selector: 'app-espace',
  templateUrl: './espace.html',
  styleUrl: './espace.scss',
})
export class Espace implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly loadError = signal(false);
  protected readonly name = computed(() => {
    const u = this.user();
    return u ? displayName(u) : '';
  });
  protected readonly roleLabel = computed(() => {
    const u = this.user();
    return u ? ROLE_LABELS[u.role] : '';
  });
  protected readonly shortcuts = computed(() =>
    ['CITOYEN', 'ORGANISATION'].includes(this.user()?.role ?? '') ? APPLICANT_SHORTCUTS : STAFF_SHORTCUTS,
  );

  async ngOnInit(): Promise<void> {
    if (this.user()) return;
    try {
      await this.auth.loadMe();
    } catch {
      this.loadError.set(true);
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/connexion');
  }
}
