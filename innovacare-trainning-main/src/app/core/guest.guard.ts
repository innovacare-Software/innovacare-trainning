import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const afs = inject(Firestore);
  const router = inject(Router);

  const user = auth.currentUser;
  if (!user) {
    return router.parseUrl('/login');
  }

  const snap = await getDoc(doc(afs, `users/${user.uid}`));
  if (!snap.exists()) {
    return router.parseUrl('/login');
  }

  const profile = snap.data() as any;
  if (!profile?.isActive) {
    return router.parseUrl('/');
  }

  if (profile?.primaryRole !== 'guest') {
    return router.parseUrl('/');
  }

  return true;
};