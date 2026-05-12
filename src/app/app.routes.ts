import { Routes } from '@angular/router';
import { roleCanMatch } from './core/role.canmatch';
import { authenticatedGuard } from './core/auth-guard';
import { programLearnerGuard } from './core/program-learner.guard';
import { programAdminAreaCanMatch } from './features/program-admin/guards/program-admin.guard';
import { isOrgAdminGuard } from './core/organization/org.guards';
import { adminSecurityCanMatch } from './core/security/admin-security.guard';

const MARKETING_DEFAULT_IMAGE =
  'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png';

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

const HOME_STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Innovacare Training',
    url: 'https://www.innovacarereview.com/home',
    description:
      'Premium NCLEX, nursing, medical and IT learning experiences for learners and institutions.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Innovacare Training',
    url: 'https://www.innovacarereview.com/home',
    description:
      'Innovacare Training builds premium exam-prep and cohort learning experiences for healthcare and technical education.',
  },
];

const HOME_STRUCTURED_DATA_FR = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Innovacare Training',
    url: 'https://www.innovacarereview.com/fr/home',
    description:
      'Parcours premium de préparation NCLEX, soins infirmiers, médical et IT pour les apprenants et les institutions.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Innovacare Training',
    url: 'https://www.innovacarereview.com/fr/home',
    description:
      'Innovacare Training conçoit des expériences premium de préparation aux examens et de formation en cohorte pour la santé et la formation technique.',
  },
];

function marketingSeo(locale: 'en' | 'fr') {
  const french = locale === 'fr';
  const prefix = french ? '/fr' : '';

  return {
    home: {
      title: french ? 'Préparation premium NCLEX, soins infirmiers, médical et IT' : 'Premium NCLEX, Nursing, Medical and IT Training',
      description: french
        ? 'Innovacare Training aide les apprenants et les institutions à lancer des parcours premium en NCLEX, soins infirmiers, médical et IT avec une expérience éducative pensée pour la conversion.'
        : 'Innovacare Training helps learners and institutions launch premium NCLEX, nursing, medical and IT training journeys with conversion-ready education experiences.',
      canonicalPath: `${prefix}/home`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'cours infirmiers', 'programmes médicaux', 'cours IT', 'plateforme de formation']
        : [...CORE_NURSING_KEYWORDS_EN, 'nursing courses', 'medical programs', 'IT courses', 'training platform'],
      structuredData: french ? HOME_STRUCTURED_DATA_FR : HOME_STRUCTURED_DATA,
    },
    courses: {
      title: french ? 'Catalogue de cours pour le NCLEX et la préparation clinique' : 'Course Catalogue for NCLEX and Clinical Readiness',
      description: french
        ? 'Explorez les cours publics Innovacare pour le NCLEX, les soins infirmiers et la préparation clinique dans une expérience catalogue premium pensée pour la découverte et la conversion.'
        : 'Explore Innovacare public courses for NCLEX, nursing and clinical readiness with a premium catalogue experience built for discovery and conversion.',
      canonicalPath: `${prefix}/courses`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'catalogue de cours', 'cours NCLEX', 'révision clinique', 'formation infirmière']
        : [...CORE_NURSING_KEYWORDS_EN, 'course catalogue', 'NCLEX courses', 'clinical review', 'nursing education'],
    },
    catalogue: {
      title: french ? 'Catalogue de cours pour le NCLEX et la préparation clinique' : 'Course Catalogue for NCLEX and Clinical Readiness',
      description: french
        ? 'Parcourez les programmes Innovacare dans un catalogue public premium couvrant le NCLEX, les soins infirmiers et les parcours de préparation clinique.'
        : 'Browse Innovacare programs in a premium public catalogue spanning NCLEX, nursing and clinical readiness pathways.',
      canonicalPath: `${prefix}/catalogue`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'catalogue de cours', 'catalogue NCLEX', 'cours cliniques', 'programmes publics']
        : [...CORE_NURSING_KEYWORDS_EN, 'course catalogue', 'NCLEX catalogue', 'clinical courses', 'public programs'],
    },
    blog: {
      title: french ? 'Blog NCLEX et stratégie d’apprentissage' : 'NCLEX and Learning Strategy Blog',
      description: french
        ? 'Lisez les articles Innovacare sur les plans d’étude NCLEX, la rétention des apprenants, l’analytique de cohorte et la transition entre formation et carrière.'
        : 'Read Innovacare articles on NCLEX study plans, learner retention, cohort analytics and education-to-career strategy.',
      canonicalPath: `${prefix}/blog`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'blog NCLEX', 'stratégie d’étude', 'analytique de cohorte', 'rétention apprenants']
        : [...CORE_NURSING_KEYWORDS_EN, 'NCLEX blog', 'study strategy', 'cohort analytics', 'learner retention'],
    },
    blogArticle: {
      title: french ? 'Article de blog Innovacare' : 'Innovacare Blog Article',
      description: french
        ? 'Consultez les analyses Innovacare sur la préparation aux examens, l’apprentissage social, la croissance institutionnelle et la confiance des apprenants.'
        : 'Read detailed Innovacare insights on exam readiness, social learning, institutional growth and learner confidence.',
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'blog formation infirmière', 'préparation carrière infirmière']
        : [...CORE_NURSING_KEYWORDS_EN, 'nursing education blog', 'nurse career preparation'],
    },
    testimonials: {
      title: french ? 'Témoignages et réussites apprenants et institutions' : 'Learner and Institution Success Stories',
      description: french
        ? 'Découvrez des témoignages, réussites apprenants et résultats institutionnels qui montrent comment Innovacare construit la confiance avant l’inscription et la valeur après le lancement.'
        : 'Discover testimonials, learner wins and institutional outcomes that show how Innovacare builds trust before enrollment and value after launch.',
      canonicalPath: `${prefix}/testimonials`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'témoignages', 'success stories', 'avis apprenants', 'preuve sociale']
        : [...CORE_NURSING_KEYWORDS_EN, 'testimonials', 'success stories', 'learner reviews', 'social proof'],
    },
    medicalProgram: {
      title: french ? 'Programme médical et préparation clinique' : 'Medical and Clinical Readiness Program',
      description: french
        ? 'Explorez les programmes médicaux et de préparation clinique Innovacare conçus pour les apprenants avancés en soins infirmiers, la diffusion facultaire et les cohortes.'
        : 'Explore Innovacare medical and clinical readiness programs designed for advanced nursing learners, faculty delivery and cohort deployment.',
      canonicalPath: `${prefix}/medical-program`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'programme médical', 'préparation clinique', 'révision infirmière avancée']
        : [...CORE_NURSING_KEYWORDS_EN, 'medical program', 'clinical readiness', 'advanced nursing review'],
    },
    cme: {
      title: french ? 'Formation médicale continue (CME) — Créditée ACCME' : 'Continuing Medical Education (CME) — ACCME Accredited',
      description: french
        ? 'Obtenez vos crédits CME avec Innovacare. Plus de 120 cours accrédités ACCME en 40+ spécialités médicales. Certificats instantanés, conformité MOC, webinaires en direct.'
        : 'Earn your CME credits with Innovacare. 120+ ACCME-accredited courses across 40+ medical specialties. Instant certificates, MOC compliance, and live webinars.',
      canonicalPath: `${prefix}/cme`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['formation médicale continue', 'crédits CME', 'ACCME', 'AMA PRA Category 1', 'webinaires médicaux', 'renouvellement licence']
        : ['continuing medical education', 'CME credits', 'ACCME accredited', 'AMA PRA Category 1', 'medical webinars', 'license renewal'],
    },
    preNursing: {
      title: french ? 'Préparation pré-infirmière — TEAS 7 & HESI A2' : 'Pre-Nursing Prep — TEAS 7 & HESI A2',
      description: french
        ? `Préparez les tests d'admission infirmiers TEAS 7 et HESI A2 avec Innovacare — Q-bank adaptatif, plans d'étude et simulation d'examen.`
        : 'Ace TEAS 7 and HESI A2 nursing admission tests with Innovacare — adaptive Q-bank, study plans and exam simulation.',
      canonicalPath: `${prefix}/pre-nursing`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['préparation pré-infirmière', 'TEAS 7', 'HESI A2', 'admission infirmière', 'test d\'entrée infirmier']
        : ['pre-nursing prep', 'TEAS 7 prep', 'HESI A2 prep', 'nursing admission test', 'ATI TEAS study'],
    },
    nclexRn: {
      title: french ? 'Préparation NCLEX-RN® — Taux de réussite 98,98 %' : 'NCLEX-RN® Prep — 98.98% First-Attempt Pass Rate',
      description: french
        ? `Réussissez le NCLEX-RN® du premier coup avec l'IA adaptative d'Innovacare, plus de 6 000 questions NGN et des sessions d'étude en direct.`
        : 'Pass NCLEX-RN® on the first attempt with Innovacare\'s adaptive AI engine, 6,000+ NGN-style questions and live study sessions.',
      canonicalPath: `${prefix}/nclex-rn`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['NCLEX-RN', 'préparation NCLEX', 'révision infirmière', 'questions NGN', 'NCSBN']
        : ['NCLEX-RN prep', 'NCLEX review', 'nursing board exam', 'NGN questions', 'NCSBN'],
    },
    nclexPn: {
      title: french ? 'Préparation NCLEX-PN® — Devenez infirmier auxiliaire autorisé' : 'NCLEX-PN® Prep — Pass Your LPN/LVN Licensing Exam',
      description: french
        ? `Préparez l'examen NCLEX-PN® avec 4 000 questions calibrées, des simulations d'examen et un suivi de progression par domaine client.`
        : 'Prepare for NCLEX-PN® with 4,000 calibrated questions, exam simulations and client-needs domain tracking.',
      canonicalPath: `${prefix}/nclex-pn`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['NCLEX-PN', 'infirmier auxiliaire', 'LPN', 'LVN', 'préparation examen infirmier']
        : ['NCLEX-PN prep', 'LPN exam prep', 'LVN licensing exam', 'practical nurse board exam'],
    },
    nursePractitioner: {
      title: french ? 'Préparation certification Infirmier Praticien — FNP, AGNP, PMHNP' : 'Nurse Practitioner Certification Prep — FNP, AGNP, PMHNP',
      description: french
        ? 'Préparez les certifications FNP, AGNP et PMHNP avec Innovacare — 5 000+ questions spécialisées, cas cliniques et coaching par des experts.'
        : 'Prep for FNP, AGNP and PMHNP certifications with 5,000+ specialty questions, clinical case vignettes and expert coaching.',
      canonicalPath: `${prefix}/nurse-practitioner`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['infirmier praticien', 'FNP', 'AGNP', 'PMHNP', 'certification infirmière avancée']
        : ['nurse practitioner prep', 'FNP certification', 'AGNP exam', 'PMHNP board', 'NP board review'],
    },
    nursingSchool: {
      title: french ? 'Compagnon d\'études pour école d\'infirmières' : 'Nursing School Study Companion — Succeed From Day One',
      description: french
        ? `Réussissez chaque cours et chaque examen d'école d'infirmières avec les flashcards, les quiz de pathologie et la simulation ATI/HESI d'Innovacare.`
        : 'Succeed in every nursing school course and exam with Innovacare\'s pharmacology flashcards, pathophysiology quizzes and ATI/HESI simulation.',
      canonicalPath: `${prefix}/nursing-school`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['école d\'infirmières', 'études infirmières', 'pharmacologie infirmière', 'simulation ATI', 'simulation HESI']
        : ['nursing school prep', 'nursing student study', 'pharmacology flashcards', 'ATI simulation', 'HESI simulation'],
    },
    ccrn: {
      title: french ? 'Préparation certification CCRN® Soins Intensifs' : 'CCRN® Critical Care Certification Prep',
      description: french
        ? `Obtenez votre certification CCRN® du premier coup avec 4 500 questions de soins intensifs, des simulations de cas et un suivi par système d'organes.`
        : 'Earn your CCRN® on the first attempt with 4,500 critical care questions, case simulations and organ-system progress tracking.',
      canonicalPath: `${prefix}/ccrn`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['CCRN', 'soins intensifs', 'certification soins critiques', 'AACN', 'infirmière USI']
        : ['CCRN prep', 'critical care nursing', 'AACN certification', 'ICU nurse exam', 'critical care certification'],
    },
    usmle: {
      title: french ? 'Préparation USMLE® Steps 1, 2 & 3' : 'USMLE® Steps 1, 2 CK & 3 — Score in the 99th Percentile',
      description: french
        ? 'Préparez les USMLE Steps 1, 2 CK et 3 avec un Q-bank adaptatif de 8 000 questions, une répétition espacée et des simulations CCS.'
        : 'Prep for USMLE Steps 1, 2 CK and 3 with 8,000+ adaptive questions, spaced repetition and full CCS case simulations.',
      canonicalPath: `${prefix}/usmle`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['USMLE', 'Step 1', 'Step 2 CK', 'Step 3', 'Q-bank médical', 'boards médecine']
        : ['USMLE prep', 'Step 1 review', 'Step 2 CK prep', 'Step 3 prep', 'NBME board prep'],
    },
    comlex: {
      title: french ? 'Préparation COMLEX-USA® — Niveaux 1, 2 & 3 avec OMM' : 'COMLEX-USA® DO Board Prep — Levels 1, 2 & 3 with OMM',
      description: french
        ? `Préparez COMLEX-USA® avec la bibliothèque OMM 3D, 7 000 questions et le mode double préparation COMLEX + USMLE d'Innovacare.`
        : 'Prepare for COMLEX-USA® with Innovacare\'s 3D OMM technique library, 7,000 questions and dual COMLEX + USMLE prep mode.',
      canonicalPath: `${prefix}/comlex`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['COMLEX', 'COMLEX-USA', 'médecine ostéopathique', 'OMM', 'NBOME', 'DO boards']
        : ['COMLEX prep', 'COMLEX-USA review', 'osteopathic board exam', 'OMM prep', 'DO board review'],
    },
    pance: {
      title: french ? 'Préparation PANCE / PANRE® — Certification Assistant Médical' : 'PANCE / PANRE® PA Exam Prep — Pass First Time',
      description: french
        ? `Préparez le PANCE et le PANRE avec 5 000 questions alignées NCCPA, un suivi par système d'organes et 25 crédits CME AAPA Catégorie 1.`
        : 'Prepare for PANCE and PANRE with 5,000 NCCPA-aligned questions, organ-system tracking and 25 AAPA Category 1 CME credits included.',
      canonicalPath: `${prefix}/pance`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['PANCE', 'PANRE', 'assistant médical', 'PA boards', 'NCCPA', 'certification PA']
        : ['PANCE prep', 'PANRE review', 'physician assistant exam', 'NCCPA board prep', 'PA certification'],
    },
    educatorsNclex: {
      title: french ? 'Pour les éducateurs NCLEX — Outils pour faculté' : 'For NCLEX Educators — Faculty Analytics & Tools',
      description: french
        ? 'Analytics de classe en temps réel, générateur de banque de tests personnalisés et intégration LMS pour améliorer les taux de réussite au NCLEX de votre programme.'
        : 'Real-time class analytics, custom test bank builder and LMS integration to improve your program\'s NCLEX pass rates.',
      canonicalPath: `${prefix}/educators-nclex`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['outils faculté NCLEX', 'analytics classe infirmière', 'LMS infirmier', 'formation infirmière institutionnelle']
        : ['NCLEX educator tools', 'nursing faculty analytics', 'nursing LMS', 'institutional nursing training'],
    },
    educatorsNursingSchool: {
      title: french ? `Pour les écoles d'infirmières — Outils curriculaires` : 'For Nursing Schools — Curriculum Alignment & Cohort Tools',
      description: french
        ? 'Cartographie curriculaire, gestion des cohortes, prédicteur de réussite NCLEX et support accréditation ACEN/CCNE pour les programmes de soins infirmiers.'
        : 'Curriculum mapping, cohort management, NCLEX readiness predictor and ACEN/CCNE accreditation support for nursing programs.',
      canonicalPath: `${prefix}/educators-nursing-school`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [`école d'infirmières`, 'cartographie curriculaire', 'gestion cohortes', 'accréditation ACEN', 'CCNE']
        : ['nursing school platform', 'curriculum mapping', 'cohort management', 'ACEN accreditation', 'CCNE nursing'],
    },
    itCourses: {
      title: french ? 'Cours IT en cloud, DevOps et cybersécurité' : 'IT Courses in Cloud, DevOps and Cybersecurity',
      description: french
        ? 'Développez la demande pour une formation IT premium avec Innovacare autour du cloud, du DevOps et des fondamentaux cybersécurité.'
        : 'Launch demand for premium IT training with Innovacare courses in cloud platforms, DevOps delivery and cybersecurity fundamentals.',
      canonicalPath: `${prefix}/it-courses`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['cours IT', 'formation cloud', 'formation DevOps', 'cours cybersécurité', 'montée en compétences techniques']
        : ['IT courses', 'cloud training', 'DevOps training', 'cybersecurity courses', 'technical upskilling'],
    },
    contact: {
      title: french ? 'Contacter Innovacare Training' : 'Contact Innovacare Training',
      description: french
        ? 'Échangez avec Innovacare sur l’accompagnement apprenant, la tarification institutionnelle, l’onboarding des cohortes et les partenariats.'
        : 'Talk with Innovacare about learner support, institutional pricing, cohort onboarding and partnership opportunities.',
      canonicalPath: `${prefix}/contact`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'contacter Innovacare', 'support formation', 'onboarding cohortes']
        : [...CORE_NURSING_KEYWORDS_EN, 'contact Innovacare', 'training support', 'cohort onboarding'],
    },
    pricing: {
      title: french ? 'Tarifs pour apprenants et institutions' : 'Pricing for Learners and Institutions',
      description: french
        ? 'Comparez les tarifs Innovacare pour l’autoformation, la préparation accélérée aux examens et les licences de cohorte prêtes pour les institutions.'
        : 'Compare Innovacare pricing for self-study learners, accelerated exam prep and institution-ready cohort licensing.',
      canonicalPath: `${prefix}/pricing`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'tarifs', 'tarif NCLEX', 'licence institutionnelle', 'tarif cohorte']
        : [...CORE_NURSING_KEYWORDS_EN, 'pricing', 'NCLEX pricing', 'institutional licensing', 'cohort pricing'],
    },
    socialLearning: {
      title: french ? 'Innovacare Review - communautes d apprentissage social pour NCLEX, FNP, TEAS et medical' : 'Innovacare Review Social Learning Communities for NCLEX, FNP, TEAS and Medical',
      description: french
        ? 'Rejoignez les communautes Innovacare Review sur NCLEX, FNP, TEAS 7 et medical pour etudier avec vos pairs, suivre les meilleurs conseils et garder un rythme regulier.'
        : 'Join Innovacare Review social learning communities for NCLEX, FNP, TEAS 7 and medical study to stay accountable, study with peers and keep momentum high.',
      canonicalPath: `${prefix}/social-learning`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['innovacare review', 'apprentissage social', 'communaute NCLEX', 'groupe etude infirmier', 'communaute FNP', 'TEAS 7']
        : ['Innovacare Review', 'social learning', 'NCLEX community', 'nursing study group', 'FNP community', 'TEAS 7 prep'],
    },
    features: {
      title: french ? 'Fonctionnalités plateforme pour la croissance et la préparation' : 'Platform Features for Growth and Readiness',
      description: french
        ? 'Découvrez comment Innovacare combine apprentissage adaptatif, boucles sociales, analytics et UX orientée conversion sur une seule plateforme.'
        : 'See how Innovacare combines adaptive learning, social learning loops, analytics and conversion-ready UX in one platform.',
      canonicalPath: `${prefix}/fonctionnalites`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? [...CORE_NURSING_KEYWORDS_FR, 'fonctionnalités plateforme', 'apprentissage adaptatif', 'analytics cohorte']
        : [...CORE_NURSING_KEYWORDS_EN, 'platform features', 'adaptive learning', 'cohort analytics'],
    },
    forEducators: {
      title: french ? 'Pour les éducateurs — Tableau de bord institution & démo' : 'For Educators — Institution Dashboard, Analytics & Demo',
      description: french
        ? 'Boostez les taux de réussite NCLEX de votre programme avec Innovacare Review. Tableau de bord en temps réel, remédiation des lacunes et tarification par siège pour votre institution.'
        : `Boost your nursing program's NCLEX pass rates with real-time student analytics, gap remediation tools and institution-ready seat-based pricing.`,
      canonicalPath: `${prefix}/for-educators`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['plateforme éducateurs', 'tableau de bord NCLEX institution', 'analytique étudiants infirmiers', 'démo Innovacare', 'licence institutionnelle']
        : ['nursing educator platform', 'NCLEX institution dashboard', 'nursing student analytics', 'Innovacare demo', 'institutional licensing'],
    },
    privateTutors: {
      title: french ? 'Tuteurs privés — Séances 1 pour 1 en soins infirmiers' : 'Private Tutors — Expert 1-on-1 Nursing Tutoring Sessions',
      description: french
        ? 'Réservez des séances de tutorat individuel avec des tuteurs infirmiers certifiés CCRN, CMSRN, RNC-OB et PMHN. Sujets NCLEX, pharmacologie, pathophysiologie et plus.'
        : 'Book 1-on-1 sessions with credentialed nursing tutors — CCRN, CMSRN, RNC-OB, PMHN-BC. NCLEX prep, pharmacology, pathophysiology, and clinical skills.',
      canonicalPath: `${prefix}/private-tutors`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['tuteur infirmier privé', 'tutorat NCLEX 1 pour 1', 'aide infirmière personnalisée', 'tuteur pharmacologie', 'tutorat soins infirmiers en ligne']
        : ['private nursing tutor', '1-on-1 NCLEX tutoring', 'personalized nursing help', 'pharmacology tutor', 'online nursing tutoring'],
    },
    globalNursePack: {
      title: french ? 'Pack de démarrage licence infirmière internationale' : 'Global Nurse Licensing Starter Pack',
      description: french
        ? 'Un pack premium pas à pas pour aider les infirmiers formés en Afrique à planifier leur parcours de licence vers les USA, le Canada et les Émirats arabes unis.'
        : 'A premium step-by-step digital pack for nurses in Africa planning their licensing journey toward the USA, Canada, and UAE.',
      canonicalPath: `${prefix}/global-nurse-pack`,
      image: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121388/ChatGPT_Image_6_mai_2026_22_34_37_od5ekz.png',
      keywords: french
        ? ['licence infirmière internationale', 'NCLEX', 'CGFNS', 'NNAS', 'DHA', 'DOH', 'migration infirmière']
        : ['international nurse licensing', 'NCLEX', 'CGFNS', 'NNAS', 'DHA', 'DOH', 'nurse relocation'],
    },
    languageTests: {
      title: french ? 'Préparation IELTS, TEF et OET pour immigration' : 'IELTS, TEF and OET Immigration Test Prep',
      description: french
        ? 'Landing page publique de préparation IELTS, TEF et OET avec accès rapide aux programmes et au paiement CinetPay.'
        : 'Public landing page for IELTS, TEF and OET prep with direct links to programs and CinetPay checkout flow.',
      canonicalPath: `${prefix}/tests-langue`,
      image: MARKETING_DEFAULT_IMAGE,
      keywords: french
        ? ['préparation IELTS', 'préparation TEF', 'préparation OET', 'tests de langue immigration', 'paiement CinetPay']
        : ['IELTS prep', 'TEF prep', 'OET prep', 'immigration language tests', 'CinetPay payment'],
    },
  };
}

function marketingChildren(locale: 'en' | 'fr'): Routes {
  const seo = marketingSeo(locale);

  return [
    {
      path: 'home',
      data: { seo: seo.home },
      loadComponent: () =>
        import('./features/publics/home/public-home.page').then((m) => m.PublicHomePage),
    },
    {
      path: 'courses',
      data: { seo: seo.courses },
      loadComponent: () =>
        import('./features/publics/courses/public-courses.page').then((m) => m.PublicCoursesPage),
    },
    {
      path: 'catalogue',
      data: { seo: seo.catalogue },
      loadComponent: () =>
        import('./features/publics/courses/public-courses.page').then((m) => m.PublicCoursesPage),
    },
    {
      path: 'blog',
      data: { seo: seo.blog },
      loadComponent: () =>
        import('./features/publics/blog/blog.page').then((m) => m.BlogPage),
    },
    {
      path: 'blog/:slug',
      data: { seo: seo.blogArticle },
      loadComponent: () =>
        import('./features/publics/blog-detail/blog-detail.page').then((m) => m.BlogDetailPage),
    },
    { path: 'blogs', pathMatch: 'full', redirectTo: 'blog' },
    { path: 'testimony', pathMatch: 'full', redirectTo: 'testimonials' },
    {
      path: 'testimonials',
      data: { seo: seo.testimonials },
      loadComponent: () =>
        import('./features/publics/testimonials/testimonials.page').then((m) => m.TestimonialsPage),
    },
    { path: 'medical-programs', pathMatch: 'full', redirectTo: 'medical-program' },
    {
      path: 'medical-program',
      data: { seo: seo.medicalProgram },
      loadComponent: () =>
        import('./features/publics/medical-program/medical-program.page').then((m) => m.MedicalProgramPage),
    },
    {
      path: 'cme',
      data: { seo: seo.cme },
      loadComponent: () =>
        import('./features/publics/cme/cme-landing.page').then((m) => m.CmeLandingPage),
    },
    {
      path: 'pre-nursing',
      data: { seo: seo.preNursing },
      loadComponent: () =>
        import('./features/publics/pre-nursing/pre-nursing.page').then((m) => m.PreNursingPage),
    },
    {
      path: 'nclex-rn',
      data: { seo: seo.nclexRn },
      loadComponent: () =>
        import('./features/publics/nclex-rn/nclex-rn.page').then((m) => m.NclexRnPage),
    },
    {
      path: 'nclex-pn',
      data: { seo: seo.nclexPn },
      loadComponent: () =>
        import('./features/publics/nclex-pn/nclex-pn.page').then((m) => m.NclexPnPage),
    },
    {
      path: 'nurse-practitioner',
      data: { seo: seo.nursePractitioner },
      loadComponent: () =>
        import('./features/publics/nurse-practitioner/nurse-practitioner.page').then((m) => m.NursePractitionerPage),
    },
    {
      path: 'nursing-school',
      data: { seo: seo.nursingSchool },
      loadComponent: () =>
        import('./features/publics/nursing-school/nursing-school.page').then((m) => m.NursingSchoolPage),
    },
    {
      path: 'ccrn',
      data: { seo: seo.ccrn },
      loadComponent: () =>
        import('./features/publics/ccrn/ccrn.page').then((m) => m.CcrnPage),
    },
    {
      path: 'usmle',
      data: { seo: seo.usmle },
      loadComponent: () =>
        import('./features/publics/usmle/usmle.page').then((m) => m.UsmlePage),
    },
    {
      path: 'comlex',
      data: { seo: seo.comlex },
      loadComponent: () =>
        import('./features/publics/comlex/comlex.page').then((m) => m.ComlexPage),
    },
    {
      path: 'pance',
      data: { seo: seo.pance },
      loadComponent: () =>
        import('./features/publics/pance/pance.page').then((m) => m.PancePage),
    },
    {
      path: 'educators-nclex',
      data: { seo: seo.educatorsNclex },
      loadComponent: () =>
        import('./features/publics/educators-nclex/educators-nclex.page').then((m) => m.EducatorsNclexPage),
    },
    {
      path: 'educators-nursing-school',
      data: { seo: seo.educatorsNursingSchool },
      loadComponent: () =>
        import('./features/publics/educators-nursing-school/educators-nursing-school.page').then((m) => m.EducatorsNursingSchoolPage),
    },
    {
      path: 'it-courses',
      data: { seo: seo.itCourses },
      loadComponent: () =>
        import('./features/publics/it-courses/it-courses.page').then((m) => m.ItCoursesPage),
    },
    {
      path: 'contact',
      data: { seo: seo.contact },
      loadComponent: () =>
        import('./features/publics/contact/contact.page').then((m) => m.ContactPage),
    },
    {
      path: 'terms',
      loadComponent: () =>
        import('./features/publics/legal/legal-document.page').then((m) => m.LegalDocumentPage),
      data: { document: 'terms' },
    },
    {
      path: 'privacy',
      loadComponent: () =>
        import('./features/publics/legal/legal-document.page').then((m) => m.LegalDocumentPage),
      data: { document: 'privacy' },
    },
    {
      path: 'pricing',
      data: { seo: seo.pricing },
      loadComponent: () =>
        import('./features/publics/pricing-modern/pricing-modern.page').then((m) => m.PricingModernPage),
    },
    {
      path: 'social-learning',
      data: { seo: seo.socialLearning },
      loadComponent: () =>
        import('./features/publics/social-learning/social-learning.page').then((m) => m.SocialLearningPage),
    },
    {
      path: 'fonctionnalites',
      data: { seo: seo.features },
      loadComponent: () =>
        import('./features/publics/features-modern/features-modern.page').then((m) => m.FeaturesModernPage),
    },
    {
      path: 'for-educators',
      data: { seo: seo.forEducators },
      loadChildren: () =>
        import('./features/publics/for-educators/for-educators.routes').then(
          (m) => m.FOR_EDUCATORS_ROUTES,
        ),
    },
    {
      path: 'private-tutors',
      data: { seo: seo.privateTutors },
      loadChildren: () =>
        import('./features/publics/private-tutors/private-tutors.routes').then(
          (m) => m.PRIVATE_TUTORS_ROUTES,
        ),
    },
    {
      path: 'global-nurse-pack',
      data: { seo: seo.globalNursePack },
      loadComponent: () =>
        import('./features/publics/global-nurse-pack/global-nurse-pack.component').then(
          (m) => m.GlobalNursePackComponent,
        ),
    },
    {
      path: 'tests-langue',
      data: { seo: seo.languageTests },
      loadComponent: () =>
        import('./features/publics/language-tests/language-tests-landing.page').then(
          (m) => m.LanguageTestsLandingPage,
        ),
    },
    {
      path: 'language-tests',
      pathMatch: 'full',
      redirectTo: 'tests-langue',
    },
  ];
}


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/home' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.LoginComponent)
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.LoginComponent)
  },

  {
    path: 'learner/courses/:courseId/exam/:examId',
    loadComponent: () =>
      import('./features/learner/exam-runner/exam-runner')
        .then(m => m.ExamRunnerComponent),
  },

  {
    path: 'reset',
    loadComponent: () =>
      import('./features/auth/reset/reset').then(m => m.ResetComponent)
  },

  {
    path: 'admin-spaces',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/auth/admin-space-selector/admin-space-selector.page').then(
        (m) => m.AdminSpaceSelectorPage
      ),
  },

  {
    path: 'learner',
    canMatch: [roleCanMatch(['learner'])],
    loadChildren: () =>
      import('./features/learner/learner.routes').then(m => m.learnerRoutes)
  },

  {
    path: 'manager',
    canMatch: [roleCanMatch(['admin', 'manager'])],
    loadChildren: () =>
      import('./features/manager/manager.routes').then(m => m.ManagerRoutingModule)
  },

  {
    path: 'staff',
    canMatch: [roleCanMatch(['instructor', 'tutor', 'staff', 'super_admin'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/staff/staff-dashboard.page').then(m => m.StaffDashboardPage),
      },
    ],
  },

  {
    path: 'super-admin',
    canMatch: [roleCanMatch(['super_admin'])],
    loadChildren: () =>
        import('./features/superAdmin/super-admin.routes').then(m => m.SUPER_ADMIN_ROUTES)
    },

  {
    path: 'org-admin',
    canMatch: [isOrgAdminGuard],
    loadChildren: () =>
      import('./features/org-admin/org-admin.routes').then((m) => m.ORG_ADMIN_ROUTES),
  },

  {
    path: 'programs',
    loadChildren: () =>
      import('./features/publics/programs/programs.routes').then(
        (m) => m.PROGRAMS_ROUTES
      ),
  },
  {
    path: 'programs/public/:id',
    loadComponent: () =>
      import('./features/publics/programs/public-program-page.component').then(
        (m) => m.PublicProgramPageComponent
      ),
  },
  // ── Archer Exam Engine — blank page, no shell ──────────────────────────────
  {
    path: 'exam',
    loadComponent: () =>
      import('./features/exam-engine/archer-exam-engine.component').then(
        (m) => m.ArcherExamEngineComponent
      ),
  },
  {
    path: 'exam/:mode',
    loadComponent: () =>
      import('./features/exam-engine/archer-exam-engine.component').then(
        (m) => m.ArcherExamEngineComponent
      ),
  },
  {
    path: 'quiz/:moduleId',
    loadChildren: () =>
      import('./features/quiz/quiz.routes').then((m) => m.QUIZ_ROUTES),
  },
  {
    path: 'my-programs',
    canActivate: [authenticatedGuard, programLearnerGuard],
    loadComponent: () =>
      import('./features/publics/programs/my-program-enrollments-page.component').then(
        (m) => m.MyProgramEnrollmentsPageComponent
      ),
  },
  {
    path: 'my-programs/:programId',
    canActivate: [authenticatedGuard, programLearnerGuard],
    loadChildren: () =>
      import('./features/publics/programs/learner-space/learner-space.routes').then(
        (m) => m.LEARNER_SPACE_ROUTES
      ),
  },
  {
    path: 'program-admin',
    canMatch: [programAdminAreaCanMatch],
    loadChildren: () =>
      import('./features/program-admin/program-admin.routes').then(
        (m) => m.PROGRAM_ADMIN_ROUTES
      ),
  },
  {
    path: 'africa-mode',
    canMatch: [programAdminAreaCanMatch],
    loadComponent: () =>
      import('./features/program-admin/africa-mode/africa-quick-launch.component').then(
        (m) => m.AfricaQuickLaunchComponent
      ),
  },
  {
    path: 'admin',
    canMatch: [roleCanMatch(['super_admin', 'admin', 'manager'])],
    loadChildren: () =>
      import('./features/manager/manager.routes').then((m) => m.ManagerRoutingModule),
  },
   {
    path: 'catalogue/:id',
    loadComponent: () =>
      import('./features/publics/course-detail-page/course-detail-page').then(
        (m) => m.CourseDetailPage
      ),
  },
 {
  path: 'guest',
  loadChildren: () =>
    import('./features/guest/guest.routes').then((m) => m.GUEST_ROUTES),
},
{
  path: 'checkout/success',
  loadComponent: () =>
    import('./features/publics/checkout/checkout-success.component').then(m => m.CheckoutSuccessComponent),
},
{
  path: 'checkout/cancel',
  loadComponent: () =>
    import('./features/publics/checkout/checkout-cancel.component').then(m => m.CheckoutCancelComponent),
},
{
  path: 'cart',
  canActivate: [authenticatedGuard],
  loadComponent: () =>
    import('./features/publics/cart/cart-page.component').then(m => m.CartPageComponent),
},
{
  path: 'my-account/notification-preferences',
  canActivate: [authenticatedGuard],
  loadComponent: () =>
    import('./features/account/notification-preferences/notification-preferences.page').then(
      (m) => m.NotificationPreferencesPage
    ),
},
{
  path: 'admin/notification-logs',
  canMatch: [roleCanMatch(['super_admin', 'admin', 'manager'])],
  loadComponent: () =>
    import('./features/admin/notification-logs/admin-notification-logs.page').then(
      (m) => m.AdminNotificationLogsPage
    ),
},
{
  path: 'admin/security',
  canMatch: [adminSecurityCanMatch],
  loadComponent: () =>
    import('./features/admin/security/admin-security-dashboard.page').then(
      (m) => m.AdminSecurityDashboardPage
    ),
},
{
  path: 'admin/analytics/shares',
  canMatch: [adminSecurityCanMatch],
  loadComponent: () =>
    import('./features/admin/analytics/admin-share-analytics.page').then(
      (m) => m.AdminShareAnalyticsPage
    ),
},
{
  // Public certificate verification — anyone can hit this URL with a code,
  // no auth required. Backend rate-limits per IP.
  path: 'certificates/verify/:code',
  loadComponent: () =>
    import('./features/public/certificates/certificate-verify.page').then(
      (m) => m.CertificateVerifyPage
    ),
},

{
  path: '',
  loadComponent: () =>
    import('./shared/marketing/marketing-shell.component').then((m) => m.MarketingShellComponent),
  children: marketingChildren('en'),
},
{
  path: 'fr',
  loadComponent: () =>
    import('./shared/marketing/marketing-shell.component').then((m) => m.MarketingShellComponent),
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    ...marketingChildren('fr'),
  ],
},

  { path: '**', redirectTo: '/home' }
];