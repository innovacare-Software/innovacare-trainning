import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, limit, orderBy, query, where } from '@angular/fire/firestore';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { BLOG_POST_DETAILS, BLOG_POSTS, MarketingBlogPost, MarketingBlogPostDetail } from '../marketing-site.data';

const FRENCH_BLOG_META: Record<string, { title: string; excerpt: string; category: string }> = {
  'nclex-study-plan-8-weeks': {
    title: 'Construire un plan d’étude NCLEX sur 8 semaines qui tient vraiment',
    excerpt: 'Un planning de préparation fondé sur le diagnostic, la répétition espacée et des blocs de simulation ciblés.',
    category: 'NCLEX',
  },
  'why-social-learning-works': {
    title: 'Pourquoi l’apprentissage social améliore la rétention pour les examens à fort enjeu',
    excerpt: 'La responsabilité entre pairs, les séries et les discussions guidées soutiennent la régularité mieux que la révision passive.',
    category: 'Méthodologie',
  },
  'from-exam-to-employment': {
    title: 'De la préparation à l’emploi : concevoir une transition infirmière plus fluide',
    excerpt: 'Les meilleures plateformes NCLEX soutiennent aussi la confiance, l’onboarding et la progression de carrière.',
    category: 'Carrière',
  },
  'cohort-analytics-for-educators': {
    title: 'Ce que les formateurs doivent suivre avant qu’une cohorte ne décroche',
    excerpt: 'Un cadre analytique simple pour repérer le désengagement, les écarts de remédiation et les ressources sous-utilisées.',
    category: 'Éducation',
  },
  'nclex-test-day-prep': {
    title: 'Checklist de préparation NCLEX pour aborder le jour J avec confiance',
    excerpt: 'Un guide tactique pour les 72 dernières heures avant l’examen, avec rythme et gestion de la charge mentale.',
    category: 'NCLEX',
  },
  'institutional-buying-guide': {
    title: 'Guide d’achat pratique pour les écoles qui évaluent des plateformes NCLEX',
    excerpt: 'Les critères à examiner sur le reporting multi-tenant, l’onboarding apprenant et la conversion du site vers le LMS.',
    category: 'Éducation',
  },
};

const FRENCH_BLOG_DETAILS: Record<string, Partial<MarketingBlogPostDetail>> = {
  'nclex-study-plan-8-weeks': {
    intro: 'Huit semaines suffisent pour faire progresser les performances tout en gardant un vrai sentiment d’urgence. Le plan ne fonctionne que si diagnostic, répétition et récupération sont pensés comme un seul système.',
    authorRole: 'Stratège contenu NCLEX',
    tags: ['NCLEX-RN', 'Plan d’étude', 'Préparation'],
    quote: 'La régularité n’est pas un problème de motivation. C’est un problème de séquençage.',
    ctaTitle: 'Transformez ce plan en parcours d’apprentissage personnalisé',
    ctaBody: 'Utilisez le quiz Innovacare pour associer votre fenêtre d’étude, votre niveau de confiance et votre besoin d’accompagnement à la bonne offre.',
    sections: [
      {
        title: 'Commencer par un diagnostic, pas par le volume',
        paragraphs: [
          'La première semaine doit révéler les fragilités du candidat, pas mesurer sa capacité à enchaîner les heures. Un diagnostic léger établit une base sur la gestion des soins, la pharmacologie, la priorisation et l’endurance.',
          'Une fois cette base posée, le calendrier d’étude peut répartir le temps selon les faiblesses réelles et non les habitudes. C’est la différence entre activité et progression.',
        ],
      },
      {
        title: 'Construire la répétition dans chaque semaine',
        paragraphs: [
          'Les bons plans alternent rappel actif, revue des rationales et séries chronométrées. On retient mieux quand le contenu revient avec pression et espacement.',
          'C’est pour cela qu’Innovacare place analytique et remédiation côte à côte. L’apprenant doit voir ce qui a posé problème et quand y revenir.',
        ],
      },
      {
        title: 'Réserver la dernière ligne droite aux conditions d’examen',
        paragraphs: [
          'Les semaines sept et huit doivent ressembler de plus en plus au jour J. Blocs complets, travail du rythme et gestion de l’énergie comptent autant que le rappel des notions.',
          'Durant les 72 dernières heures, l’objectif est la stabilité. Pas de nouvelle stratégie, pas de zapping entre ressources, pas de sur-réaction de panique.',
        ],
      },
    ],
  },
  'why-social-learning-works': {
    intro: 'La préparation à fort enjeu devient vite solitaire. L’apprentissage social fonctionne parce qu’il transforme l’intention en dynamique visible.',
    authorRole: 'Responsable expérience d’apprentissage',
    tags: ['Méthodologie', 'Communauté', 'Rétention'],
    quote: 'Quand la progression devient visible au sein d’un groupe, la régularité cesse de sembler optionnelle.',
    ctaTitle: 'Ajouter de la responsabilité dans le parcours d’étude',
    ctaBody: 'Associez l’autoformation à des boucles sociales, des checkpoints en direct et des relances de coach pour conserver l’élan.',
    sections: [
      {
        title: 'La visibilité augmente le passage à l’action',
        paragraphs: [
          'Un apprenant isolé peut sauter une journée sans conséquence apparente. Dans une boucle de progression visible, le coût du relâchement apparaît immédiatement.',
          'C’est pourquoi les séries, les salles de cohorte et les rappels améliorent la rétention au-delà de la simple gamification.',
        ],
      },
      {
        title: 'La discussion approfondit le rappel',
        paragraphs: [
          'Expliquer une rationale à quelqu’un d’autre est l’un des moyens les plus rapides de détecter une compréhension superficielle. Les échanges entre pairs exposent plus tôt les lacunes.',
          'Pour la préparation d’examen, cela réduit les faux positifs sur le niveau réel de préparation.',
        ],
      },
      {
        title: 'La communauté réduit la chute émotionnelle',
        paragraphs: [
          'Le burn-out ressemble souvent à un problème de contenu alors qu’il s’agit d’un problème d’isolement. Les apprenants tiennent plus longtemps quand le soutien est ambiant plutôt qu’exceptionnel.',
          'Une plateforme premium doit donc concevoir la connexion, pas seulement la diffusion du contenu.',
        ],
      },
    ],
  },
  'from-exam-to-employment': {
    intro: 'La transition entre préparation à l’examen et insertion professionnelle est souvent l’endroit où les marques éducatives perdent la confiance gagnée. Les apprenants ont besoin d’un pont, pas d’un vide après la réussite.',
    authorRole: 'Éditrice parcours carrière',
    tags: ['Carrière', 'Soins infirmiers', 'Transition'],
    quote: 'Un apprenant qui réussit a encore besoin d’orientation, de confiance et de cap. Le produit doit continuer à aider.',
    ctaTitle: 'Concevoir aussi l’expérience après l’examen',
    ctaBody: 'Utilisez le contenu public, l’onboarding et les tableaux de bord apprenants pour prolonger la confiance après le test.',
    sections: [
      {
        title: 'La confiance doit continuer après l’examen',
        paragraphs: [
          'La réussite n’efface pas l’incertitude. Les nouvelles infirmières ont encore besoin de repères sur leur niveau de préparation, leurs habitudes documentaires et leur confiance dans le premier poste.',
          'Les plateformes qui l’assument construisent une marque plus forte et des boucles de recommandation plus durables.',
        ],
      },
      {
        title: 'Le contenu peut soutenir l’onboarding',
        paragraphs: [
          'Articles, checklists légères et modules de transition sont des actifs simples à activer pour que l’apprenant se sente guidé plutôt que laissé seul.',
          'C’est particulièrement utile pour les institutions qui veulent une continuité entre préparation d’examen et readiness terrain.',
        ],
      },
      {
        title: 'Le message emploi améliore la conversion plus tôt',
        paragraphs: [
          'Les prospects achètent avec l’avenir en tête. Quand l’offre présente la réussite à l’examen comme une étape d’un parcours professionnel plus large, l’intention devient plus facile à justifier.',
          'Ce message fonctionne autant sur les pages B2C que dans un discours commercial institutionnel.',
        ],
      },
    ],
  },
  'cohort-analytics-for-educators': {
    intro: 'Les cohortes ne décrochent presque jamais d’un coup. Les premiers signaux sont discrets. Les équipes pédagogiques ont besoin d’indicateurs avancés plus propres avant que la performance ne s’effondre.',
    authorRole: 'Conseillère en analytique éducative',
    tags: ['Éducation', 'Analytique', 'Cohortes'],
    quote: 'Le tableau de bord le plus utile est celui qui signale la dérive avant que la remédiation ne devienne coûteuse.',
    ctaTitle: 'Rendre la visibilité cohorte réellement opérationnelle',
    ctaBody: 'Utilisez les workflows institutionnels et les analytics apprenants pour intervenir plus tôt et protéger la dynamique de complétion.',
    sections: [
      {
        title: 'Surveiller l’engagement avant les notes',
        paragraphs: [
          'Connexions, démarrages d’assignments, retard sur les quiz et baisse de participation révèlent souvent les problèmes avant les résultats notés.',
          'Les équipes qui attendent les faibles scores réagissent généralement trop tard.',
        ],
      },
      {
        title: 'Comparer l’adoption de la remédiation',
        paragraphs: [
          'Les apprenants en difficulté qui n’ouvrent jamais les ressources de remédiation sont souvent le segment le plus à risque. Ce signal vaut plus que le simple volume de questions répondues.',
          'Le produit doit montrer simultanément sous-performance et sous-engagement.',
        ],
      },
      {
        title: 'Relier l’analytique à une action',
        paragraphs: [
          'Les tableaux de bord n’ont de valeur que s’ils déclenchent un outreach, un coaching ou une intervention de groupe. La meilleure couche analytique réduit la distance entre signal et réponse.',
          'C’est ce que les institutions achètent réellement lorsqu’elles demandent du reporting.',
        ],
      },
    ],
  },
  'nclex-test-day-prep': {
    intro: 'Les trois derniers jours avant le NCLEX doivent réduire le bruit, pas l’augmenter. Une checklist ciblée aide à préserver la confiance sous pression.',
    authorRole: 'Coach readiness',
    tags: ['NCLEX', 'Checklist', 'Jour J'],
    quote: 'Le calme du jour d’examen se gagne généralement la semaine précédente, pas la veille au soir.',
    ctaTitle: 'Préparer avec plus de structure et moins de panique',
    ctaBody: 'Utilisez des plans d’étude guidés et des checkpoints de readiness pour arriver au jour J en contrôle.',
    sections: [
      {
        title: 'Simplifier les entrées',
        paragraphs: [
          'La dernière ligne droite doit réduire les ressources, pas les multiplier. Les apprenants réussissent mieux quand le plan est clair et la charge décisionnelle faible.',
          'Cela signifie une source de révision, un modèle de pacing et un rythme de récupération cohérent.',
        ],
      },
      {
        title: 'Répéter la logistique',
        paragraphs: [
          'Sommeil, repas, trajet et préparation du centre d’examen doivent être réglés tôt. L’incertitude pratique consomme une énergie cognitive qui devrait rester disponible pour l’épreuve.',
          'Une bonne checklist traite donc la logistique comme un facteur de performance.',
        ],
      },
      {
        title: 'Protéger la bande passante mentale',
        paragraphs: [
          'L’objectif n’est pas de se sentir parfait. L’objectif est d’entrer au test de manière stable. Les apprenants ont besoin de permission pour arrêter de bachoter et faire confiance au processus déjà construit.',
          'Cette confiance est plus simple à créer quand la plateforme a bien rythmé les semaines précédentes.',
        ],
      },
    ],
  },
  'institutional-buying-guide': {
    intro: 'Les écoles qui évaluent des plateformes de préparation comparent souvent d’abord le prix, alors que c’est l’adéquation opérationnelle qui détermine réellement l’adoption. Le guide d’achat doit rendre cette réalité visible tôt.',
    authorRole: 'Responsable partenariats institutionnels',
    tags: ['Éducation', 'Guide d’achat', 'Institutions'],
    quote: 'Les institutions n’achètent pas seulement du contenu. Elles achètent l’activation, la visibilité et moins de zones de support fragiles.',
    ctaTitle: 'Construire une offre institutionnelle qui atterrit proprement',
    ctaBody: 'Utilisez le flux contact pour aligner taille de cohorte, onboarding et attentes de reporting avec le bon plan.',
    sections: [
      {
        title: 'Évaluer les frictions d’onboarding',
        paragraphs: [
          'Une plateforme peut sembler excellente en démo et pourtant échouer au déploiement si le provisioning apprenant, l’orientation et le triage support sont faibles.',
          'Les décideurs doivent donc examiner les 30 premiers jours, pas seulement la grille de fonctionnalités.',
        ],
      },
      {
        title: 'Exiger un reporting actionnable',
        paragraphs: [
          'Des exports statiques suffisent rarement. Les institutions ont besoin de rapports qui révèlent le risque, l’engagement et l’adoption de la remédiation assez tôt pour agir.',
          'C’est la différence entre reporting et véritable support opérationnel.',
        ],
      },
      {
        title: 'Vérifier la transition site web vers LMS',
        paragraphs: [
          'Confiance publique, capture de leads et activation apprenante sont souvent disjointes. Les meilleurs systèmes gardent cette transition propre entre landing page et espace inscrit.',
          'Cela a un impact direct sur la conversion et sur la perception de maturité du produit.',
        ],
      },
    ],
  },
};

interface MarketingBlogDoc {
  slug?: string;
  category?: MarketingBlogPost['category'];
  title?: string;
  excerpt?: string;
  readTime?: string;
  publishedAt?: string;
  featured?: boolean;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MarketingContentService {
  private readonly firestore = inject(Firestore);
  private readonly transloco = inject(TranslocoService);

  getBlogPosts(): Observable<MarketingBlogPost[]> {
    return this.transloco.langChanges$.pipe(
      map(() => this.currentLang()),
      switchMap(() => {
        try {
          const ref = collection(this.firestore, 'marketingPosts');
          const postsQuery = query(ref, where('active', '==', true), orderBy('publishedAt', 'desc'), limit(24));
          return from(getDocs(postsQuery)).pipe(
            map((snapshot) => {
              const rows = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .map((doc) => this.toBlogPost(doc as MarketingBlogDoc))
                .filter((post): post is MarketingBlogPost => !!post);
              return rows.length ? rows : this.localizePosts(BLOG_POSTS);
            }),
            catchError(() => of(this.localizePosts(BLOG_POSTS))),
          );
        } catch {
          return of(this.localizePosts(BLOG_POSTS));
        }
      })
    );
  }

  getBlogPostBySlug(slug: string): Observable<MarketingBlogPostDetail | null> {
    return this.getBlogPosts().pipe(
      map((posts) => {
        const post = posts.find((item) => item.slug === slug);
        if (!post) {
          return null;
        }

        const detail = BLOG_POST_DETAILS.find((item) => item.slug === slug);
        if (detail) {
          return this.localizeDetail({
            ...detail,
            ...post,
            heroImageUrl: detail.heroImageUrl || post.imageUrl || BLOG_POSTS[0].imageUrl || '',
          });
        }

        return this.localizeDetail({
          ...post,
          heroImageUrl: post.imageUrl || BLOG_POSTS[0].imageUrl || '',
          author: 'Innovacare Editorial Team',
          authorRole: 'Content Team',
          intro: post.excerpt,
          tags: [post.category, 'Innovacare'],
          sections: [
            {
              title: 'Overview',
              paragraphs: [post.excerpt],
            },
          ],
          quote: post.excerpt,
          ctaTitle: 'Explore the next step',
          ctaBody: 'Use the public catalogue or contact flow to continue the learner journey.',
        });
      })
    );
  }

  private currentLang(): 'en' | 'fr' {
    return this.transloco.getActiveLang().startsWith('fr') ? 'fr' : 'en';
  }

  private localizePosts(posts: MarketingBlogPost[]): MarketingBlogPost[] {
    if (this.currentLang() !== 'fr') {
      return posts;
    }

    return posts.map((post) => {
      const meta = FRENCH_BLOG_META[post.slug];
      if (!meta) {
        return post;
      }

      return {
        ...post,
        title: meta.title,
        excerpt: meta.excerpt,
        category: (meta.category === 'Méthodologie' || meta.category === 'Éducation' ? post.category : post.category),
      };
    });
  }

  private localizeDetail(detail: MarketingBlogPostDetail): MarketingBlogPostDetail {
    if (this.currentLang() !== 'fr') {
      return detail;
    }

    const meta = FRENCH_BLOG_META[detail.slug];
    const override = FRENCH_BLOG_DETAILS[detail.slug];

    return {
      ...detail,
      title: meta?.title ?? detail.title,
      excerpt: meta?.excerpt ?? detail.excerpt,
      category: detail.category,
      intro: override?.intro ?? detail.intro,
      authorRole: override?.authorRole ?? detail.authorRole,
      tags: override?.tags ?? detail.tags,
      quote: override?.quote ?? detail.quote,
      ctaTitle: override?.ctaTitle ?? detail.ctaTitle,
      ctaBody: override?.ctaBody ?? detail.ctaBody,
      sections: override?.sections ?? detail.sections,
    };
  }

  private toBlogPost(doc: MarketingBlogDoc): MarketingBlogPost | null {
    if (!doc.slug || !doc.title || !doc.category) return null;
    return {
      slug: doc.slug,
      category: doc.category,
      title: doc.title,
      excerpt: doc.excerpt || '',
      readTime: doc.readTime || '5 min read',
      publishedAt: doc.publishedAt || 'Recent',
    };
  }
}