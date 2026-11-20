import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const PUBLIC_AUTH_CALL = /\/auth\/(login|register|refresh|logout)$/;

/**
 * Ajoute le jeton d'accès aux appels de l'API. Sur un 401, tente un rafraîchissement
 * puis rejoue la requête une seule fois ; en cas d'échec, renvoie vers la connexion.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith('/api/') || PUBLIC_AUTH_CALL.test(req.url)) return next(req);

  const withToken = (r: HttpRequest<unknown>) => {
    const token = auth.accessToken;
    return token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
  };

  return next(withToken(req)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !auth.canRefresh) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        switchMap(() => next(withToken(req))),
        catchError((refreshErr: unknown) => {
          auth.clear();
          router.navigate(['/connexion'], { queryParams: { session: 'expiree' } });
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
