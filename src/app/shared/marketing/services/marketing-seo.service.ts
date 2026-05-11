import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface MarketingSeoPayload {
  title: string;
  description: string;
  path?: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  robots?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

@Injectable({ providedIn: 'root' })
export class MarketingSeoService {
  private readonly siteName = 'Innovacare Training';
  private readonly siteOrigin = 'https://www.innovacarereview.com';
  private readonly defaultDescription =
    'Premium NCLEX, nursing, medical and IT learning experiences built for learner confidence, cohort performance and institutional growth.';
  private readonly defaultImage =
    'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png';

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  setPageSeo(payload: MarketingSeoPayload): void {
    const activePath = this.normalizePath(payload.path);
    const isFrench = activePath === '/fr' || activePath.startsWith('/fr/');
    const title = payload.title.includes(this.siteName)
      ? payload.title
      : `${payload.title} | ${this.siteName}`;
    const description = payload.description?.trim() || this.defaultDescription;
    const image = payload.image?.trim() || this.defaultImage;
    const canonicalUrl = this.toAbsoluteUrl(payload.canonicalPath || payload.path);
    const currentUrl = this.toAbsoluteUrl(payload.path);
    const robots = payload.robots || 'index,follow,max-image-preview:large';
    const keywords = (payload.keywords || []).filter(Boolean).join(', ');
    const type = payload.type || 'website';

    this.title.setTitle(title);

    this.updateNameTag('description', description);
    this.updateNameTag('robots', robots);
    this.updateNameTag('twitter:card', 'summary_large_image');
    this.updateNameTag('twitter:title', title);
    this.updateNameTag('twitter:description', description);
    this.updateNameTag('twitter:image', image);

    if (keywords) {
      this.updateNameTag('keywords', keywords);
    } else {
      this.meta.removeTag("name='keywords'");
    }

    this.updatePropertyTag('og:title', title);
    this.updatePropertyTag('og:description', description);
    this.updatePropertyTag('og:type', type);
    this.updatePropertyTag('og:url', currentUrl);
    this.updatePropertyTag('og:image', image);
    this.updatePropertyTag('og:site_name', this.siteName);
    this.updatePropertyTag('og:locale', isFrench ? 'fr_FR' : 'en_US');

    const localeAlternateSelector = "property='og:locale:alternate'";
    if (!this.meta.getTag(localeAlternateSelector)) {
      this.meta.addTag({ property: 'og:locale:alternate', content: isFrench ? 'en_US' : 'fr_FR' });
    } else {
      this.meta.updateTag({ property: 'og:locale:alternate', content: isFrench ? 'en_US' : 'fr_FR' }, localeAlternateSelector);
    }

    this.setCanonical(canonicalUrl);
    this.setAlternateLinks(payload.canonicalPath || payload.path);
    this.setStructuredData(payload.structuredData);
  }

  private updateNameTag(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private updatePropertyTag(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', href);
  }

  private setStructuredData(data?: Record<string, unknown> | Array<Record<string, unknown>>): void {
    this.document.head
      .querySelectorAll('script[data-seo-json-ld="true"]')
      .forEach((node) => node.remove());

    if (!data) {
      return;
    }

    const entries = Array.isArray(data) ? data : [data];

    for (const entry of entries) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-json-ld', 'true');
      script.text = JSON.stringify(entry);
      this.document.head.appendChild(script);
    }
  }

  private setAlternateLinks(path?: string): void {
    const sanitizedPath = this.normalizePath(path);
    const englishPath = this.toEnglishPath(sanitizedPath);
    const frenchPath = this.toFrenchPath(englishPath);

    this.document.head
      .querySelectorAll('link[data-seo-hreflang="true"]')
      .forEach((node) => node.remove());

    const alternates = [
      { hreflang: 'en', href: `${this.siteOrigin}${englishPath}` },
      { hreflang: 'fr', href: `${this.siteOrigin}${frenchPath}` },
      { hreflang: 'x-default', href: `${this.siteOrigin}${englishPath}` },
    ];

    for (const alternate of alternates) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', alternate.hreflang);
      link.setAttribute('href', alternate.href);
      link.setAttribute('data-seo-hreflang', 'true');
      this.document.head.appendChild(link);
    }
  }

  private toAbsoluteUrl(path?: string): string {
    const origin = this.document.location?.origin || this.siteOrigin;
    return new URL(this.normalizePath(path), origin).toString();
  }

  private normalizePath(path?: string): string {
    const normalizedPath = path?.trim() ? path.trim() : this.document.location?.pathname || '/';
    return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  }

  private toEnglishPath(path: string): string {
    if (path === '/fr') {
      return '/home';
    }

    return path.startsWith('/fr/') ? path.slice(3) || '/home' : path;
  }

  private toFrenchPath(path: string): string {
    if (path === '/' || path === '/home') {
      return '/fr/home';
    }

    return path.startsWith('/fr/') ? path : `/fr${path}`;
  }
}