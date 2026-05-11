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

/**
 * Legacy public-org id (Innovacare main).
 *
 * SECURITY: New users MUST NOT be auto-attached to this org. It is kept only
 * for read-only public catalog access. Authorization for any private/admin
 * area is granted exclusively via `userOrgMemberships`.
 */
const LEGACY_PUBLIC_ORG_ID = 'Waxxi8M4qpTSsoGJ8fJS';

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

      const expectedUid = user.uid;
      const ref = doc(this.afs, `users/${expectedUid}`);
      this.profileSub = this.inContext(() => docData(ref, { idField: 'uid' })).subscribe({
        next: (profile: any) => {
          // Guard against late emissions from a previous user's listener
          // arriving after a fast account switch.
          if (this.auth.currentUser?.uid !== expectedUid) {
            return;
          }

          if (profile && profile.uid) {
            this.profileSubject.next(profile as AppProfile);
          } else {
            // Doc missing: surface a minimal profile so the login flow can
            // resolve instead of hanging forever waiting for `profile.uid`.
            // Downstream guards still gate on role/orgId via memberships.
            console.warn('[AuthService] users/' + expectedUid + ' is missing — using fallback profile.');
            this.profileSubject.next({
              uid: expectedUid,
              email: user.email ?? '',
              role: 'guest',
              active: true,
              orgId: null,
            } as AppProfile);
          }
          this.readySubject.next(true);
        },
        error: (err) => {
          console.error('[AuthService] users/' + expectedUid + ' read failed', err);
          if (this.auth.currentUser?.uid !== expectedUid) {
            return;
          }
          // Same fallback as missing-doc: keep the spinner from hanging while
          // the user is redirected to a safe area for a super_admin to fix.
          this.profileSubject.next({
            uid: expectedUid,
            email: user.email ?? '',
            role: 'guest',
            active: true,
            orgId: null,
          } as AppProfile);
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
      // SECURITY: do NOT auto-attach to the public org. Guests get read-only
      // public catalog access without an orgId. A super_admin must explicitly
      // create a userOrgMembership to grant private access.
      orgId: null,
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
      // SECURITY: do NOT auto-attach to the public org (see registerWithEmail).
      orgId: null,
      active: true,
    });

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
      const byAccessCode = await this.inContext(
        () => getDocs(query(organizationsRef, where('accessCode', '==', candidate)))
      );
      if (!byAccessCode.empty) {
        orgDoc = byAccessCode.docs[0];
        break;
      }

      const byOrgIdField = await this.inContext(
        () => getDocs(query(organizationsRef, where('orgId', '==', candidate)))
      );
      if (!byOrgIdField.empty) {
        orgDoc = byOrgIdField.docs[0];
        break;
      }
    }

    // Legacy fallback: some tenants use the organization document id as login code.
    if (!orgDoc) {
      for (const candidate of candidates) {
        const byDocId = await this.inContext(() => getDoc(doc(this.afs, `organizations/${candidate}`)));
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
    const userSnap = await this.inContext(() => getDoc(userRef));

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
    // SECURITY: never overwrite an existing orgId with null. The orgId field
    // is informational only (last-known org) and authorization happens via
    // userOrgMemberships. We omit orgId from the merge payload when caller
    // does not explicitly provide one, so guest auto-creation never resets a
    // legitimate admin's org assignment.
    const payload: Record<string, unknown> = {
      uid: profile.uid,
      email: profile.email ?? '',
      role: profile.role,
      accessCode: profile.accessCode ?? null,
      orgAccessCode: profile.orgAccessCode ?? null,
      active: profile.active ?? true,
      displayName: profile.displayName ?? '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (profile.orgId) {
      payload['orgId'] = profile.orgId;
    }
    await setDoc(doc(this.afs, `users/${profile.uid}`), payload, { merge: true });
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
        // SECURITY: registration is org-agnostic. orgId is assigned only when
        // a super_admin creates an explicit userOrgMembership.
        orgId: null,
        profileComplete: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  private async reconcileAutoConnectedGuestProfile(_uid: string): Promise<void> {
    // SECURITY: deprecated. Force-resetting a user's orgId to the public org
    // is dangerous (could undo super-admin assignments). Kept as no-op for
    // backward compatibility. Use userOrgMemberships for any org assignment.
    return;
  }
}