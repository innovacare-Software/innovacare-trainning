import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
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
  getIdToken,
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

const AUTO_CONNECTED_ORG_ID = 'Waxxi8M4qpTSsoGJ8fJS';

export type AppRole = 'super_admin' | 'manager' | 'admin' | 'learner' | 'guest' | 'instructor' | 'programAdmin' | 'programStaff' | 'programLearner';

export interface AppProfile {
  uid: string;
  email?: string;
  role: AppRole;
  primaryRole?: AppRole;
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
  onboarding?: {
    version?: string;
    completedStepIds?: string[];
    minimized?: boolean;
    dismissedAt?: any;
    completedAt?: any;
    updatedAt?: any;
  };
}

export interface OrgValidationResult {
  valid: boolean;
  orgId?: string;
  message?: string;
}

export interface RegisterWithEmailPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  learnerType: string;
  examGoal: string;
  organizationName?: string;
  referralSource?: string;
  goals?: string;
  rememberMe?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private afs = inject(Firestore);
  private injector = inject(Injector);

  private readySubject = new BehaviorSubject<boolean>(false);
  readonly ready$ = this.readySubject.asObservable();

  private profileSubject = new BehaviorSubject<AppProfile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  private authSub?: Subscription;
  private profileSub?: Subscription;

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  constructor() {
    this.authSub = this.inContext(() => authState(this.auth)).subscribe((user) => {
      this.readySubject.next(false);
      this.profileSubject.next(null);

      this.profileSub?.unsubscribe();
      this.profileSub = undefined;

      if (!user) {
        this.readySubject.next(true);
        return;
      }

      const ref = doc(this.afs, `users/${user.uid}`);
      this.profileSub = this.inContext(() => docData(ref, { idField: 'uid' })).subscribe({
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
    rememberMe = true,
    trackLogin = true
  ): Promise<UserCredential> {
    await this.setRememberMe(rememberMe);
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    await this.reconcileAutoConnectedGuestProfile(cred.user.uid);
    if (trackLogin) {
      await this.markLoginActivity(cred.user.uid);
    }
    return cred;
  }

  async registerWithEmail(payload: RegisterWithEmailPayload): Promise<UserCredential> {
    const fullName = payload.fullName?.trim() ?? '';
    const email = payload.email?.trim() ?? '';
    const password = payload.password;
    const rememberMe = payload.rememberMe ?? true;

    await this.setRememberMe(rememberMe);

    const cred = await createUserWithEmailAndPassword(this.auth, email, password);

    if (fullName) {
      await updateProfile(cred.user, {
        displayName: fullName,
      });
    }

    await this.ensureAuthTokenReady();

    await this.ensureUserProfile({
      uid: cred.user.uid,
      email: cred.user.email ?? email,
      displayName: fullName,
      role: 'guest',
      orgId: AUTO_CONNECTED_ORG_ID,
      active: true,
    });

    await this.storeRegistrationRecord(cred.user.uid, {
      ...payload,
      email,
      fullName,
    });

    return cred;
  }

  async loginWithGoogle(rememberMe = true): Promise<UserCredential> {
    await this.setRememberMe(rememberMe);

    const cred = await signInWithPopup(this.auth, new GoogleAuthProvider());

    await this.ensureAuthTokenReady();

    await this.ensureUserProfile({
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      displayName: cred.user.displayName ?? '',
      role: 'guest',
      orgId: AUTO_CONNECTED_ORG_ID,
      active: true,
    });

    await this.reconcileAutoConnectedGuestProfile(cred.user.uid);
    await this.markLoginActivity(cred.user.uid);

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
      params.rememberMe ?? true,
      false
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

    let profileOrgId = String(profile.orgId || '').trim();

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

    await this.markLoginActivity(cred.user.uid);

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

  private async ensureAuthTokenReady(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }

    try {
      await getIdToken(user);
    } catch {
      // Firestore will still reject if the token cannot be established.
    }
  }

  private async markLoginActivity(uid: string): Promise<void> {
    await setDoc(
      doc(this.afs, `users/${uid}`),
      {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  private async ensureUserProfile(profile: AppProfile): Promise<void> {
    await setDoc(
      doc(this.afs, `users/${profile.uid}`),
      {
        uid: profile.uid,
        email: profile.email ?? '',
        role: profile.role,
        orgId: profile.orgId ?? null,
        accessCode: profile.accessCode ?? null,
        orgAccessCode: profile.orgAccessCode ?? null,
        active: profile.active ?? true,
        displayName: profile.displayName ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  private async storeRegistrationRecord(
    uid: string,
    payload: Omit<RegisterWithEmailPayload, 'password'> & { password?: string }
  ): Promise<void> {
    await setDoc(
      doc(this.afs, `register/${uid}`),
      {
        uid,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone?.trim() ?? '',
        country: payload.country?.trim() ?? '',
        learnerType: payload.learnerType?.trim() ?? '',
        examGoal: payload.examGoal?.trim() ?? '',
        organizationName: payload.organizationName?.trim() ?? '',
        referralSource: payload.referralSource?.trim() ?? '',
        goals: payload.goals?.trim() ?? '',
        source: 'public_register',
        status: 'new',
        role: 'guest',
        orgId: AUTO_CONNECTED_ORG_ID,
        profileComplete: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  private async reconcileAutoConnectedGuestProfile(uid: string): Promise<void> {
    const userRef = doc(this.afs, `users/${uid}`);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return;
    }

    const profile = userSnap.data() as AppProfile;
    const role = String(profile.role || profile.primaryRole || '').trim();
    if (role !== 'guest') {
      return;
    }

    const currentOrgId = String(profile.orgId || '').trim();
    if (currentOrgId === AUTO_CONNECTED_ORG_ID) {
      return;
    }

    await setDoc(
      userRef,
      {
        orgId: AUTO_CONNECTED_ORG_ID,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}