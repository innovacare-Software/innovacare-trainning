export interface LocalizedMarketingText {
  en: string;
  fr: string;
}

export interface MarketingNavGroup {
  title: string;
  links: Array<{ label: string; path: string; fragment?: string }>;
}

export interface MarketingCardStat {
  label: LocalizedMarketingText;
  value: string;
  hint: LocalizedMarketingText;
}

export interface MarketingProgramTrack {
  category: 'nursing' | 'medical';
  title: LocalizedMarketingText;
  tag: string;
  description: LocalizedMarketingText;
  cta: LocalizedMarketingText;
}

export interface MarketingTestimonial {
  quote: LocalizedMarketingText;
  author: string;
  role: LocalizedMarketingText;
  date: LocalizedMarketingText;
  photoUrl: string;
}

export interface MarketingBlogPost {
  slug: string;
  category: 'NCLEX' | 'Study Skills' | 'Career' | 'Educators';
  title: string;
  excerpt: string;
  readTime: string;
  publishedAt: string;
  imageUrl?: string;
}

export interface MarketingBlogSection {
  title: string;
  paragraphs: string[];
}

export interface MarketingBlogPostDetail extends MarketingBlogPost {
  heroImageUrl: string;
  author: string;
  authorRole: string;
  intro: string;
  tags: string[];
  sections: MarketingBlogSection[];
  quote: string;
  ctaTitle: string;
  ctaBody: string;
}

export interface DomainPreset {
  orgId: string;
  domainKey: 'nclex' | 'devops' | 'cybersecurity';
  label: LocalizedMarketingText;
  headline: LocalizedMarketingText;
  description: LocalizedMarketingText;
}

export const DOMAIN_PRESETS: Record<string, DomainPreset> = {
  nclex: {
    orgId: 'innovacare-public',
    domainKey: 'nclex',
    label: { en: 'NCLEX Review', fr: 'Révision NCLEX' },
    headline: { en: 'Innovacare is the #1 choice for NCLEX preparation', fr: 'Innovacare est le choix no 1 pour la préparation au NCLEX' },
    description: { en: 'A premium NCLEX review platform designed to convert visitors into confident, exam-ready nurses.', fr: 'Une plateforme premium de révision NCLEX conçue pour transformer les visiteurs en infirmiers confiants et prêts pour l’examen.' },
  },
  devops: {
    orgId: 'innovacare-devops',
    domainKey: 'devops',
    label: { en: 'DevOps Academy', fr: 'Académie DevOps' },
    headline: { en: 'Modern cloud certification programs for high-growth teams', fr: 'Des programmes modernes de certification cloud pour les équipes à forte croissance' },
    description: { en: 'A multi-tenant-ready marketing system that can scale beyond healthcare into technical education.', fr: 'Un système marketing prêt pour le multi-tenant capable de s’étendre au-delà de la santé vers la formation technique.' },
  },
  cybersecurity: {
    orgId: 'innovacare-cyber',
    domainKey: 'cybersecurity',
    label: { en: 'Cybersecurity Academy', fr: 'Académie Cybersécurité' },
    headline: { en: 'Security careers built on practical, high-trust learning experiences', fr: 'Des carrières en cybersécurité construites sur des expériences d’apprentissage pratiques et à forte confiance' },
    description: { en: 'A domain-switchable growth layer built for education brands that need performance and governance.', fr: 'Une couche de croissance adaptable par domaine, conçue pour des marques éducatives qui ont besoin de performance et de gouvernance.' },
  },
};

export const MEGA_MENU_GROUPS: MarketingNavGroup[] = [
  {
    title: 'Categories',
    links: [
      { label: 'NCLEX-RN', path: '/courses', fragment: 'nursing' },
      { label: 'NCLEX-PN', path: '/courses', fragment: 'nursing' },
      { label: 'FNP', path: '/courses', fragment: 'medical' },
      { label: 'Medical Review', path: '/medical-program' },
    ],
  },
  {
    title: 'Quick Links',
    links: [
      { label: 'Take the Quiz', path: '/home', fragment: 'quiz' },
      { label: 'Social Learning', path: '/social-learning', fragment: 'nclex' },
      { label: 'Student Stories', path: '/testimonials' },
      { label: 'Institutional Sales', path: '/home', fragment: 'educators' },
      { label: 'Blog Library', path: '/blog' },
    ],
  },
  {
    title: 'New Destinations',
    links: [
      { label: 'IT Career Landing', path: '/it-courses' },
      { label: 'Medical Program', path: '/medical-program' },
      { label: 'Testimonials Hub', path: '/testimonials' },
      { label: 'Featured Article', path: '/blog', fragment: undefined },
    ],
  },
];

export const HERO_STATS: MarketingCardStat[] = [
  { label: { en: 'Students trained', fr: 'Étudiants accompagnés' }, value: '300,000+', hint: { en: 'Across public review, enterprise cohorts, and mobile.', fr: 'À travers la préparation publique, les cohortes institutionnelles et le mobile.' } },
  { label: { en: 'Pass rate', fr: 'Taux de réussite' }, value: '98%', hint: { en: 'Blended readiness model with analytics, remediation, and coaching.', fr: 'Modèle de préparation avec analytique, remédiation et accompagnement.' } },
  { label: { en: 'Avg. readiness uplift', fr: 'Hausse moyenne de préparation' }, value: '2.4x', hint: { en: 'From diagnostic baseline to final simulation readiness.', fr: 'Du diagnostic initial à la préparation finale en simulation.' } },
];

export const VALUE_PROPS = [
  {
    title: { en: 'Affordable education', fr: 'Formation accessible' },
    description: { en: 'Flexible pricing tiers and financing pathways built to reduce exam prep friction.', fr: 'Des tarifs flexibles et des parcours de financement conçus pour réduire les frictions liées à la préparation.' },
  },
  {
    title: { en: 'Innovation-driven learning', fr: 'Apprentissage guidé par l’innovation' },
    description: { en: 'Adaptive study plans, social learning, diagnostics, and simulation-rich experiences.', fr: 'Plans d’étude adaptatifs, apprentissage social, diagnostics et expériences riches en simulation.' },
  },
  {
    title: { en: 'Career success support', fr: 'Soutien vers la réussite professionnelle' },
    description: { en: 'Mentorship, institutional pathways, and exam-to-employment onboarding journeys.', fr: 'Mentorat, parcours institutionnels et accompagnement de l’examen vers l’emploi.' },
  },
];

export const PROGRAM_TRACKS: MarketingProgramTrack[] = [
  {
    category: 'nursing',
    title: { en: 'NCLEX-RN Accelerator', fr: 'Accélérateur NCLEX-RN' },
    tag: 'NCLEX-RN',
    description: { en: 'High-intensity review, CAT-style Qbank, live coaching, and 8-week study maps.', fr: 'Révision intensive, banque de questions de type CAT, coaching en direct et plan d’étude sur 8 semaines.' },
    cta: { en: 'Learn More', fr: 'En savoir plus' },
  },
  {
    category: 'nursing',
    title: { en: 'PN Success Pathway', fr: 'Parcours de réussite PN' },
    tag: 'NCLEX-PN',
    description: { en: 'Targeted rationales, confidence drills, and mobile review routines for repeatability.', fr: 'Rationales ciblées, exercices de confiance et routines de révision mobile pour progresser durablement.' },
    cta: { en: 'Learn More', fr: 'En savoir plus' },
  },
  {
    category: 'medical',
    title: { en: 'FNP Board Sprint', fr: 'Sprint FNP Boards' },
    tag: 'FNP',
    description: { en: 'Faculty-led exam strategy with structured remediation and institution-ready analytics.', fr: 'Stratégie d’examen animée par des formateurs avec remédiation structurée et analytique prête pour les institutions.' },
    cta: { en: 'Learn More', fr: 'En savoir plus' },
  },
  {
    category: 'medical',
    title: { en: 'Clinical Readiness Review', fr: 'Révision de préparation clinique' },
    tag: 'Medical',
    description: { en: 'Foundational review for bridge programs, CE learners, and workforce re-entry cohorts.', fr: 'Révision fondamentale pour programmes passerelles, formation continue et cohortes de retour en pratique.' },
    cta: { en: 'Learn More', fr: 'En savoir plus' },
  },
];

export const WHY_CHOOSE_US = [
  { en: 'Data-driven readiness scoring and personalized remediation', fr: 'Score de préparation piloté par les données et remédiation personnalisée' },
  { en: 'Trusted by thousands of learners, educators, and partner institutions', fr: 'Adopté par des milliers d’apprenants, d’éducateurs et d’institutions partenaires' },
  { en: 'Built for multi-tenant growth across healthcare and future verticals', fr: 'Conçu pour une croissance multi-tenant dans la santé et d’autres secteurs à venir' },
];

export const TRUST_BADGES = [
  { en: 'Top-rated review experience', fr: 'Expérience de révision très bien notée' },
  { en: 'Enterprise-ready LMS architecture', fr: 'Architecture LMS prête pour les institutions' },
  { en: 'Trusted by cohort-based educators', fr: 'Adopté par les formateurs en cohorte' },
  { en: 'Mobile-first learning ecosystem', fr: 'Écosystème d’apprentissage pensé d’abord pour le mobile' },
];

export const TESTIMONIALS: MarketingTestimonial[] = [
  {
    quote: { en: 'Innovacare made our prep program feel premium. The dashboard, coaching, and analytics reduced anxiety and improved completion.', fr: 'Innovacare a donné une vraie dimension premium à notre préparation. Le tableau de bord, le coaching et l’analytique ont réduit l’anxiété et amélioré la complétion.' },
    author: 'Naomi Carter',
    role: { en: 'NCLEX-RN candidate', fr: 'Candidate NCLEX-RN' },
    date: { en: 'March 2026', fr: 'Mars 2026' },
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    quote: { en: 'We needed a public marketing site that actually converted into our LMS. Innovacare gave us both trust and enrollment velocity.', fr: 'Nous avions besoin d’un site marketing public qui convertisse réellement vers notre LMS. Innovacare nous a apporté à la fois la confiance et la vitesse d’inscription.' },
    author: 'Dr. Leila Matthews',
    role: { en: 'Director of Nursing Education', fr: 'Directrice de la formation infirmière' },
    date: { en: 'February 2026', fr: 'Février 2026' },
    photoUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    quote: { en: 'The personalized quiz and social learning hooks kept our cohort active. It feels more modern than the big incumbents.', fr: 'Le quiz personnalisé et les mécaniques d’apprentissage social ont gardé notre cohorte engagée. L’expérience semble plus moderne que chez les grands acteurs du marché.' },
    author: 'Janelle Brooks',
    role: { en: 'Repeat test-taker turned mentor', fr: 'Candidate en reprise devenue mentore' },
    date: { en: 'January 2026', fr: 'Janvier 2026' },
    photoUrl: 'https://randomuser.me/api/portraits/women/33.jpg',
  },
  {
    quote: { en: 'The premium UX makes a real difference. Learners trust the product faster, and our team can scale campaigns without rebuilding pages.', fr: 'L’UX premium fait une vraie différence. Les apprenants font confiance plus vite au produit, et notre équipe peut faire évoluer les campagnes sans reconstruire les pages.' },
    author: 'Marcus Ellery',
    role: { en: 'Growth lead, institutional partnerships', fr: 'Responsable croissance, partenariats institutionnels' },
    date: { en: 'December 2025', fr: 'Décembre 2025' },
    photoUrl: 'https://randomuser.me/api/portraits/men/36.jpg',
  },
  {
    quote: { en: 'Our bridge cohort finally had a public-facing experience that matched the quality of the internal program. That changed how quickly students converted.', fr: 'Notre cohorte passerelle a enfin eu une expérience publique à la hauteur de la qualité du programme interne. Cela a changé la vitesse de conversion des étudiants.' },
    author: 'Arielle Bennett',
    role: { en: 'Bridge program coordinator', fr: 'Coordonnatrice de programme passerelle' },
    date: { en: 'November 2025', fr: 'Novembre 2025' },
    photoUrl: 'https://randomuser.me/api/portraits/women/52.jpg',
  },
  {
    quote: { en: 'Students repeatedly mentioned the clarity of the platform, the stronger confidence going into exam week, and how much more professional the learning flow felt.', fr: 'Les étudiants ont souvent souligné la clarté de la plateforme, une plus grande confiance avant la semaine d’examen et un parcours d’apprentissage beaucoup plus professionnel.' },
    author: 'Owen Ramirez',
    role: { en: 'Clinical readiness advisor', fr: 'Conseiller en préparation clinique' },
    date: { en: 'October 2025', fr: 'Octobre 2025' },
    photoUrl: 'https://randomuser.me/api/portraits/men/47.jpg',
  },
];

export const BLOG_POSTS: MarketingBlogPost[] = [
  {
    slug: 'nclex-study-plan-8-weeks',
    category: 'NCLEX',
    title: 'How to build an 8-week NCLEX study plan that actually sticks',
    excerpt: 'A conversion-minded prep schedule using diagnostics, spaced repetition, and targeted simulation blocks.',
    readTime: '7 min read',
    publishedAt: 'April 2, 2026',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
  },
  {
    slug: 'why-social-learning-works',
    category: 'Study Skills',
    title: 'Why social learning improves retention for high-stakes exams',
    excerpt: 'Peer accountability, streak mechanics, and discussion prompts can improve consistency more than passive review.',
    readTime: '5 min read',
    publishedAt: 'March 21, 2026',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_37_36_2_jmmn4p.png',
  },
  {
    slug: 'from-exam-to-employment',
    category: 'Career',
    title: 'From exam prep to employment: designing a smoother nursing transition',
    excerpt: 'The best NCLEX platforms now support confidence, onboarding, and career progression, not just question banks.',
    readTime: '6 min read',
    publishedAt: 'March 7, 2026',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_11_3_m5wjoa.png',
  },
  {
    slug: 'cohort-analytics-for-educators',
    category: 'Educators',
    title: 'What educators should track before a cohort falls behind',
    excerpt: 'A simple analytics framework for spotting disengagement, remediation gaps, and underused prep resources.',
    readTime: '8 min read',
    publishedAt: 'February 26, 2026',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_08_1_gv03b6.png',
  },
  {
    slug: 'nclex-test-day-prep',
    category: 'NCLEX',
    title: 'Test-day preparation checklist for NCLEX confidence',
    excerpt: 'A tactical walkthrough for the last 72 hours before the exam, including pacing and mental load management.',
    readTime: '4 min read',
    publishedAt: 'February 12, 2026',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121785/ChatGPT_Image_6_mai_2026_22_40_16_6_jpgu4b.png',
  },
  {
    slug: 'institutional-buying-guide',
    category: 'Educators',
    title: 'A practical buying guide for schools evaluating NCLEX prep platforms',
    excerpt: 'What to look for in multi-tenant reporting, learner onboarding, and conversion from website to LMS.',
    readTime: '9 min read',
    publishedAt: 'January 18, 2026',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'infection-control-nclex',
    category: 'NCLEX',
    title: 'Infection control NCLEX questions: what to review first',
    excerpt: 'A focused review of isolation, PPE, sterile technique, and patient-safety traps that show up often on NCLEX-style exams.',
    readTime: '6 min read',
    publishedAt: 'January 10, 2026',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'nclex-priority-questions',
    category: 'NCLEX',
    title: 'How to answer NCLEX priority questions without overthinking',
    excerpt: 'Use ABCs, safety, and unstable-vs-stable triage to answer priority questions faster and with more confidence.',
    readTime: '5 min read',
    publishedAt: 'December 28, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'next-generation-nclex-strategy',
    category: 'NCLEX',
    title: 'Next Generation NCLEX strategy for case studies and bow-tie questions',
    excerpt: 'A practical framework for reading NGN case studies, spotting cues, and choosing safer answers under pressure.',
    readTime: '7 min read',
    publishedAt: 'December 14, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'cgfns-vs-nclex-guide',
    category: 'Career',
    title: 'CGFNS vs NCLEX: the international nurse roadmap explained',
    excerpt: 'Understand how CGFNS, licensure steps, and NCLEX preparation fit together for nurses targeting the USA and Canada.',
    readTime: '8 min read',
    publishedAt: 'November 30, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'nclex-pharmacology-mistakes',
    category: 'NCLEX',
    title: '7 pharmacology mistakes that keep NCLEX candidates below passing',
    excerpt: 'The common medication-safety and drug-class errors that slow progress and how to fix them with a tighter review loop.',
    readTime: '6 min read',
    publishedAt: 'November 16, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'first-job-after-nclex',
    category: 'Career',
    title: 'How to prepare for your first nursing job after NCLEX',
    excerpt: 'Bridge the gap from exam success to interviews, onboarding, and clinical confidence in your first role.',
    readTime: '6 min read',
    publishedAt: 'November 2, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'nclex-remediation-after-fail',
    category: 'NCLEX',
    title: 'What to do after failing NCLEX once: a remediation plan that works',
    excerpt: 'Reset your study system, diagnose score gaps, and rebuild momentum without repeating the same mistakes.',
    readTime: '7 min read',
    publishedAt: 'October 19, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'dha-doh-nurse-licensure-guide',
    category: 'Career',
    title: 'DHA vs DOH for nurses: how to choose the right UAE licensure path',
    excerpt: 'Compare DHA and DOH requirements, exam expectations, and study priorities for nurses targeting UAE opportunities.',
    readTime: '6 min read',
    publishedAt: 'October 5, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
  {
    slug: 'nclex-day-prep',
    category: 'NCLEX',
    title: 'NCLEX day prep: the calm, practical checklist for exam morning',
    excerpt: 'What to prepare the night before, what to bring, and how to protect focus on exam day.',
    readTime: '4 min read',
    publishedAt: 'September 21, 2025',
    imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
  },
];

export const BLOG_POST_DETAILS: MarketingBlogPostDetail[] = [
  {
    ...BLOG_POSTS[0],
    heroImageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
    author: 'Maya Henderson',
    authorRole: 'NCLEX Content Strategist',
    intro: 'Eight weeks is long enough to improve performance and short enough to keep urgency high. The schedule only works if diagnostics, repetition and recovery are designed as one system.',
    tags: ['NCLEX-RN', 'Study Plan', 'Readiness'],
    quote: 'Consistency is not a motivation problem. It is a sequencing problem.',
    ctaTitle: 'Turn this plan into a personalized learning path',
    ctaBody: 'Use the Innovacare quiz to match study window, confidence level and preferred support mode to the right offer.',
    sections: [
      {
        title: 'Start with a diagnostic, not with volume',
        paragraphs: [
          'The first week should reveal where the learner is weak, not prove how hard they can grind. A lean diagnostic gives a baseline across management of care, pharmacology, prioritization and endurance.',
          'Once the baseline exists, the study calendar can allocate time by weakness instead of by habit. That is the difference between activity and progress.'
        ],
      },
      {
        title: 'Build repetition into every week',
        paragraphs: [
          'Strong plans rotate retrieval, rationale review and timed sets. Learners remember more when they revisit content with pressure and spacing instead of reading the same notes repeatedly.',
          'This is why Innovacare keeps analytics and remediation side by side. The learner should see both what went wrong and when to revisit it.'
        ],
      },
      {
        title: 'Reserve the final stretch for exam conditions',
        paragraphs: [
          'Weeks seven and eight should feel increasingly like test day. Full-length blocks, pacing drills and energy management matter as much as content recall.',
          'By the last 72 hours, the goal is stability. No new strategy, no random resource hopping, and no panic-driven overcorrection.'
        ],
      },
    ],
  },
  {
    ...BLOG_POSTS[1],
    heroImageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_37_36_2_jmmn4p.png',
    author: 'Jordan Ellis',
    authorRole: 'Learning Experience Lead',
    intro: 'High-stakes exam prep gets lonely fast. Social learning works because it converts intention into visible momentum.',
    tags: ['Study Skills', 'Community', 'Retention'],
    quote: 'When progress becomes visible to a peer group, consistency stops feeling optional.',
    ctaTitle: 'Layer accountability into the study journey',
    ctaBody: 'Pair self-study with social learning loops, live checkpoints and coach prompts to keep momentum durable.',
    sections: [
      {
        title: 'Visibility increases follow-through',
        paragraphs: [
          'A learner who studies alone can skip a day without consequence. A learner inside a visible progress loop feels the cost of drift immediately.',
          'That is why streaks, cohort rooms and recap prompts improve retention beyond simple gamification.'
        ],
      },
      {
        title: 'Discussion deepens recall',
        paragraphs: [
          'Explaining a rationale to someone else is one of the fastest ways to discover shallow understanding. Group prompts and peer explanations expose gaps earlier.',
          'For exam prep, that translates into fewer false positives in readiness.'
        ],
      },
      {
        title: 'Community lowers emotional drop-off',
        paragraphs: [
          'Burnout often looks like a content problem when it is actually an isolation problem. Learners persist longer when support is ambient instead of exceptional.',
          'A premium platform should therefore design for connection, not only content delivery.'
        ],
      },
    ],
  },
  {
    ...BLOG_POSTS[2],
    heroImageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_11_3_m5wjoa.png',
    author: 'Leah Morgan',
    authorRole: 'Career Pathway Editor',
    intro: 'The handoff between exam prep and employment is where many education brands lose trust. Learners need a bridge, not a cliff edge.',
    tags: ['Career', 'Nursing', 'Transition'],
    quote: 'A learner who passes still needs orientation, confidence and direction. The product should keep helping.',
    ctaTitle: 'Design the post-exam experience too',
    ctaBody: 'Use public content, onboarding flows and learner dashboards to keep trust alive after the test.',
    sections: [
      {
        title: 'Confidence should extend past the exam',
        paragraphs: [
          'Passing does not erase uncertainty. New nurses still need signal on readiness, documentation habits and first-role confidence.',
          'Platforms that acknowledge this create stronger brand equity and referral loops.'
        ],
      },
      {
        title: 'Content can support onboarding',
        paragraphs: [
          'Blog content, light checklists and transition modules are low-friction assets that help learners feel guided instead of dropped.',
          'This is particularly valuable for institutions that want continuity from prep into workforce readiness.'
        ],
      },
      {
        title: 'Employment messaging improves conversion earlier',
        paragraphs: [
          'Prospects buy with the future in mind. When the offer frames exam success as part of a larger professional path, intent becomes easier to justify.',
          'That message works on both direct-to-consumer pages and institutional sales narratives.'
        ],
      },
    ],
  },
  {
    ...BLOG_POSTS[3],
    heroImageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_08_1_gv03b6.png',
    author: 'Dr. Rina Patel',
    authorRole: 'Education Analytics Advisor',
    intro: 'Most cohorts do not fail suddenly. They show subtle warning signs first. Educators need cleaner leading indicators before performance collapses.',
    tags: ['Educators', 'Analytics', 'Cohorts'],
    quote: 'The most useful dashboard is the one that signals drift before remediation becomes expensive.',
    ctaTitle: 'Operationalize cohort visibility',
    ctaBody: 'Use institutional workflows and learner analytics to intervene earlier and preserve completion momentum.',
    sections: [
      {
        title: 'Watch engagement before scores',
        paragraphs: [
          'Logins, assignment starts, quiz completion lag and participation drops often surface trouble earlier than graded outcomes.',
          'Teams that wait for low scores are usually reacting too late.'
        ],
      },
      {
        title: 'Compare remediation uptake',
        paragraphs: [
          'Low-performing learners who never open remediation assets are the highest-risk segment. That signal matters more than raw question volume.',
          'The product should show educators both underperformance and under-engagement together.'
        ],
      },
      {
        title: 'Tie analytics to action',
        paragraphs: [
          'Dashboards only matter if they trigger outreach, coaching or group intervention. The best analytics layer shortens the path from signal to response.',
          'That is what institutions actually buy when they ask for reporting.'
        ],
      },
    ],
  },
  {
    ...BLOG_POSTS[4],
    heroImageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121785/ChatGPT_Image_6_mai_2026_22_40_16_6_jpgu4b.png',
    author: 'Talia Green',
    authorRole: 'Readiness Coach',
    intro: 'The last three days before NCLEX should reduce noise, not increase it. A focused checklist preserves confidence under pressure.',
    tags: ['NCLEX', 'Checklist', 'Test Day'],
    quote: 'Test-day calm is usually earned the week before, not the night before.',
    ctaTitle: 'Prepare with more structure and less panic',
    ctaBody: 'Use guided study plans and readiness checkpoints to arrive at exam day in control.',
    sections: [
      {
        title: 'Simplify inputs',
        paragraphs: [
          'The final stretch should narrow resources, not expand them. Learners do better when the plan is clear and the decision load is low.',
          'That means one review source, one pacing model and one recovery rhythm.'
        ],
      },
      {
        title: 'Rehearse logistics',
        paragraphs: [
          'Sleep, meals, route timing and testing-center prep should be settled early. Practical uncertainty drains cognitive energy that should be reserved for the exam.',
          'A good checklist treats logistics as part of performance.'
        ],
      },
      {
        title: 'Protect mental bandwidth',
        paragraphs: [
          'The goal is not to feel perfect. The goal is to enter test day stable. Learners need permission to stop cramming and trust the process they built.',
          'That confidence is easier to create when the platform has paced them well for weeks.'
        ],
      },
    ],
  },
  {
    ...BLOG_POSTS[5],
    heroImageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
    author: 'Marcus Ellery',
    authorRole: 'Institutional Partnerships Lead',
    intro: 'Schools evaluating prep platforms often compare price first, but operational fit is what determines adoption. The buying guide should expose that reality early.',
    tags: ['Educators', 'Buying Guide', 'Institutions'],
    quote: 'Institutions are not just purchasing content. They are purchasing activation, visibility and fewer support gaps.',
    ctaTitle: 'Build an institutional offer that lands cleanly',
    ctaBody: 'Use the contact flow to map cohort size, onboarding needs and reporting expectations to the right plan.',
    sections: [
      {
        title: 'Assess onboarding friction',
        paragraphs: [
          'A platform can look excellent in a demo and still fail in rollout if learner provisioning, orientation and support triage are weak.',
          'Decision-makers should therefore inspect the first 30 days, not just the feature grid.'
        ],
      },
      {
        title: 'Demand actionable reporting',
        paragraphs: [
          'Static exports are rarely enough. Institutions need reports that reveal risk, engagement and remediation uptake in time to act.',
          'That is the difference between reporting and operations support.'
        ],
      },
      {
        title: 'Check the website-to-LMS handoff',
        paragraphs: [
          'Public trust, lead capture and learner activation are often disconnected. Stronger systems keep the handoff clean from landing page to enrolled workspace.',
          'This has direct impact on conversion and perceived product maturity.'
        ],
      },
    ],
  },
];