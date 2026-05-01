import { computed, inject, Injectable, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
  collection,
  collectionGroup,
  Firestore,
  getDocs,
  limit,
  query,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService, type AppRole } from '../../core/auth';
import { BLOG_POSTS } from '../marketing/marketing-site.data';

export type SearchResultType = 'course' | 'program' | 'document' | 'live_session' | 'resource' | 'blog';

export interface GlobalSearchFilters {
  type: 'all' | SearchResultType;
  status: string;
  organization: string;
  level: string;
}

export interface GlobalSearchItem {
  id: string;
  type: SearchResultType;
  title: string;
  summary: string;
  status: string;
  level: string;
  organizationId: string;
  organizationLabel: string;
  programId?: string;
  parentProgramTitle?: string;
  keywords: string[];
}

interface SearchHistoryEntry {
  key: string;
  item: GlobalSearchItem;
  usageCount: number;
  lastUsedAt: number;
}

interface SearchFacetOptions {
  organizations: string[];
  statuses: string[];
  levels: string[];
}

interface GlobalBusinessSearchPayload {
  query?: string;
  filters?: GlobalSearchFilters;
  limit?: number;
}

interface GlobalBusinessSearchResponse {
  items?: GlobalSearchItem[];
  options?: SearchFacetOptions;
}

interface SearchScoreItem {
  item: GlobalSearchItem;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  private readonly searchFn = httpsCallable<GlobalBusinessSearchPayload, GlobalBusinessSearchResponse>(
    this.functions,
    'globalBusinessSearch'
  );

  readonly isOpen = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly filters = signal<GlobalSearchFilters>({
    type: 'all',
    status: 'all',
    organization: 'all',
    level: 'all',
  });
  readonly highlightedIndex = signal(0);

  private readonly results = signal<GlobalSearchItem[]>([]);
  private readonly facets = signal<SearchFacetOptions>({
    organizations: [],
    statuses: [],
    levels: [],
  });
  private readonly index = signal<GlobalSearchItem[]>([]);
  private readonly fallbackLoaded = signal(false);
  private readonly history = signal<SearchHistoryEntry[]>(this.loadHistory());

  private requestVersion = 0;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  readonly hasActiveFilters = computed(() => {
    const filters = this.filters();
    return (
      filters.type !== 'all' ||
      filters.status !== 'all' ||
      filters.organization !== 'all' ||
      filters.level !== 'all'
    );
  });
  readonly isPristine = computed(() => !this.normalize(this.query()) && !this.hasActiveFilters());
  readonly filteredResults = computed(() => this.results());
  readonly resultCount = computed(() => this.filteredResults().length);
  readonly organizationOptions = computed(() => this.facets().organizations);
  readonly statusOptions = computed(() => this.facets().statuses);
  readonly levelOptions = computed(() => this.facets().levels);
  readonly recentItems = computed(() =>
    this.history()
      .slice()
      .sort((left, right) => right.lastUsedAt - left.lastUsedAt)
      .slice(0, 5)
      .map((entry) => entry.item)
  );
  readonly frequentItems = computed(() => {
    const recentKeys = new Set(this.recentItems().map((item) => this.historyKey(item)));

    return this.history()
      .slice()
      .sort((left, right) => right.usageCount - left.usageCount || right.lastUsedAt - left.lastUsedAt)
      .filter((entry) => !recentKeys.has(entry.key))
      .slice(0, 5)
      .map((entry) => entry.item);
  });

  open(): void {
    this.isOpen.set(true);
    this.highlightedIndex.set(0);
    if (!this.isPristine()) {
      this.scheduleSearch(0);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }

    this.open();
  }

  setQuery(value: string): void {
    this.query.set(value ?? '');
    this.highlightedIndex.set(0);
    this.scheduleSearch();
  }

  updateFilters(patch: Partial<GlobalSearchFilters>): void {
    this.filters.update((current) => ({ ...current, ...patch }));
    this.highlightedIndex.set(0);
    this.scheduleSearch();
  }

  resetFilters(): void {
    this.filters.set({
      type: 'all',
      status: 'all',
      organization: 'all',
      level: 'all',
    });
    this.highlightedIndex.set(0);
    this.scheduleSearch();
  }

  async refresh(): Promise<void> {
    this.requestVersion += 1;
    this.fallbackLoaded.set(false);
    this.index.set([]);
    await this.runRemoteSearch(true);
  }

  async navigate(item: GlobalSearchItem): Promise<void> {
    const target = this.resolveRoute(item);
    this.registerHistory(item);
    this.close();
    await this.router.navigateByUrl(target);
  }

  typeLabel(type: SearchResultType): string {
    return TYPE_LABELS[type];
  }

  resultMeta(item: GlobalSearchItem): string {
    const parts = [
      this.typeLabel(item.type),
      item.organizationLabel,
      item.level,
      item.status,
      item.parentProgramTitle,
    ].filter(Boolean);

    return parts.join(' / ');
  }

  moveHighlight(step: number): void {
    const items = this.filteredResults();
    if (!items.length) {
      return;
    }

    const current = this.highlightedIndex();
    const next = (current + step + items.length) % items.length;
    this.highlightedIndex.set(next);
  }

  openHighlighted(): boolean {
    const active = this.filteredResults()[this.highlightedIndex()];
    if (active) {
      void this.navigate(active);
      return true;
    }

    const suggestion = this.recentItems()[0] ?? this.frequentItems()[0];
    if (suggestion) {
      void this.navigate(suggestion);
      return true;
    }

    return false;
  }

  private scheduleSearch(delayMs = 220): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    if (!this.isOpen()) {
      return;
    }

    if (this.isPristine()) {
      this.results.set([]);
      this.facets.set({ organizations: [], statuses: [], levels: [] });
      this.error.set(null);
      this.loading.set(false);
      return;
    }

    this.searchDebounce = setTimeout(() => {
      void this.runRemoteSearch();
    }, delayMs);
  }

  private async runRemoteSearch(force = false): Promise<void> {
    if (!force && this.isPristine()) {
      return;
    }

    const requestId = ++this.requestVersion;
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.searchFn({
        query: this.query().trim(),
        filters: this.filters(),
        limit: force && this.isPristine() ? 24 : 48,
      });

      if (requestId !== this.requestVersion) {
        return;
      }

      this.results.set(Array.isArray(response.data?.items) ? response.data.items : []);
      this.facets.set({
        organizations: response.data?.options?.organizations ?? [],
        statuses: response.data?.options?.statuses ?? [],
        levels: response.data?.options?.levels ?? [],
      });
      this.highlightedIndex.set(0);
      this.loading.set(false);
      return;
    } catch {
      if (requestId !== this.requestVersion) {
        return;
      }
    }

    const usedFallback = await this.runLocalFallback();
    if (!usedFallback && requestId === this.requestVersion) {
      this.results.set([]);
      this.facets.set({ organizations: [], statuses: [], levels: [] });
      this.error.set('La recherche distante est indisponible pour le moment.');
      this.loading.set(false);
    }
  }

  private async runLocalFallback(): Promise<boolean> {
    await this.ensureFallbackIndex();

    if (!this.index().length) {
      return false;
    }

    const localItems = this.searchLocalIndex(this.query(), this.filters(), this.isPristine() ? 24 : 48);
    this.results.set(localItems);
    this.facets.set({
      organizations: this.uniqueOptions(localItems, (item) => item.organizationLabel),
      statuses: this.uniqueOptions(localItems, (item) => item.status),
      levels: this.uniqueOptions(localItems, (item) => item.level),
    });
    this.highlightedIndex.set(0);
    this.error.set('Recherche locale de secours activee.');
    this.loading.set(false);
    return true;
  }

  private searchLocalIndex(queryText: string, filters: GlobalSearchFilters, limitCount: number): GlobalSearchItem[] {
    const normalizedQuery = this.normalize(queryText);
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    const matches = this.index()
      .filter((item) => {
        if (filters.type !== 'all' && item.type !== filters.type) {
          return false;
        }

        if (filters.status !== 'all' && item.status !== filters.status) {
          return false;
        }

        if (filters.organization !== 'all' && item.organizationLabel !== filters.organization) {
          return false;
        }

        if (filters.level !== 'all' && item.level !== filters.level) {
          return false;
        }

        if (!tokens.length) {
          return true;
        }

        const haystack = [
          item.title,
          item.summary,
          item.organizationLabel,
          item.level,
          item.status,
          item.parentProgramTitle,
          ...item.keywords,
        ]
          .map((value) => this.normalize(value))
          .join(' ');

        return tokens.every((token) => haystack.includes(token));
      })
      .map((item) => ({ item, score: this.computeScore(item, tokens) }))
      .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title));

    return matches.slice(0, limitCount).map((entry) => entry.item);
  }

  private async ensureFallbackIndex(): Promise<void> {
    if (this.fallbackLoaded()) {
      return;
    }

    try {
      const [orgsSnap, programsSnap, coursesSnap, documentsSnap, sessionsSnap, resourcesSnap, blogsSnap] =
        await Promise.all([
          this.safeGetDocs(() => getDocs(query(collection(this.firestore, 'organizations'), limit(120)))),
          this.safeGetDocs(() => getDocs(query(collection(this.firestore, 'programs'), limit(160)))),
          this.safeGetDocs(() => getDocs(query(collection(this.firestore, 'courses'), limit(160)))),
          this.safeGetDocs(() => getDocs(query(collectionGroup(this.firestore, 'documents'), limit(180)))),
          this.safeGetDocs(() => getDocs(query(collectionGroup(this.firestore, 'liveSessions'), limit(180)))),
          this.safeGetDocs(() => getDocs(query(collectionGroup(this.firestore, 'resources'), limit(180)))),
          this.safeGetDocs(() => getDocs(query(collection(this.firestore, 'marketingPosts'), limit(80)))),
        ]);

      const organizations = new Map<string, string>();
      for (const docSnap of orgsSnap?.docs ?? []) {
        const data = docSnap.data() as Record<string, unknown>;
        const label = this.pickText(data['name'], data['title'], data['displayName'], docSnap.id);
        organizations.set(docSnap.id, label || docSnap.id);
      }

      const programs = new Map<
        string,
        { title: string; orgId: string; orgName: string; level: string; status: string }
      >();
      const results: GlobalSearchItem[] = [];

      for (const docSnap of programsSnap?.docs ?? []) {
        const data = docSnap.data() as Record<string, unknown>;
        const orgId = this.pickText(data['orgId'], data['organizationId'], data['organization']).trim() || '';
        const orgName = this.pickText(
          data['orgName'],
          data['organizationName'],
          organizations.get(orgId),
          'Independent'
        );
        const status = this.normalizeFilterValue(
          this.pickText(data['status'], data['lifecycleStatus'], data['publicationStatus']),
          'Active'
        );
        const level = this.normalizeFilterValue(
          this.pickText(data['level'], data['difficulty'], data['audienceLevel']),
          'All levels'
        );
        const title = this.pickText(data['title'], data['name'], data['programTitle'], 'Untitled program');
        const summary = this.pickText(data['summary'], data['description'], data['overview'], data['subtitle']);

        programs.set(docSnap.id, { title, orgId, orgName, level, status });
        results.push({
          id: docSnap.id,
          type: 'program',
          title,
          summary,
          status,
          level,
          organizationId: orgId,
          organizationLabel: orgName,
          keywords: this.collectKeywords(data, [title, summary, orgName, level, status]),
        });
      }

      for (const docSnap of coursesSnap?.docs ?? []) {
        const data = docSnap.data() as Record<string, unknown>;
        const orgId = this.pickText(data['orgId'], data['organizationId'], data['organization']).trim() || '';
        const orgName = this.pickText(
          data['orgName'],
          data['organizationName'],
          organizations.get(orgId),
          'Independent'
        );
        const status = this.normalizeFilterValue(
          this.pickText(data['status'], data['visibility'], data['publicationStatus']),
          'Active'
        );
        const level = this.normalizeFilterValue(
          this.pickText(data['level'], data['difficulty'], data['courseLevel']),
          'All levels'
        );
        const title = this.pickText(data['title'], data['name'], data['courseTitle'], 'Untitled course');
        const summary = this.pickText(data['summary'], data['description'], data['subtitle'], data['category']);

        results.push({
          id: docSnap.id,
          type: 'course',
          title,
          summary,
          status,
          level,
          organizationId: orgId,
          organizationLabel: orgName,
          keywords: this.collectKeywords(data, [title, summary, orgName, level, status]),
        });
      }

      for (const docSnap of documentsSnap?.docs ?? []) {
        const data = docSnap.data() as Record<string, unknown>;
        const programId = docSnap.ref.parent.parent?.id ?? '';
        const program = programs.get(programId);
        const title = this.pickText(data['title'], data['name'], data['fileName'], 'Document');
        const summary = this.pickText(
          data['description'],
          data['summary'],
          data['instructions'],
          program?.title
        );
        const status = this.normalizeFilterValue(
          this.pickText(data['status'], data['visibility'], data['state']),
          'Available'
        );
        const level = program?.level ?? 'All levels';
        const orgId = program?.orgId ?? '';
        const orgName = program?.orgName || organizations.get(orgId) || 'Independent';

        results.push({
          id: docSnap.id,
          type: 'document',
          title,
          summary,
          status,
          level,
          organizationId: orgId,
          organizationLabel: orgName,
          programId,
          parentProgramTitle: program?.title,
          keywords: this.collectKeywords(data, [title, summary, orgName, level, status, program?.title]),
        });
      }

      for (const docSnap of sessionsSnap?.docs ?? []) {
        const data = docSnap.data() as Record<string, unknown>;
        const programId = docSnap.ref.parent.parent?.id ?? '';
        const program = programs.get(programId);
        const title = this.pickText(data['title'], data['name'], data['sessionTitle'], 'Live session');
        const summary = this.pickText(
          data['description'],
          data['summary'],
          data['instructorName'],
          data['meetingLink']
        );
        const status = this.normalizeFilterValue(
          this.pickText(data['status'], data['sessionStatus']),
          'Scheduled'
        );
        const level = program?.level ?? 'All levels';
        const orgId = program?.orgId ?? '';
        const orgName = program?.orgName || organizations.get(orgId) || 'Independent';

        results.push({
          id: docSnap.id,
          type: 'live_session',
          title,
          summary,
          status,
          level,
          organizationId: orgId,
          organizationLabel: orgName,
          programId,
          parentProgramTitle: program?.title,
          keywords: this.collectKeywords(data, [title, summary, orgName, level, status, program?.title]),
        });
      }

      for (const docSnap of resourcesSnap?.docs ?? []) {
        const data = docSnap.data() as Record<string, unknown>;
        const programId = docSnap.ref.parent.parent?.id ?? '';
        const program = programs.get(programId);
        const title = this.pickText(data['title'], data['name'], data['label'], 'Resource');
        const summary = this.pickText(
          data['description'],
          data['summary'],
          data['resourceType'],
          data['link']
        );
        const status = this.normalizeFilterValue(
          this.pickText(data['status'], data['visibility']),
          'Available'
        );
        const level = program?.level ?? 'All levels';
        const orgId = program?.orgId ?? '';
        const orgName = program?.orgName || organizations.get(orgId) || 'Independent';

        results.push({
          id: docSnap.id,
          type: 'resource',
          title,
          summary,
          status,
          level,
          organizationId: orgId,
          organizationLabel: orgName,
          programId,
          parentProgramTitle: program?.title,
          keywords: this.collectKeywords(data, [title, summary, orgName, level, status, program?.title]),
        });
      }

      const blogResults = new Map<string, GlobalSearchItem>();
      for (const docSnap of blogsSnap?.docs ?? []) {
        const data = docSnap.data() as Record<string, unknown>;
        const blog = this.toBlogSearchItem(docSnap.id, data);
        blogResults.set(blog.id, blog);
      }

      for (const post of BLOG_POSTS) {
        const blog = this.toBlogSearchItem(post.slug, post as unknown as Record<string, unknown>);
        if (!blogResults.has(blog.id)) {
          blogResults.set(blog.id, blog);
        }
      }

      results.push(...blogResults.values());
      this.index.set(results);
      this.fallbackLoaded.set(true);
    } catch {
      this.index.set([]);
    }
  }

  private toBlogSearchItem(id: string, data: Record<string, unknown>): GlobalSearchItem {
    const title = this.pickText(data['title'], data['name'], data['headline'], 'Blog post');
    const summary = this.pickText(data['excerpt'], data['summary'], data['description'], data['content']);
    const status = this.normalizeFilterValue(this.pickText(data['status'], data['visibility']), 'Published');

    return {
      id,
      type: 'blog',
      title,
      summary,
      status,
      level: 'Editorial',
      organizationId: '',
      organizationLabel: 'InnovaCare',
      keywords: this.collectKeywords(data, [title, summary, 'blog', 'InnovaCare', status]),
    };
  }

  private resolveRoute(item: GlobalSearchItem): string {
    switch (item.type) {
      case 'course':
        return `/catalogue/${item.id}`;
      case 'program':
        return `/programs/${item.id}`;
      case 'document':
        return this.contentRoute(item.programId, 'documents', item.id);
      case 'live_session':
        return this.contentRoute(item.programId, 'live-sessions', item.id);
      case 'resource':
        return this.contentRoute(item.programId, 'resources');
      case 'blog':
      default:
        return '/blog';
    }
  }

  private contentRoute(programId?: string, section?: string, entityId?: string): string {
    if (!programId || !section) {
      return '/programs';
    }

    if (this.isAdminContentRole(this.profile()?.role ?? null)) {
      if (entityId && (section === 'documents' || section === 'live-sessions')) {
        return `/program-admin/programs/${programId}/${section}/${entityId}/edit`;
      }

      return `/program-admin/programs/${programId}/${section}`;
    }

    return `/my-programs/${programId}/${section}`;
  }

  private isAdminContentRole(role: AppRole | null): boolean {
    return !!role && ADMIN_ROLES.has(role);
  }

  private registerHistory(item: GlobalSearchItem): void {
    const next = [...this.history()];
    const key = this.historyKey(item);
    const existingIndex = next.findIndex((entry) => entry.key === key);
    const snapshot: SearchHistoryEntry = {
      key,
      item,
      usageCount: existingIndex >= 0 ? next[existingIndex].usageCount + 1 : 1,
      lastUsedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      next.splice(existingIndex, 1, snapshot);
    } else {
      next.push(snapshot);
    }

    const trimmed = next
      .sort((left, right) => right.lastUsedAt - left.lastUsedAt)
      .slice(0, 16);

    this.history.set(trimmed);
    this.persistHistory(trimmed);
  }

  private loadHistory(): SearchHistoryEntry[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((entry) => entry?.key && entry?.item?.id) as SearchHistoryEntry[];
    } catch {
      return [];
    }
  }

  private persistHistory(entries: SearchHistoryEntry[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries));
    } catch {
      return;
    }
  }

  private historyKey(item: GlobalSearchItem): string {
    return `${item.type}:${item.programId || ''}:${item.id}`;
  }

  private uniqueOptions(
    items: GlobalSearchItem[],
    selector: (item: GlobalSearchItem) => string
  ): string[] {
    return [...new Set(items.map(selector).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right)
    );
  }

  private async safeGetDocs<T>(factory: () => Promise<T>): Promise<T | null> {
    try {
      return await factory();
    } catch {
      return null;
    }
  }

  private computeScore(item: GlobalSearchItem, tokens: string[]): number {
    if (!tokens.length) {
      return 1;
    }

    const title = this.normalize(item.title);
    const summary = this.normalize(item.summary);
    const keywords = item.keywords.map((keyword) => this.normalize(keyword));

    return tokens.reduce((score, token) => {
      if (title.startsWith(token)) {
        return score + 120;
      }

      if (title.includes(token)) {
        return score + 80;
      }

      if (summary.includes(token)) {
        return score + 30;
      }

      if (keywords.some((keyword) => keyword.includes(token))) {
        return score + 18;
      }

      return score;
    }, 0);
  }

  private collectKeywords(data: Record<string, unknown>, extras: Array<string | undefined>): string[] {
    const raw = [
      ...extras,
      this.pickText(data['category'], data['audience'], data['track'], data['type']),
      ...(Array.isArray(data['tags']) ? data['tags'].map((entry) => String(entry)) : []),
      ...(Array.isArray(data['topics']) ? data['topics'].map((entry) => String(entry)) : []),
    ];

    return raw.filter(Boolean) as string[];
  }

  private pickText(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private normalizeFilterValue(value: string, fallback: string): string {
    const candidate = value || fallback;
    return candidate
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  private normalize(value: string | undefined | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}

const SEARCH_HISTORY_KEY = 'innovacare.globalSearch.history';

const TYPE_LABELS: Record<SearchResultType, string> = {
  course: 'Course',
  program: 'Program',
  document: 'Document',
  live_session: 'Live session',
  resource: 'Resource',
  blog: 'Blog',
};

const ADMIN_ROLES = new Set<AppRole>([
  'super_admin',
  'admin',
  'manager',
  'instructor',
  'programAdmin',
  'programStaff',
]);