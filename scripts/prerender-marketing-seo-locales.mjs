import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_ORIGIN = 'https://www.innovacarereview.com';
const SITE_NAME = 'Innovacare Training';
const DEFAULT_IMAGE =
  'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775876293/8B3AC2EB-D700-4446-8E63-CFC050AB7704_aj4s69.png';
const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large';

const CORE_NURSING_KEYWORDS_EN = [
  'NCLEX prep',
  'NCLEX-RN',
  'NCLEX-PN',
  'Next Generation NCLEX',
  'CGFNS',
  'DHA exam',
  'DOH exam',
  'nursing exam prep',
  'nursing licensing exam',
  'international nursing license',
  'nursing jobs USA',
  'nursing jobs Canada',
  'nursing jobs UAE',
];

const CORE_NURSING_KEYWORDS_FR = [
  'préparation NCLEX',
  'NCLEX-RN',
  'NCLEX-PN',
  'Next Generation NCLEX',
  'CGFNS',
  'examen DHA',
  'examen DOH',
  'préparation examen infirmier',
  'licence infirmière internationale',
  'travailler comme infirmier aux USA',
  'travailler comme infirmier au Canada',
  'travailler comme infirmier aux Émirats',
];

const HOME_STRUCTURED_DATA = {
  en: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/home`,
      description:
        'Premium NCLEX, nursing, medical and IT learning experiences for learners and institutions.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/home`,
      description:
        'Innovacare Training builds premium exam-prep and cohort learning experiences for healthcare and technical education.',
    },
  ],
  fr: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/fr/home`,
      description:
        'Parcours premium de préparation NCLEX, soins infirmiers, médical et IT pour les apprenants et les institutions.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/fr/home`,
      description:
        'Innovacare Training conçoit des expériences premium de préparation aux examens et de formation en cohorte pour la santé et la formation technique.',
    },
  ],
};

const BASE_PAGES = [
  {
    key: 'login',
    en: {
      path: '/login',
      title: 'Login to Innovacare Training',
      description:
        'Access your Innovacare Training account for NCLEX prep, nursing programs, and learner progress.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'login', 'learner portal', 'student access'],
    },
    fr: {
      path: '/fr/login',
      title: 'Connexion a Innovacare Training',
      description:
        'Connectez-vous a votre compte Innovacare Training pour la preparation NCLEX, les programmes infirmiers et le suivi apprenant.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'connexion', 'espace apprenant', 'acces etudiant'],
    },
  },
  {
    key: 'home',
    en: {
      path: '/home',
      title: 'Premium NCLEX, Nursing, Medical and IT Training',
      description:
        'Innovacare Training helps learners and institutions launch premium NCLEX, nursing, medical and IT training journeys with conversion-ready education experiences.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'nursing courses', 'medical programs', 'IT courses', 'training platform'],
      structuredData: HOME_STRUCTURED_DATA.en,
    },
    fr: {
      path: '/fr/home',
      title: 'Préparation premium NCLEX, soins infirmiers, médical et IT',
      description:
        'Innovacare Training aide les apprenants et les institutions à lancer des parcours premium en NCLEX, soins infirmiers, médical et IT avec une expérience éducative pensée pour la conversion.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'cours infirmiers', 'programmes médicaux', 'cours IT', 'plateforme de formation'],
      structuredData: HOME_STRUCTURED_DATA.fr,
    },
  },
  {
    key: 'courses',
    en: {
      path: '/courses',
      title: 'Course Catalogue for NCLEX and Clinical Readiness',
      description:
        'Explore Innovacare public courses for NCLEX, nursing and clinical readiness with a premium catalogue experience built for discovery and conversion.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'course catalogue', 'NCLEX courses', 'clinical review', 'nursing education'],
    },
    fr: {
      path: '/fr/courses',
      title: 'Catalogue de cours pour le NCLEX et la préparation clinique',
      description:
        'Explorez les cours publics Innovacare pour le NCLEX, les soins infirmiers et la préparation clinique dans une expérience catalogue premium pensée pour la découverte et la conversion.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'catalogue de cours', 'cours NCLEX', 'révision clinique', 'formation infirmière'],
    },
  },
  {
    key: 'catalogue',
    en: {
      path: '/catalogue',
      title: 'Course Catalogue for NCLEX and Clinical Readiness',
      description:
        'Browse Innovacare programs in a premium public catalogue spanning NCLEX, nursing and clinical readiness pathways.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'course catalogue', 'NCLEX catalogue', 'clinical courses', 'public programs'],
    },
    fr: {
      path: '/fr/catalogue',
      title: 'Catalogue de cours pour le NCLEX et la préparation clinique',
      description:
        'Parcourez les programmes Innovacare dans un catalogue public premium couvrant le NCLEX, les soins infirmiers et les parcours de préparation clinique.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'catalogue de cours', 'catalogue NCLEX', 'cours cliniques', 'programmes publics'],
    },
  },
  {
    key: 'blog',
    en: {
      path: '/blog',
      title: 'NCLEX and Learning Strategy Blog',
      description:
        'Read Innovacare articles on NCLEX study plans, learner retention, cohort analytics and education-to-career strategy.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'NCLEX blog', 'study strategy', 'cohort analytics', 'learner retention'],
    },
    fr: {
      path: '/fr/blog',
      title: 'Blog NCLEX et stratégie d’apprentissage',
      description:
        'Lisez les articles Innovacare sur les plans d’étude NCLEX, la rétention des apprenants, l’analytique de cohorte et la transition entre formation et carrière.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'blog NCLEX', 'stratégie d’étude', 'analytique de cohorte', 'rétention apprenants'],
    },
  },
  {
    key: 'testimonials',
    en: {
      path: '/testimonials',
      title: 'Learner and Institution Success Stories',
      description:
        'Discover testimonials, learner wins and institutional outcomes that show how Innovacare builds trust before enrollment and value after launch.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'testimonials', 'success stories', 'learner reviews', 'social proof'],
    },
    fr: {
      path: '/fr/testimonials',
      title: 'Témoignages et réussites apprenants et institutions',
      description:
        'Découvrez des témoignages, réussites apprenants et résultats institutionnels qui montrent comment Innovacare construit la confiance avant l’inscription et la valeur après le lancement.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'témoignages', 'success stories', 'avis apprenants', 'preuve sociale'],
    },
  },
  {
    key: 'medical-program',
    en: {
      path: '/medical-program',
      title: 'Medical and Clinical Readiness Program',
      description:
        'Explore Innovacare medical and clinical readiness programs designed for advanced nursing learners, faculty delivery and cohort deployment.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'medical program', 'clinical readiness', 'advanced nursing review'],
    },
    fr: {
      path: '/fr/medical-program',
      title: 'Programme médical et préparation clinique',
      description:
        'Explorez les programmes médicaux et de préparation clinique Innovacare conçus pour les apprenants avancés en soins infirmiers, la diffusion facultaire et les cohortes.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'programme médical', 'préparation clinique', 'révision infirmière avancée'],
    },
  },
  {
    key: 'it-courses',
    en: {
      path: '/it-courses',
      title: 'IT Courses in Cloud, DevOps and Cybersecurity',
      description:
        'Launch demand for premium IT training with Innovacare courses in cloud platforms, DevOps delivery and cybersecurity fundamentals.',
      keywords: ['IT courses', 'cloud training', 'DevOps training', 'cybersecurity courses', 'technical upskilling'],
    },
    fr: {
      path: '/fr/it-courses',
      title: 'Cours IT en cloud, DevOps et cybersécurité',
      description:
        'Développez la demande pour une formation IT premium avec Innovacare autour du cloud, du DevOps et des fondamentaux cybersécurité.',
      keywords: ['cours IT', 'formation cloud', 'formation DevOps', 'cours cybersécurité', 'montée en compétences techniques'],
    },
  },
  {
    key: 'contact',
    en: {
      path: '/contact',
      title: 'Contact Innovacare Training',
      description:
        'Talk with Innovacare about learner support, institutional pricing, cohort onboarding and partnership opportunities.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'contact Innovacare', 'training support', 'cohort onboarding'],
    },
    fr: {
      path: '/fr/contact',
      title: 'Contacter Innovacare Training',
      description:
        'Échangez avec Innovacare sur l’accompagnement apprenant, la tarification institutionnelle, l’onboarding des cohortes et les partenariats.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'contacter Innovacare', 'support formation', 'onboarding cohortes'],
    },
  },
  {
    key: 'pricing',
    en: {
      path: '/pricing',
      title: 'Pricing for Learners and Institutions',
      description:
        'Compare Innovacare pricing for self-study learners, accelerated exam prep and institution-ready cohort licensing.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'pricing', 'NCLEX pricing', 'institutional licensing', 'cohort pricing'],
    },
    fr: {
      path: '/fr/pricing',
      title: 'Tarifs pour apprenants et institutions',
      description:
        'Comparez les tarifs Innovacare pour l’autoformation, la préparation accélérée aux examens et les licences de cohorte prêtes pour les institutions.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'tarifs', 'tarif NCLEX', 'licence institutionnelle', 'tarif cohorte'],
    },
  },
  {
    key: 'fonctionnalites',
    en: {
      path: '/fonctionnalites',
      title: 'Platform Features for Growth and Readiness',
      description:
        'See how Innovacare combines adaptive learning, social learning loops, analytics and conversion-ready UX in one platform.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'platform features', 'adaptive learning', 'cohort analytics'],
    },
    fr: {
      path: '/fr/fonctionnalites',
      title: 'Fonctionnalités plateforme pour la croissance et la préparation',
      description:
        'Découvrez comment Innovacare combine apprentissage adaptatif, boucles sociales, analytics et UX orientée conversion sur une seule plateforme.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'fonctionnalités plateforme', 'apprentissage adaptatif', 'analytics cohorte'],
    },
  },
  {
    key: 'global-nurse-pack',
    en: {
      path: '/global-nurse-pack',
      title: 'Global Nurse Licensing Starter Pack',
      description:
        'A premium step-by-step digital pack for nurses in Africa planning their licensing journey toward the USA, Canada, and UAE.',
      keywords: [...CORE_NURSING_KEYWORDS_EN, 'international nurse licensing', 'CGFNS', 'NNAS', 'DHA', 'DOH'],
    },
    fr: {
      path: '/fr/global-nurse-pack',
      title: 'Pack de démarrage licence infirmière internationale',
      description:
        'Un pack premium pas à pas pour aider les infirmiers formés en Afrique à planifier leur parcours de licence vers les USA, le Canada et les Émirats arabes unis.',
      keywords: [...CORE_NURSING_KEYWORDS_FR, 'licence infirmière internationale', 'CGFNS', 'NNAS', 'DHA', 'DOH'],
    },
  },
];

const BLOG_POSTS = [
  {
    slug: 'nclex-study-plan-8-weeks',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622326/D12A1509-BD77-4AF8-8D46-36CCEE440BC4_ctl46n.png',
    publishedAt: '2026-04-02',
    en: {
      title: 'How to build an 8-week NCLEX study plan that actually sticks',
      excerpt:
        'A conversion-minded prep schedule using diagnostics, spaced repetition, and targeted simulation blocks.',
      category: 'NCLEX',
    },
    fr: {
      title: 'Construire un plan d’étude NCLEX sur 8 semaines qui tient vraiment',
      excerpt:
        'Un planning de préparation orienté conversion, fondé sur le diagnostic, la répétition espacée et des blocs de simulation ciblés.',
      category: 'NCLEX',
    },
  },
  {
    slug: 'why-social-learning-works',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622329/71EA67DD-9BAC-401A-A907-855E2E2297F7_ozf7vw.png',
    publishedAt: '2026-03-21',
    en: {
      title: 'Why social learning improves retention for high-stakes exams',
      excerpt:
        'Peer accountability, streak mechanics, and discussion prompts can improve consistency more than passive review.',
      category: 'Study Skills',
    },
    fr: {
      title: 'Pourquoi l’apprentissage social améliore la rétention pour les examens à fort enjeu',
      excerpt:
        'La responsabilité entre pairs, les mécaniques de série et les discussions guidées améliorent souvent davantage la régularité que la révision passive.',
      category: 'Méthodologie',
    },
  },
  {
    slug: 'from-exam-to-employment',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775621955/ChatGPT_Image_8_avr._2026_00_15_15_zj9cjr.png',
    publishedAt: '2026-03-07',
    en: {
      title: 'From exam prep to employment: designing a smoother nursing transition',
      excerpt:
        'The best NCLEX platforms now support confidence, onboarding, and career progression, not just question banks.',
      category: 'Career',
    },
    fr: {
      title: 'De la préparation à l’emploi: concevoir une transition infirmière plus fluide',
      excerpt:
        'Les meilleures plateformes NCLEX soutiennent désormais la confiance, l’onboarding et la progression de carrière, pas seulement les banques de questions.',
      category: 'Carrière',
    },
  },
  {
    slug: 'cohort-analytics-for-educators',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622329/3AB0EC16-DEE3-4198-AD16-3F74FF0DCEAB_j85tzf.png',
    publishedAt: '2026-02-26',
    en: {
      title: 'What educators should track before a cohort falls behind',
      excerpt:
        'A simple analytics framework for spotting disengagement, remediation gaps, and underused prep resources.',
      category: 'Educators',
    },
    fr: {
      title: 'Ce que les formateurs doivent suivre avant qu’une cohorte ne décroche',
      excerpt:
        'Un cadre analytique simple pour détecter le désengagement, les écarts de remédiation et les ressources de préparation sous-utilisées.',
      category: 'Éducation',
    },
  },
  {
    slug: 'nclex-test-day-prep',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1774998911/ChatGPT_Image_31_mars_2026_19_13_12_pogn1o.png',
    publishedAt: '2026-02-12',
    en: {
      title: 'Test-day preparation checklist for NCLEX confidence',
      excerpt:
        'A tactical walkthrough for the last 72 hours before the exam, including pacing and mental load management.',
      category: 'NCLEX',
    },
    fr: {
      title: 'Checklist de préparation NCLEX pour aborder le jour J avec confiance',
      excerpt:
        'Un guide tactique pour les 72 dernières heures avant l’examen, incluant le rythme et la gestion de la charge mentale.',
      category: 'NCLEX',
    },
  },
  {
    slug: 'institutional-buying-guide',
    image: DEFAULT_IMAGE,
    publishedAt: '2026-01-18',
    en: {
      title: 'A practical buying guide for schools evaluating NCLEX prep platforms',
      excerpt:
        'What to look for in multi-tenant reporting, learner onboarding, and conversion from website to LMS.',
      category: 'Educators',
    },
    fr: {
      title: 'Guide d’achat pratique pour les écoles qui évaluent des plateformes de préparation NCLEX',
      excerpt:
        'Les critères à examiner sur le reporting multi-tenant, l’onboarding apprenant et la conversion du site web vers le LMS.',
      category: 'Éducation',
    },
  },
  {
    slug: 'infection-control-nclex',
    image: DEFAULT_IMAGE,
    publishedAt: '2026-01-10',
    en: {
      title: 'Infection control NCLEX questions: what to review first',
      excerpt:
        'A focused review of isolation, PPE, sterile technique, and patient-safety traps that show up often on NCLEX-style exams.',
      category: 'NCLEX',
    },
    fr: {
      title: 'Questions NCLEX sur le controle des infections: quoi revoir en premier',
      excerpt:
        'Un rappel cible sur l isolement, les EPI, la technique sterile et les pieges securite patient frequents dans les examens type NCLEX.',
      category: 'NCLEX',
    },
  },
  {
    slug: 'nclex-priority-questions',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-12-28',
    en: {
      title: 'How to answer NCLEX priority questions without overthinking',
      excerpt:
        'Use ABCs, safety, and unstable-vs-stable triage to answer priority questions faster and with more confidence.',
      category: 'NCLEX',
    },
    fr: {
      title: 'Comment repondre aux questions de priorite NCLEX sans trop reflechir',
      excerpt:
        'Utilisez les ABC, la securite et la logique stable versus instable pour repondre plus vite et avec plus de confiance.',
      category: 'NCLEX',
    },
  },
  {
    slug: 'next-generation-nclex-strategy',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-12-14',
    en: {
      title: 'Next Generation NCLEX strategy for case studies and bow-tie questions',
      excerpt:
        'A practical framework for reading NGN case studies, spotting cues, and choosing safer answers under pressure.',
      category: 'NCLEX',
    },
    fr: {
      title: 'Strategie Next Generation NCLEX pour les case studies et questions bow-tie',
      excerpt:
        'Une methode concrete pour lire les case studies NGN, reperer les indices et choisir des reponses plus sures sous pression.',
      category: 'NCLEX',
    },
  },
  {
    slug: 'cgfns-vs-nclex-guide',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-11-30',
    en: {
      title: 'CGFNS vs NCLEX: the international nurse roadmap explained',
      excerpt:
        'Understand how CGFNS, licensure steps, and NCLEX preparation fit together for nurses targeting the USA and Canada.',
      category: 'Career',
    },
    fr: {
      title: 'CGFNS vs NCLEX: la feuille de route expliquee pour les infirmiers internationaux',
      excerpt:
        'Comprenez comment CGFNS, les etapes de licence et la preparation NCLEX s articulent pour les infirmiers visant les USA et le Canada.',
      category: 'Carriere',
    },
  },
  {
    slug: 'nclex-pharmacology-mistakes',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-11-16',
    en: {
      title: '7 pharmacology mistakes that keep NCLEX candidates below passing',
      excerpt:
        'The common medication-safety and drug-class errors that slow progress and how to fix them with a tighter review loop.',
      category: 'NCLEX',
    },
    fr: {
      title: '7 erreurs de pharmacologie qui bloquent encore la reussite au NCLEX',
      excerpt:
        'Les erreurs frequentes sur la securite medicamenteuse et les classes de medicaments, avec une methode simple pour les corriger.',
      category: 'NCLEX',
    },
  },
  {
    slug: 'first-job-after-nclex',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-11-02',
    en: {
      title: 'How to prepare for your first nursing job after NCLEX',
      excerpt:
        'Bridge the gap from exam success to interviews, onboarding, and clinical confidence in your first role.',
      category: 'Career',
    },
    fr: {
      title: 'Comment preparer votre premier emploi infirmier apres le NCLEX',
      excerpt:
        'Passez de la reussite a l examen aux entretiens, a l onboarding et a la confiance clinique pour votre premier poste.',
      category: 'Carriere',
    },
  },
  {
    slug: 'nclex-remediation-after-fail',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-10-19',
    en: {
      title: 'What to do after failing NCLEX once: a remediation plan that works',
      excerpt:
        'Reset your study system, diagnose score gaps, and rebuild momentum without repeating the same mistakes.',
      category: 'NCLEX',
    },
    fr: {
      title: 'Que faire apres un echec au NCLEX: un plan de remediation qui fonctionne',
      excerpt:
        'Repartez avec un nouveau systeme d etude, identifiez les ecarts et reconstruisez votre elan sans repeter les memes erreurs.',
      category: 'NCLEX',
    },
  },
  {
    slug: 'dha-doh-nurse-licensure-guide',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-10-05',
    en: {
      title: 'DHA vs DOH for nurses: how to choose the right UAE licensure path',
      excerpt:
        'Compare DHA and DOH requirements, exam expectations, and study priorities for nurses targeting UAE opportunities.',
      category: 'Career',
    },
    fr: {
      title: 'DHA vs DOH pour infirmiers: choisir le bon parcours de licence aux Emirats',
      excerpt:
        'Comparez les exigences DHA et DOH, les attentes d examen et les priorites d etude pour les infirmiers visant les Emirats.',
      category: 'Carriere',
    },
  },
  {
    slug: 'nclex-day-prep',
    image: DEFAULT_IMAGE,
    publishedAt: '2025-09-21',
    en: {
      title: 'NCLEX day prep: the calm, practical checklist for exam morning',
      excerpt:
        'What to prepare the night before, what to bring, and how to protect focus on exam day.',
      category: 'NCLEX',
    },
    fr: {
      title: 'Preparation du jour NCLEX: la checklist simple et calme pour le matin de l examen',
      excerpt:
        'Ce qu il faut preparer la veille, quoi apporter et comment proteger votre concentration le jour J.',
      category: 'NCLEX',
    },
  },
];

const PROGRAM_SITEMAP_PAGES = [
  { path: '/global-nurse-pack', changefreq: 'weekly', priority: '0.9', lastmod: '2026-04-23' },
  { path: '/pre-nursing', changefreq: 'weekly', priority: '0.8', lastmod: '2026-04-15' },
  { path: '/nclex-rn', changefreq: 'weekly', priority: '0.8', lastmod: '2026-04-20' },
  { path: '/nclex-pn', changefreq: 'weekly', priority: '0.8', lastmod: '2026-04-18' },
  { path: '/nursing-school', changefreq: 'weekly', priority: '0.8', lastmod: '2026-04-17' },
  { path: '/medical-program', changefreq: 'weekly', priority: '0.8', lastmod: '2026-04-16' },
  { path: '/it-courses', changefreq: 'weekly', priority: '0.8', lastmod: '2026-04-14' },
  { path: '/for-educators', changefreq: 'weekly', priority: '0.7', lastmod: '2026-04-11' },
  { path: '/educators-nclex', changefreq: 'weekly', priority: '0.8', lastmod: '2026-04-10' },
  { path: '/educators-nursing-school', changefreq: 'weekly', priority: '0.7', lastmod: '2026-04-09' },
  { path: '/private-tutors', changefreq: 'weekly', priority: '0.7', lastmod: '2026-04-08' },
];

const STATIC_SITEMAP_RULES = {
  '/': { lastmod: '2026-04-22', changefreq: 'daily', priority: '1.0' },
  '/home': { lastmod: '2026-04-22', changefreq: 'daily', priority: '1.0' },
  '/login': { lastmod: '2026-04-18', changefreq: 'monthly', priority: '0.4' },
  '/global-nurse-pack': { lastmod: '2026-04-23', changefreq: 'weekly', priority: '0.9' },
  '/courses': { lastmod: '2026-04-20', changefreq: 'weekly', priority: '0.8' },
  '/catalogue': { lastmod: '2026-04-20', changefreq: 'weekly', priority: '0.8' },
  '/blog': { lastmod: '2026-04-21', changefreq: 'daily', priority: '0.9' },
  '/medical-program': { lastmod: '2026-04-16', changefreq: 'weekly', priority: '0.8' },
  '/it-courses': { lastmod: '2026-04-14', changefreq: 'weekly', priority: '0.8' },
  '/contact': { lastmod: '2026-04-19', changefreq: 'weekly', priority: '0.7' },
  '/pricing': { lastmod: '2026-04-19', changefreq: 'weekly', priority: '0.9' },
};

const distDir = path.join(process.cwd(), 'dist', 'myapp', 'browser');
const templatePath = path.join(distDir, 'index.html');

await main();

async function main() {
  const template = await readFile(templatePath, 'utf8');
  const pages = createPages();

  for (const page of pages) {
    await writeRouteHtml(page.routePath, applySeo(template, page));
  }

  await writeSitemap(pages);
}

function createPages() {
  const marketingPages = BASE_PAGES.flatMap((page) => [
    normalizePage(page.en, 'en', 'website'),
    normalizePage(page.fr, 'fr', 'website'),
  ]);

  const blogPages = BLOG_POSTS.flatMap((post) => [
    buildBlogPage(post, 'en'),
    buildBlogPage(post, 'fr'),
  ]);

  return [
    {
      routePath: '/',
      canonicalPath: '/home',
      locale: 'en',
      title: BASE_PAGES[0].en.title,
      description: BASE_PAGES[0].en.description,
      keywords: BASE_PAGES[0].en.keywords,
      image: DEFAULT_IMAGE,
      type: 'website',
      structuredData: BASE_PAGES[0].en.structuredData,
    },
    ...marketingPages,
    ...PROGRAM_SITEMAP_PAGES.map((page) => ({
      routePath: page.path,
      canonicalPath: page.path,
      locale: 'en',
      title: SITE_NAME,
      description: SITE_NAME,
      keywords: CORE_NURSING_KEYWORDS_EN,
      image: DEFAULT_IMAGE,
      type: 'website',
      sitemap: page,
    })),
    ...blogPages,
  ];
}

function normalizePage(page, locale, type) {
  return {
    routePath: page.path,
    canonicalPath: page.path,
    locale,
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    image: DEFAULT_IMAGE,
    type,
    structuredData: page.structuredData,
    sitemap: STATIC_SITEMAP_RULES[page.path] || null,
  };
}

function buildBlogPage(post, locale) {
  const localized = post[locale];
  const routePath = locale === 'fr' ? `/fr/blog/${post.slug}` : `/blog/${post.slug}`;
  return {
    routePath,
    canonicalPath: routePath,
    locale,
    title: localized.title,
    description: localized.excerpt,
    keywords:
      locale === 'fr'
        ? [...CORE_NURSING_KEYWORDS_FR, 'blog Innovacare', localized.category, 'préparation examen', 'stratégie d’apprentissage']
        : [...CORE_NURSING_KEYWORDS_EN, 'Innovacare blog', localized.category, 'exam readiness', 'learning strategy'],
    image: post.image,
    type: 'article',
    sitemap: {
      lastmod: post.publishedAt,
      changefreq: 'weekly',
      priority: '0.85',
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: localized.title,
      description: localized.excerpt,
      image: [post.image],
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      inLanguage: locale,
      mainEntityOfPage: `${SITE_ORIGIN}${routePath}`,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

function applySeo(template, page) {
  const fullTitle = page.title.includes(SITE_NAME) ? page.title : `${page.title} | ${SITE_NAME}`;
  const alternates = buildAlternateUrls(page.routePath === '/' ? '/home' : page.routePath);
  const structuredData = Array.isArray(page.structuredData)
    ? page.structuredData
    : page.structuredData
      ? [page.structuredData]
      : [];

  let html = template;
  html = replaceTag(html, /<html lang="[^"]*"/i, `<html lang="${page.locale}"`);
  html = replaceTag(html, /<title>.*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  html = upsertNamedMeta(html, 'description', page.description);
  html = upsertNamedMeta(html, 'robots', DEFAULT_ROBOTS);
  html = upsertNamedMeta(html, 'keywords', page.keywords.join(', '));
  html = upsertNamedMeta(html, 'twitter:card', 'summary_large_image');
  html = upsertNamedMeta(html, 'twitter:title', fullTitle);
  html = upsertNamedMeta(html, 'twitter:description', page.description);
  html = upsertNamedMeta(html, 'twitter:image', page.image);
  html = upsertPropertyMeta(html, 'og:title', fullTitle);
  html = upsertPropertyMeta(html, 'og:description', page.description);
  html = upsertPropertyMeta(html, 'og:type', page.type);
  html = upsertPropertyMeta(html, 'og:url', `${SITE_ORIGIN}${page.routePath === '/' ? '/home' : page.routePath}`);
  html = upsertPropertyMeta(html, 'og:image', page.image);
  html = upsertPropertyMeta(html, 'og:site_name', SITE_NAME);
  html = upsertPropertyMeta(html, 'og:locale', page.locale === 'fr' ? 'fr_FR' : 'en_US');
  html = upsertPropertyMeta(html, 'og:locale:alternate', page.locale === 'fr' ? 'en_US' : 'fr_FR');
  html = upsertCanonical(html, `${SITE_ORIGIN}${page.canonicalPath}`);
  html = removeGeneratedBlocks(html);
  html = injectBeforeHeadEnd(html, `${buildAlternateLinks(alternates)}${buildStructuredDataScripts(structuredData)}`);
  return html;
}

function buildAlternateUrls(routePath) {
  const englishPath = toEnglishPath(routePath);
  const frenchPath = toFrenchPath(englishPath);
  return {
    en: `${SITE_ORIGIN}${englishPath}`,
    fr: `${SITE_ORIGIN}${frenchPath}`,
    default: `${SITE_ORIGIN}${englishPath}`,
  };
}

function buildAlternateLinks(alternates) {
  return [
    `<link rel="alternate" hreflang="en" href="${alternates.en}" data-seo-hreflang="true">`,
    `<link rel="alternate" hreflang="fr" href="${alternates.fr}" data-seo-hreflang="true">`,
    `<link rel="alternate" hreflang="x-default" href="${alternates.default}" data-seo-hreflang="true">`,
  ].join('\n') + '\n';
}

function buildStructuredDataScripts(entries) {
  if (!entries.length) {
    return '';
  }

  return entries
    .map((entry) => `<script type="application/ld+json" data-seo-json-ld="true">${JSON.stringify(entry)}</script>`)
    .join('\n') + '\n';
}

function removeGeneratedBlocks(html) {
  return html
    .replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+" data-seo-hreflang="true">/gi, '')
    .replace(/\s*<script type="application\/ld\+json" data-seo-json-ld="true">[\s\S]*?<\/script>/gi, '');
}

function injectBeforeHeadEnd(html, content) {
  return html.replace('</head>', `${content}</head>`);
}

function upsertNamedMeta(html, name, content) {
  const tag = `<meta name="${name}" content="${escapeHtml(content)}">`;
  const pattern = new RegExp(`<meta\\s+name="${escapeRegExp(name)}"\\s+content="[^"]*"\\s*?>`, 'i');
  return pattern.test(html) ? html.replace(pattern, tag) : injectBeforeHeadEnd(html, `${tag}\n`);
}

function upsertPropertyMeta(html, property, content) {
  const tag = `<meta property="${property}" content="${escapeHtml(content)}">`;
  const pattern = new RegExp(`<meta\\s+property="${escapeRegExp(property)}"\\s+content="[^"]*"\\s*?>`, 'i');
  return pattern.test(html) ? html.replace(pattern, tag) : injectBeforeHeadEnd(html, `${tag}\n`);
}

function upsertCanonical(html, href) {
  const tag = `<link rel="canonical" href="${href}">`;
  return /<link\s+rel="canonical"\s+href="[^"]*"\s*?>/i.test(html)
    ? html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*?>/i, tag)
    : injectBeforeHeadEnd(html, `${tag}\n`);
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

async function writeRouteHtml(routePath, html) {
  const targetPath = routePath === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, ...routePath.slice(1).split('/'), 'index.html');
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, html, 'utf8');
}

async function writeSitemap(pages) {
  const seen = new Set();
  const uniquePages = pages.filter((page) => {
    const locPath = page.routePath === '/' ? '/' : page.canonicalPath;
    if (!locPath.startsWith('/fr') && seen.has(locPath)) {
      return false;
    }
    if (!locPath.startsWith('/fr')) {
      seen.add(locPath);
    }
    return !locPath.startsWith('/fr');
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniquePages
    .map((page) => {
      const locPath = page.routePath === '/' ? '/' : page.canonicalPath;
      const rules = page.sitemap || STATIC_SITEMAP_RULES[locPath] || {
        lastmod: '2026-04-18',
        changefreq: page.type === 'article' ? 'weekly' : 'monthly',
        priority: page.type === 'article' ? '0.85' : '0.6',
      };

      return `  <url>\n    <loc>${SITE_ORIGIN}${locPath}</loc>\n    <lastmod>${rules.lastmod}</lastmod>\n    <changefreq>${rules.changefreq}</changefreq>\n    <priority>${rules.priority}</priority>\n  </url>`;
    })
    .join('\n')}\n</urlset>\n`;

  await rm(path.join(distDir, 'sitemap.xml'), { force: true });
  await writeFile(path.join(distDir, 'sitemap-static.xml'), xml, 'utf8');
}

function toEnglishPath(routePath) {
  if (routePath === '/fr') {
    return '/home';
  }
  return routePath.startsWith('/fr/') ? routePath.slice(3) || '/home' : routePath;
}

function toFrenchPath(routePath) {
  return routePath === '/home' ? '/fr/home' : routePath.startsWith('/fr/') ? routePath : `/fr${routePath}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}