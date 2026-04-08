import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../enviroments/enviroment';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  constructor(private auth: Auth) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isCloudFunctionRequest(req.url)) {
      return next.handle(req);
    }

    return from(this.auth.currentUser?.getIdToken() ?? Promise.resolve(null)).pipe(
      switchMap((token) => {
        if (!token) {
          return next.handle(req);
        }

        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });

        return next.handle(authReq);
      })
    );
  }

  private isCloudFunctionRequest(url: string): boolean {
    const endpoints = [environment.api.checkoutUrl];

    return endpoints.some((endpoint) => !!endpoint && url.startsWith(endpoint));
  }
}
