import { HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('ekub_token');

  const url = req.url;
  const isApiRequest =
    url.startsWith('/api') ||
    url.startsWith('/hubs') ||
    url.includes('localhost:5000');

  // Attach token if we have one and this is an API request
  const outgoing =
    token && isApiRequest
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(outgoing).pipe(
    catchError(err => {
      // If any API call returns 401, clear the stale session and redirect to login
      if (isApiRequest && err?.status === HttpStatusCode.Unauthorized) {
        localStorage.removeItem('ekub_token');
        localStorage.removeItem('ekub_user');
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
