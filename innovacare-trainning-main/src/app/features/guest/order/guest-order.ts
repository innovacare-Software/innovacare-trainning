import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Order } from '../../../data/guest-commerce.model';


@Component({
  selector: 'app-guest-orders',
  standalone: true,
  imports: [CommonModule],
 templateUrl: './guest-order.html',
  styleUrls: ['./guest-order.css'],
})

export class GuestOrdersComponent {
  private auth = inject(Auth);
  private afs = inject(Firestore);

  orders = toSignal(
    authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid) return of([]);
        return collectionData(
          collection(this.afs, `users/${user.uid}/orders`),
          { idField: 'id' }
        ) as Observable<Order[]>;
      })
    ),
    { initialValue: [] as Order[] }
  );
}