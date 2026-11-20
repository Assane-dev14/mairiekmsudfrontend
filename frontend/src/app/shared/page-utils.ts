import { HttpErrorResponse } from '@angular/common/http';
import { Pipe, PipeTransform } from '@angular/core';

export const TITLE_SUFFIX = ' — Portail citoyen de Keur Massar Sud';

export type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

export function isNotFound(e: unknown): boolean {
  return e instanceof HttpErrorResponse && e.status === 404;
}

/** Fait défiler jusqu'à l'ancre une fois le contenu chargé (ex. /faq#faq-…), et ouvre un <details> ciblé. */
export function scrollToFragment(fragment: string | null): void {
  if (!fragment) return;
  setTimeout(() => {
    const el = document.getElementById(fragment);
    if (!el) return;
    if (el instanceof HTMLDetailsElement) el.open = true;
    el.scrollIntoView({ block: 'start' });
    el.focus({ preventScroll: true });
  });
}

const DATE_FR = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

@Pipe({ name: 'dateFr' })
export class DateFrPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return value ? DATE_FR.format(new Date(value)) : '';
  }
}
