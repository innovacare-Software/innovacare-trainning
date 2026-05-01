import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type SecurePdfKind = 'resource' | 'document';

@Injectable({ providedIn: 'root' })
export class SecurePdfService {
  private readonly http = inject(HttpClient);

  fetchPdfBlob(resourceId: string, programId: string, kind: SecurePdfKind): Observable<Blob> {
    const params = new HttpParams()
      .set('programId', programId)
      .set('kind', kind);

    return this.http.get(`/secure-pdf/${encodeURIComponent(resourceId)}`, {
      params,
      responseType: 'blob',
    });
  }
}
