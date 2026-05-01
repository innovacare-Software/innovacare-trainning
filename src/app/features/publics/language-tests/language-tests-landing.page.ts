import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramsService } from '../programs/programs.service';
import { Program } from '../programs/program.models';

type TestKey = 'ielts' | 'tef' | 'oet';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

@Component({
  selector: 'app-language-tests-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './language-tests-landing.page.html',
  styleUrls: ['./language-tests-landing.page.css'],
})
export class LanguageTestsLandingPage implements AfterViewInit, OnDestroy {
  private readonly programsService = inject(ProgramsService);

  readonly activeTab = signal<TestKey>('ielts');
  readonly openFaq = signal<Set<string>>(new Set());

  private observer?: IntersectionObserver;

  private readonly publishedPrograms = toSignal(this.programsService.getPublishedPrograms(), {
    initialValue: [] as Program[],
  });

  readonly programIndex = computed(() => {
    const programs = this.publishedPrograms();
    const byTest: Record<TestKey, Program | null> = {
      ielts: null,
      tef: null,
      oet: null,
    };

    const score = (program: Program, key: TestKey): number => {
      const haystack = [
        String(program.title || ''),
        String(program.subtitle || ''),
        String(program.slug || ''),
        ...(Array.isArray(program.tags) ? program.tags.map((tag) => String(tag || '')) : []),
      ]
        .join(' ')
        .toLowerCase();

      if (key === 'ielts') return haystack.includes('ielts') ? 2 : 0;
      if (key === 'tef') return haystack.includes('tef') || haystack.includes('fran') ? 2 : 0;
      return haystack.includes('oet') || haystack.includes('occupational english') ? 2 : 0;
    };

    for (const key of ['ielts', 'tef', 'oet'] as TestKey[]) {
      const found = programs
        .map((program) => ({ program, points: score(program, key) }))
        .filter((entry) => entry.points > 0)
        .sort((a, b) => b.points - a.points)[0];

      byTest[key] = found?.program || null;
    }

    return byTest;
  });

  readonly stats = [
    { value: '85%', label: 'de nos apprenants atteignent le score visé du premier coup' },
    { value: '8', label: 'apprenants maximum par groupe en programme Complet' },
    { value: '12', label: 'semaines pour transformer un score en visa' },
    { value: '3', label: 'tests pris en charge avec spécialistes dédiés' },
  ];

  readonly faq: FaqItem[] = [
    {
      id: 'faq-1',
      question: 'Combien de temps me faut-il pour atteindre mon score visé ?',
      answer:
        'Cela dépend de votre niveau de départ et du score visé. Notre programme Complet de 12 semaines convient à 80 % des candidats.',
    },
    {
      id: 'faq-2',
      question: 'Comment fonctionne la garantie de score ?',
      answer:
        'Si, après avoir suivi le programme Complet et respecté les conditions pédagogiques, vous n’atteignez pas le score visé, un module de renforcement est offert.',
    },
    {
      id: 'faq-3',
      question: 'Les cours sont-ils en présentiel ou en ligne ?',
      answer:
        'Les deux. Format hybride avec accès présentiel, virtuel synchrone et plateforme d’exercices en continu.',
    },
    {
      id: 'faq-4',
      question: 'Puis-je payer via CinetPay ?',
      answer:
        'Oui. Depuis la fiche programme, cliquez sur inscription puis choisissez CinetPay dans les méthodes de paiement.',
    },
  ];

  setTab(tab: TestKey): void {
    this.activeTab.set(tab);
  }

  toggleFaq(itemId: string): void {
    const next = new Set(this.openFaq());
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    this.openFaq.set(next);
  }

  isFaqOpen(itemId: string): boolean {
    return this.openFaq().has(itemId);
  }

  programDetailLink(test: TestKey): string[] {
    const program = this.programIndex()[test];
    return program?.id ? ['/programs', program.id] : ['/programs'];
  }

  programEnrollLink(test: TestKey): string[] {
    const program = this.programIndex()[test];
    return program?.id ? ['/programs', program.id, 'enroll'] : ['/programs'];
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    queueMicrotask(() => {
      const targets = document.querySelectorAll('.reveal');
      targets.forEach((element) => this.observer?.observe(element));
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
