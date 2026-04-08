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
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  serverTimestamp,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { BehaviorSubject, Subscription } from 'rxjs';

export type AppRole = 'super_admin' | 'manager' | 'admin' | 'learner' | 'guest';

export interface AppProfile {
  uid: string;
  email?: string;
  role: AppRole;
  orgId?: string | null;
  accessCode?: string | null;
  orgAccessCode?: string | null;
  active?: boolean;
  isProgramAdmin?: boolean;
  isProgramStaff?: boolean;
  isProgramLearner?: boolean;
  displayName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface OrgValidationResult {
  valid: boolean;
  orgId?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private afs = inject(Firestore);

  private readySubject = new BehaviorSubject<boolean>(false);
  readonly ready$ = this.readySubject.asObservable();

  private profileSubject = new BehaviorSubject<AppProfile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

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

  async setRememberMe(remember: boolean): Promise<void> {
    await setPersistence(
      this.auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );
  }

  async loginWithEmail(
    email: string,
    password: string,
    rememberMe = true
  ): Promise<UserCredential> {
    await this.setRememberMe(rememberMe);
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async registerWithEmail(
    email: string,
    password: string,
    fullName: string,
    rememberMe = true
  ): Promise<UserCredential> {
    await this.setRememberMe(rememberMe);

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

  async loginWithGoogle(rememberMe = true): Promise<UserCredential> {
    await this.setRememberMe(rememberMe);

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

  async validateOrgCode(orgCode: string): Promise<OrgValidationResult> {
    const rawCode = orgCode.trim();
    const upperCode = rawCode.toUpperCase();
    const lowerCode = rawCode.toLowerCase();
    if (!rawCode) {
      return { valid: false, message: 'Organization code is required.' };
    }

    const organizationsRef = collection(this.afs, 'organizations');

    const candidates = Array.from(new Set([rawCode, upperCode, lowerCode].filter(Boolean)));
    let orgDoc: any = null;

    // Try accessCode/orgId field variants first.
    for (const candidate of candidates) {
      const byAccessCode = await getDocs(query(organizationsRef, where('accessCode', '==', candidate)));
      if (!byAccessCode.empty) {
        orgDoc = byAccessCode.docs[0];
        break;
      }

      const byOrgIdField = await getDocs(query(organizationsRef, where('orgId', '==', candidate)));
      if (!byOrgIdField.empty) {
        orgDoc = byOrgIdField.docs[0];
        break;
      }
    }

    // Legacy fallback: some tenants use the organization document id as login code.
    if (!orgDoc) {
      for (const candidate of candidates) {
        const byDocId = await getDoc(doc(this.afs, `organizations/${candidate}`));
        if (byDocId.exists()) {
          orgDoc = byDocId;
          break;
        }
      }
    }

    if (!orgDoc) {
      return { valid: false, message: 'Invalid or inactive organization code.' };
    }

    const orgData = orgDoc.data() as { active?: boolean };

    // Missing active flag is treated as active for backward compatibility.
    if (orgData.active === false) {
      return { valid: false, message: 'Invalid or inactive organization code.' };
    }

    return {
      valid: true,
      orgId: orgDoc.id,
    };
  }

  async loginWithOrganization(params: {
    orgCode: string;
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<UserCredential> {
    const validation = await this.validateOrgCode(params.orgCode);
    if (!validation.valid || !validation.orgId) {
      throw new Error(validation.message || 'Invalid organization code.');
    }

    const cred = await this.loginWithEmail(
      params.email,
      params.password,
      params.rememberMe ?? true
    );

    const userRef = doc(this.afs, `users/${cred.user.uid}`);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User profile not found.');
    }

    const profile = userSnap.data() as AppProfile;
    const normalizedInputCode = params.orgCode.trim().toUpperCase();

    if (profile.active === false) {
      throw new Error('This account is inactive.');
    }

    const profileOrgId = String(profile.orgId || '').trim();
    if (!profileOrgId) {
      throw new Error('This account is not linked to an organization. Contact your admin.');
    }

    if (profileOrgId !== validation.orgId) {
      throw new Error('This account does not belong to the provided organization.');
    }

    const profileAccessCode = String(profile.accessCode || profile.orgAccessCode || '').trim().toUpperCase();
    if (profileAccessCode && profileAccessCode !== normalizedInputCode) {
      throw new Error('Invalid organization code for this account.');
    }

    if (!profileAccessCode) {
      await setDoc(
        userRef,
        {
          accessCode: normalizedInputCode,
          orgAccessCode: normalizedInputCode,
          loginType: 'organization',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return cred;
  }

  async logout(): Promise<void> {
    this.readySubject.next(false);
    this.profileSubject.next(null);
    this.profileSub?.unsubscribe();
    this.profileSub = undefined;

    await signOut(this.auth);
  }

  async resetPassword(email: string): Promise<void> {
    const clean = email.trim();
    if (!clean) {
      throw new Error('Email is required.');
    }

    await sendPasswordResetEmail(this.auth, clean);
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