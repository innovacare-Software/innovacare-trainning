import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { Firestore } from '@angular/fire/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { CheckoutService } from './checkout.service';

const LOCAL_CART_KEY = 'guest-local-cart-v1';

type LocalCartItem = {
  offerId: string;
  courseId?: string;
  orgId?: string;
  titleSnapshot?: string;
  imageSnapshot?: string;
  priceSnapshot?: number;
  currencySnapshot?: string;
  qty?: number;
};

type OfferSnapshotInput = {
  courseId?: string;
  orgId?: string;
  titleSnapshot?: string;
  imageSnapshot?: string;
  priceSnapshot?: number;
  currencySnapshot?: string;
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private auth = inject(Auth);
  private functions = inject(Functions);
  private fs = inject(Firestore);
  private checkout = inject(CheckoutService);
  private injector = inject(Injector);
  private serverCartEnabled = true;

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  constructor() {
    this.inContext(() => authState(this.auth)).subscribe((user) => {
      if (!user) return;
      void this.mergeLocalToServer('default').catch(() => {});
    });
  }

  private isAuthCallableError(error: unknown): boolean {
    const code = String((error as { code?: string } | null)?.code || '').toLowerCase();
    const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
    return (
      code.includes('unauthenticated') ||
      code.includes('permission-denied') ||
      code.includes('functions/unauthenticated') ||
      code.includes('functions/permission-denied') ||
      message.includes('functions/unauthenticated') ||
      message.includes('functions/permission-denied') ||
      code.includes('permission-denied') ||
      message.includes('unauthenticated') ||
      message.includes('permission denied') ||
      message.includes('403')
    );
  }

  private getLocalItems(): LocalCartItem[] {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<string | LocalCartItem>;
      if (!Array.isArray(parsed)) return [];

      const normalized = parsed
        .map((item) => {
          if (typeof item === 'string') {
            const offerId = item.trim();
            return offerId ? ({ offerId, qty: 1 } as LocalCartItem) : null;
          }

          const offerId = String(item?.offerId || '').trim();
          if (!offerId) return null;

          return {
            offerId,
            courseId: item.courseId ? String(item.courseId) : undefined,
            orgId: item.orgId ? String(item.orgId) : undefined,
            titleSnapshot: item.titleSnapshot ? String(item.titleSnapshot) : undefined,
            imageSnapshot: item.imageSnapshot ? String(item.imageSnapshot) : undefined,
            priceSnapshot: Number.isFinite(Number(item.priceSnapshot)) ? Number(item.priceSnapshot) : undefined,
            currencySnapshot: item.currencySnapshot ? String(item.currencySnapshot) : undefined,
            qty: Math.max(1, Number(item.qty || 1)),
          } as LocalCartItem;
        })
        .filter((x): x is LocalCartItem => !!x);

      return normalized;
    } catch {
      return [];
    }
  }

  private async getLocalItemsHydrated(): Promise<LocalCartItem[]> {
    const items = this.getLocalItems();
    const hydrated = await Promise.all(
      items.map(async (item) => {
        if (item.titleSnapshot && item.priceSnapshot != null && item.currencySnapshot) {
          return item;
        }
        const snapshot = await this.resolveOfferSnapshot(item.offerId);
        return { ...item, ...snapshot };
      })
    );
    return hydrated;
  }

  private async buildLocalCartResponse(cartId = 'default'): Promise<{
    cartId: string;
    items: Array<{
      offerId: string;
      title: string;
      itemType: 'course' | 'program' | 'live_class';
      itemId: string;
      qty: number;
      amount: number;
      currency: string;
      imageUrl?: string;
    }>;
    amountTotal: number;
    currency: string;
    itemCount: number;
    distinctCount: number;
  }> {
    const localItems = await this.getLocalItemsHydrated();
    const mapped = localItems.map((item) => {
      const qty = Math.max(1, Number(item.qty || 1));
      const amount = Math.max(0, Number(item.priceSnapshot || 0));
      return {
        offerId: item.offerId,
        title: item.titleSnapshot || 'Course',
        itemType: 'course' as const,
        itemId: item.courseId || item.offerId,
        qty,
        amount,
        currency: String(item.currencySnapshot || 'USD').toUpperCase(),
        imageUrl: item.imageSnapshot,
      };
    });

    const amountTotal = mapped.reduce((sum, x) => sum + x.amount * x.qty, 0);
    const itemCount = mapped.reduce((sum, x) => sum + x.qty, 0);
    const currency = mapped[0]?.currency || 'USD';

    return {
      cartId,
      items: mapped,
      amountTotal,
      currency,
      itemCount,
      distinctCount: mapped.length,
    };
  }

  getLocalOfferIds(): string[] {
    return this.getLocalItems().map((x) => x.offerId);
  }

  private saveLocalItems(items: LocalCartItem[]): void {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  }

  private async resolveOfferSnapshot(offerId: string): Promise<Partial<LocalCartItem>> {
    try {
      const snap = await getDoc(doc(this.fs, `publicOffers/${offerId}`));
      if (!snap.exists()) return {};

      const offer = snap.data() as {
        courseId?: string;
        orgId?: string;
        title?: string;
        imageUrl?: string;
        price?: number;
        currency?: string;
      };

      return {
        courseId: offer.courseId,
        orgId: offer.orgId,
        titleSnapshot: offer.title,
        imageSnapshot: offer.imageUrl,
        priceSnapshot: Number(offer.price || 0),
        currencySnapshot: String(offer.currency || 'USD').toUpperCase(),
      };
    } catch {
      return {};
    }
  }

  private async resolveCourseSnapshot(courseId: string): Promise<{ title?: string; imageUrl?: string }> {
    const clean = String(courseId || '').trim();
    if (!clean) return {};

    try {
      const snap = await getDoc(doc(this.fs, `courses/${clean}`));
      if (!snap.exists()) return {};

      const course = snap.data() as { title?: string; imageUrl?: string };
      return {
        title: course.title,
        imageUrl: course.imageUrl,
      };
    } catch {
      return {};
    }
  }

  private async hydrateCartItems<T extends {
    offerId: string;
    title: string;
    itemId: string;
    imageUrl?: string;
  }>(items: T[]): Promise<T[]> {
    return Promise.all(
      items.map(async (item) => {
        const needsTitle = !String(item.title || '').trim();
        const needsImage = !String(item.imageUrl || '').trim();
        if (!needsTitle && !needsImage) return item;

        const offer = await this.resolveOfferSnapshot(item.offerId);
        const course = await this.resolveCourseSnapshot(item.itemId);

        const title = String(item.title || offer.titleSnapshot || course.title || '').trim();
        const imageUrl = String(item.imageUrl || offer.imageSnapshot || course.imageUrl || '').trim();

        return {
          ...item,
          title: title || `Cours ${item.itemId}`,
          imageUrl: imageUrl || undefined,
        };
      })
    );
  }

  async addToLocal(offerId: string, seed?: OfferSnapshotInput): Promise<void> {
    const clean = String(offerId || '').trim();
    if (!clean) return;

    const items = this.getLocalItems();
    const existingIndex = items.findIndex((x) => x.offerId === clean);
    const snapshot = await this.resolveOfferSnapshot(clean);
    const mergedSnapshot: Partial<LocalCartItem> = {
      ...seed,
      ...snapshot,
    };

    if (existingIndex >= 0) {
      const current = items[existingIndex];
      items[existingIndex] = {
        ...current,
        ...mergedSnapshot,
        qty: Math.min(5, Number(current.qty || 1) + 1),
      };
    } else {
      items.push({
        offerId: clean,
        qty: 1,
        ...mergedSnapshot,
      });
    }

    this.saveLocalItems(items);
  }

  clearLocal(): void {
    localStorage.removeItem(LOCAL_CART_KEY);
  }

  async addOffer(offerId: string, cartId = 'default', seed?: OfferSnapshotInput): Promise<void> {
    const clean = String(offerId || '').trim();
    if (!clean) return;

    if (!this.auth.currentUser?.uid) {
      throw new Error('AUTH_REQUIRED');
    }

    await this.addToLocal(clean, seed);

    await this.mergeLocalToServer(cartId);
  }

  async mergeLocalToServer(cartId = 'default'): Promise<void> {
    if (!this.serverCartEnabled) return;
    if (!this.auth.currentUser?.uid) return;

    const offerIds = this.getLocalOfferIds();
    if (!offerIds.length) return;

    try {
      const fn = httpsCallable<
        { cartId?: string; offerIds: string[] },
        { cartId: string; itemCount: number; distinctCount: number }
      >(this.functions, 'mergeLocalCart');
      await fn({ cartId, offerIds });

      this.clearLocal();
    } catch (error) {
      if (this.isAuthCallableError(error)) {
        // Disable server callable calls for this session if auth is rejected by Functions project.
        this.serverCartEnabled = false;
        return;
      }
      throw error;
    }
  }

  async upsertServerCart(cartId = 'default'): Promise<void> {
    if (!this.serverCartEnabled) return;
    if (!this.auth.currentUser?.uid) return;

    const items = this.getLocalItems().map((x) => ({ offerId: x.offerId, qty: Math.max(1, Number(x.qty || 1)) }));
    if (!items.length) return;

    try {
      const fn = httpsCallable<
        { cartId?: string; items: Array<{ offerId: string; qty?: number }> },
        { cartId: string; itemCount: number; distinctCount: number }
      >(this.functions, 'upsertMyCart');
      await fn({ cartId, items });
      this.clearLocal();
    } catch (error) {
      if (this.isAuthCallableError(error)) {
        this.serverCartEnabled = false;
        return;
      }
      throw error;
    }
  }

  async getMyCart(cartId = 'default'): Promise<{
    cartId: string;
    items: Array<{
      offerId: string;
      title: string;
      itemType: 'course' | 'program' | 'live_class';
      itemId: string;
      qty: number;
      amount: number;
      currency: string;
      imageUrl?: string;
    }>;
    amountTotal: number;
    currency: string;
    itemCount: number;
    distinctCount: number;
  }> {
    if (!this.auth.currentUser?.uid) {
      return this.buildLocalCartResponse(cartId);
    }

    if (!this.serverCartEnabled) {
      return this.buildLocalCartResponse(cartId);
    }

    try {
      const fn = httpsCallable<
        { cartId?: string },
        {
          cartId: string;
          items: Array<{
            offerId: string;
            title: string;
            itemType: 'course' | 'program' | 'live_class';
            itemId: string;
            qty: number;
            amount: number;
            currency: string;
            imageUrl?: string;
          }>;
          amountTotal: number;
          currency: string;
          itemCount: number;
          distinctCount: number;
        }
      >(this.functions, 'getMyCart');

      const result = await fn({ cartId });
      const raw = result.data;

      const hydratedItems = await this.hydrateCartItems(raw.items);
      return {
        ...raw,
        items: hydratedItems,
      };
    } catch (error) {
      if (this.isAuthCallableError(error)) {
        this.serverCartEnabled = false;
        return this.buildLocalCartResponse(cartId);
      }
      throw error;
    }
  }

  async removeOffer(offerId: string, cartId = 'default'): Promise<void> {
    const clean = String(offerId || '').trim();
    if (!clean) return;

    if (!this.auth.currentUser?.uid) {
      const items = this.getLocalItems().filter((x) => x.offerId !== clean);
      this.saveLocalItems(items);
      return;
    }

    if (this.serverCartEnabled) {
      try {
        const cart = await this.getMyCart(cartId);
        const remainingItems = cart.items
          .filter((x) => x.offerId !== clean)
          .map((x) => ({ offerId: x.offerId, qty: x.qty }));

        const fn = httpsCallable<
          { cartId?: string; items: Array<{ offerId: string; qty?: number }> },
          { cartId: string; itemCount: number; distinctCount: number }
        >(this.functions, 'upsertMyCart');
        await fn({ cartId, items: remainingItems });
        this.clearLocal();
      } catch (error) {
        if (this.isAuthCallableError(error)) {
          this.serverCartEnabled = false;
          const items = this.getLocalItems().filter((x) => x.offerId !== clean);
          this.saveLocalItems(items);
          return;
        }
        throw error;
      }
    } else {
      const items = this.getLocalItems().filter((x) => x.offerId !== clean);
      this.saveLocalItems(items);
    }
  }

  async checkoutFromCart(cartId = 'default'): Promise<string | null> {
    if (!this.auth.currentUser?.uid) {
      throw new Error('AUTH_REQUIRED');
    }

    await this.mergeLocalToServer(cartId);

    const origin = window.location.origin;
    const res = await this.checkout.createCheckoutSession({
      cartId,
      successUrl: `${origin}/checkout/success`,
      cancelUrl: `${origin}/checkout/cancel`,
    });

    return res?.url ?? null;
  }
}