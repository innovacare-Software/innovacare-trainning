import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  UserCredential,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { BehaviorSubject, Subscription } from 'rxjs';

export type AppRole = 'super_admin' | 'manager' | 'admin' | 'learner' | 'guest';

export interface AppProfile {
  uid: string;
  email?: string;
  role: AppRole;
  orgId?: string | null;
  active?: boolean;
  displayName?: string;
  createdAt?: any;
  updatedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private afs = inject(Firestore);

  private readySubject = new BehaviorSubject<boolean>(false);
  ready$ = this.readySubject.asObservable();

  private profileSubject = new BehaviorSubject<AppProfile | null>(null);
  profile$ = this.profileSubject.asObservable();

  private authSub?: Subscription;
  private profileSub?: Subscription;

  constructor() {
    this.authSub = authState(this.auth).subscribe((user) => {
      this.readySubject.next(false);
      this.profileSubject.next(null);

      this.profileSub?.unsubscribe();
      this.profileSub = undefined;

      if (!user) {
        this.readySubject.next(true);
        return;
      }

      const ref = doc(this.afs, `users/${user.uid}`);
      this.profileSub = docData(ref, { idField: 'uid' }).subscribe({
        next: (profile: any) => {
          this.profileSubject.next(profile ? (profile as AppProfile) : null);
          this.readySubject.next(true);
        },
        error: () => {
          this.profileSubject.next(null);
          this.readySubject.next(true);
        },
      });
    });
  }

  get currentUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  async loginWithEmail(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async registerWithEmail(
    email: string,
    password: string,
    fullName: string
  ): Promise<UserCredential> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);

    if (fullName?.trim()) {
      await updateProfile(cred.user, {
        displayName: fullName.trim(),
      });
    }

    await this.ensureUserProfile({
      uid: cred.user.uid,
      email: cred.user.email ?? email,
      displayName: fullName?.trim() || '',
      role: 'guest',
      orgId: null,
      active: true,
    });

    return cred;
  }

  async loginWithGoogle(): Promise<UserCredential> {
    const cred = await signInWithPopup(this.auth, new GoogleAuthProvider());

    await this.ensureUserProfile({
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      displayName: cred.user.displayName ?? '',
      role: 'guest',
      orgId: null,
      active: true,
    });

    return cred;
  }

  async logout(): Promise<void> {
    this.readySubject.next(false);
    this.profileSubject.next(null);
    this.profileSub?.unsubscribe();
    this.profileSub = undefined;

    await signOut(this.auth);
  }

  resetPassword(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  private async ensureUserProfile(profile: AppProfile): Promise<void> {
    await setDoc(
      doc(this.afs, `users/${profile.uid}`),
      {
        uid: profile.uid,
        email: profile.email ?? '',
        role: profile.role,
        orgId: profile.orgId ?? null,
        active: profile.active ?? true,
        displayName: profile.displayName ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}