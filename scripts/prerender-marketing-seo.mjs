import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_ORIGIN = 'https://www.innovacarereview.com';
const SITE_NAME = 'Innovacare Training';
const DEFAULT_IMAGE =
  'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775876293/8B3AC2EB-D700-4446-8E63-CFC050AB7704_aj4s69.png';
const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large';

const HOME_STRUCTURED_DATA = [
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
];

const MARKETING_PAGES = [
  {
    routePath: '/',
    canonicalPath: '/home',
    title: 'Premium NCLEX, Nursing, Medical and IT Training',
    description:
      'Innovacare Training helps learners and institutions launch premium NCLEX, nursing, medical and IT training journeys with conversion-ready education experiences.',
    keywords: ['NCLEX prep', 'nursing courses', 'medical programs', 'IT courses', 'training platform'],
    structuredData: HOME_STRUCTURED_DATA,
  },
  {
    routePath: '/home',
    canonicalPath: '/home',
    title: 'Premium NCLEX, Nursing, Medical and IT Training',
    description:
      'Innovacare Training helps learners and institutions launch premium NCLEX, nursing, medical and IT training journeys with conversion-ready education experiences.',
    keywords: ['NCLEX prep', 'nursing courses', 'medical programs', 'IT courses', 'training platform'],
    structuredData: HOME_STRUCTURED_DATA,
  },
  {
    routePath: '/courses',
    canonicalPath: '/courses',
    title: 'Course Catalogue for NCLEX and Clinical Readiness',
    description:
      'Explore Innovacare public courses for NCLEX, nursing and clinical readiness with a premium catalogue experience built for discovery and conversion.',
    keywords: ['course catalogue', 'NCLEX courses', 'clinical review', 'public courses', 'nursing education'],
  },
  {
    routePath: '/catalogue',
    canonicalPath: '/courses',
    title: 'Course Catalogue for NCLEX and Clinical Readiness',
    description:
      'Browse Innovacare programs in a premium public catalogue spanning NCLEX, nursing and clinical readiness pathways.',
    keywords: ['course catalogue', 'NCLEX catalogue', 'clinical courses', 'public programs'],
  },
  {
    routePath: '/blog',
    canonicalPath: '/blog',
    title: 'NCLEX and Learning Strategy Blog',
    description:
      'Read Innovacare articles on NCLEX study plans, learner retention, cohort analytics and education-to-career strategy.',
    keywords: ['NCLEX blog', 'study strategy', 'education marketing', 'cohort analytics', 'learner retention'],
  },
  {
    routePath: '/testimonials',
    canonicalPath: '/testimonials',
    title: 'Learner and Institution Success Stories',
    description:
      'Discover testimonials, learner wins and institutional outcomes that show how Innovacare builds trust before enrollment and value after launch.',
    keywords: ['testimonials', 'success stories', 'learner reviews', 'institutional proof', 'social proof'],
  },
  {
    routePath: '/medical-program',
    canonicalPath: '/medical-program',
    title: 'Medical and Clinical Readiness Program',
    description:
      'Explore Innovacare medical and clinical readiness programs designed for advanced nursing learners, faculty delivery and cohort deployment.',
    keywords: ['medical program', 'clinical readiness', 'advanced nursing review', 'faculty-led training'],
  },
  {
    routePath: '/it-courses',
    canonicalPath: '/it-courses',
    title: 'IT Courses in Cloud, DevOps and Cybersecurity',
    description:
      'Launch demand for premium IT training with Innovacare courses in cloud platforms, DevOps delivery and cybersecurity fundamentals.',
    keywords: ['IT courses', 'cloud training', 'DevOps training', 'cybersecurity courses', 'technical upskilling'],
  },
  {
    routePath: '/contact',
    canonicalPath: '/contact',
    title: 'Contact Innovacare Training',
    description:
      'Talk with Innovacare about learner support, institutional pricing, cohort onboarding and partnership opportunities.',
    keywords: ['contact Innovacare', 'institutional sales', 'training support', 'cohort onboarding'],
  },
  {
    routePath: '/pricing',
    canonicalPath: '/pricing',
    title: 'Pricing for Learners and Institutions',
    description:
      'Compare Innovacare pricing for self-study learners, accelerated exam prep and institution-ready cohort licensing.',
    keywords: ['pricing', 'NCLEX pricing', 'institutional licensing', 'cohort pricing'],
  },
  {
    routePath: '/fonctionnalites',
    canonicalPath: '/fonctionnalites',
    title: 'Platform Features for Growth and Readiness',
    description:
      'See how Innovacare combines adaptive learning, social learning loops, analytics and conversion-ready UX in one platform.',
    keywords: ['platform features', 'adaptive learning', 'cohort analytics', 'education platform'],
  },
];

const BLOG_POSTS = [
  {
    slug: 'nclex-study-plan-8-weeks',
    title: 'How to build an 8-week NCLEX study plan that actually sticks',
    excerpt:
      'A conversion-minded prep schedule using diagnostics, spaced repetition, and targeted simulation blocks.',
    publishedAt: '2026-04-02',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622326/D12A1509-BD77-4AF8-8D46-36CCEE440BC4_ctl46n.png',
    category: 'NCLEX',
  },
  {
    slug: 'why-social-learning-works',
    title: 'Why social learning improves retention for high-stakes exams',
    excerpt:
      'Peer accountability, streak mechanics, and discussion prompts can improve consistency more than passive review.',
    publishedAt: '2026-03-21',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622329/71EA67DD-9BAC-401A-A907-855E2E2297F7_ozf7vw.png',
    category: 'Study Skills',
  },
  {
    slug: 'from-exam-to-employment',
    title: 'From exam prep to employment: designing a smoother nursing transition',
    excerpt:
      'The best NCLEX platforms now support confidence, onboarding, and career progression, not just question banks.',
    publishedAt: '2026-03-07',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775621955/ChatGPT_Image_8_avr._2026_00_15_15_zj9cjr.png',
    category: 'Career',
  },
  {
    slug: 'cohort-analytics-for-educators',
    title: 'What educators should track before a cohort falls behind',
    excerpt:
      'A simple analytics framework for spotting disengagement, remediation gaps, and underused prep resources.',
    publishedAt: '2026-02-26',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622329/3AB0EC16-DEE3-4198-AD16-3F74FF0DCEAB_j85tzf.png',
    category: 'Educators',
  },
  {
    slug: 'nclex-test-day-prep',
    title: 'Test-day preparation checklist for NCLEX confidence',
    excerpt:
      'A tactical walkthrough for the last 72 hours before the exam, including pacing and mental load management.',
    publishedAt: '2026-02-12',
    image:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1774998911/ChatGPT_Image_31_mars_2026_19_13_12_pogn1o.png',
    category: 'NCLEX',
  },
  {
    slug: 'institutional-buying-guide',
    title: 'A practical buying guide for schools evaluating NCLEX prep platforms',
    excerpt:
      'What to look for in multi-tenant reporting, learner onboarding, and conversion from website to LMS.',
    publishedAt: '2026-01-18',
    image: DEFAULT_IMAGE,
    category: 'Educators',
  },
];

const distDir = path.join(process.cwd(), 'dist', 'myapp', 'browser');
const templatePath = path.join(distDir, 'index.html');

await main();

async function main() {
  const template = await readFile(templatePath, 'utf8');
  const pageDefinitions = [
    ...MARKETING_PAGES.map((page) => ({
      ...page,
      pagePath: page.routePath,
      type: 'website',
      image: DEFAULT_IMAGE,
    })),
    ...BLOG_POSTS.map((post) => ({
      routePath: `/blog/${post.slug}`,
      canonicalPath: `/blog/${post.slug}`,
      pagePath: `/blog/${post.slug}`,
      title: post.title,
      description: post.excerpt,
      keywords: ['Innovacare blog', post.category, 'exam readiness', 'learning strategy'],
      image: post.image,
      type: 'article',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        image: [post.image],
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        mainEntityOfPage: `${SITE_ORIGIN}/blog/${post.slug}`,
        author: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
      },
    })),
  ];

  for (const page of pageDefinitions) {
    const html = applySeo(template, page);
    await writeRouteHtml(page.routePath, html);
  }

  await writeSitemap();
}

function applySeo(template, page) {
  const fullTitle = page.title.includes(SITE_NAME) ? page.title : `${page.title} | ${SITE_NAME}`;
  const canonicalUrl = absoluteUrl(page.canonicalPath || page.pagePath);
  const currentUrl = absoluteUrl(page.pagePath);
  const description = page.description;
  const image = page.image || DEFAULT_IMAGE;
  const keywords = Array.isArray(page.keywords) ? page.keywords.filter(Boolean).join(', ') : '';
  const structuredData = Array.isArray(page.structuredData)
    ? page.structuredData
    : page.structuredData
      ? [page.structuredData]
      : [];

  let html = template;
  html = replaceTag(html, /<html lang="[^"]*">/i, '<html lang="en">');
  html = replaceTag(html, /<title>.*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  html = upsertNamedMeta(html, 'description', description);
  html = upsertNamedMeta(html, 'robots', DEFAULT_ROBOTS);
  html = keywords ? upsertNamedMeta(html, 'keywords', keywords) : removeNamedMeta(html, 'keywords');
  html = upsertNamedMeta(html, 'twitter:card', 'summary_large_image');
  html = upsertNamedMeta(html, 'twitter:title', fullTitle);
  html = upsertNamedMeta(html, 'twitter:description', description);
  html = upsertNamedMeta(html, 'twitter:image', image);
  html = upsertPropertyMeta(html, 'og:title', fullTitle);
  html = upsertPropertyMeta(html, 'og:description', description);
  html = upsertPropertyMeta(html, 'og:type', page.type || 'website');
  html = upsertPropertyMeta(html, 'og:url', currentUrl);
  html = upsertPropertyMeta(html, 'og:image', image);
  html = upsertPropertyMeta(html, 'og:site_name', SITE_NAME);
  html = upsertPropertyMeta(html, 'og:locale', 'en_US');
  html = upsertPropertyMeta(html, 'og:locale:alternate', 'fr_FR');
  html = upsertCanonical(html, canonicalUrl);
  html = removeGeneratedBlocks(html);
  html = injectBeforeHeadEnd(
    html,
    buildAlternateLinks(page.canonicalPath || page.pagePath) + buildStructuredDataScripts(structuredData)
  );

  return html;
}

function removeGeneratedBlocks(html) {
  return html
    .replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+" data-seo-hreflang="true">/gi, '')
    .replace(/\s*<script type="application\/ld\+json" data-seo-json-ld="true">[\s\S]*?<\/script>/gi, '');
}

function buildAlternateLinks(routePath) {
  const normalizedPath = normalizePath(routePath);
  const alternates = [
    { hreflang: 'en', href: `${SITE_ORIGIN}${normalizedPath}?lang=en` },
    { hreflang: 'fr', href: `${SITE_ORIGIN}${normalizedPath}?lang=fr` },
    { hreflang: 'x-default', href: `${SITE_ORIGIN}${normalizedPath}` },
  ];

  return `${alternates
    .map(
      (alternate) =>
        `<link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}" data-seo-hreflang="true">`
    )
    .join('\n')}\n`;
}

function buildStructuredDataScripts(entries) {
  if (!entries.length) {
    return '';
  }

  return `${entries
    .map(
      (entry) =>
        `<script type="application/ld+json" data-seo-json-ld="true">${JSON.stringify(entry)}</script>`
    )
    .join('\n')}\n`;
}

function injectBeforeHeadEnd(html, content) {
  return html.replace('</head>', `${content}</head>`);
}

function upsertNamedMeta(html, name, content) {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp(`<meta\\s+name="${escapeRegExp(name)}"\\s+content="[^"]*"\\s*?>`, 'i');
  const tag = `<meta name="${name}" content="${escapedContent}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : injectBeforeHeadEnd(html, `${tag}\n`);
}

function removeNamedMeta(html, name) {
  const pattern = new RegExp(`\\s*<meta\\s+name="${escapeRegExp(name)}"\\s+content="[^"]*"\\s*?>`, 'i');
  return html.replace(pattern, '');
}

function upsertPropertyMeta(html, property, content) {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp(`<meta\\s+property="${escapeRegExp(property)}"\\s+content="[^"]*"\\s*?>`, 'i');
  const tag = `<meta property="${property}" content="${escapedContent}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : injectBeforeHeadEnd(html, `${tag}\n`);
}

function upsertCanonical(html, href) {
  const tag = `<link rel="canonical" href="${href}">`;
  const pattern = /<link\s+rel="canonical"\s+href="[^"]*"\s*?>/i;
  return pattern.test(html) ? html.replace(pattern, tag) : injectBeforeHeadEnd(html, `${tag}\n`);
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

async function writeRouteHtml(routePath, html) {
  const targetPath = routePath === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, ...normalizePath(routePath).slice(1).split('/'), 'index.html');

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, html, 'utf8');
}

async function writeSitemap() {
  const canonicalEntries = uniqueByCanonical([
    ...MARKETING_PAGES,
    ...BLOG_POSTS.map((post) => ({ canonicalPath: `/blog/${post.slug}` })),
  ]);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${canonicalEntries
    .map((entry) => {
      const routePath = entry.canonicalPath;
      return `  <url>\n    <loc>${absoluteUrl(routePath)}</loc>\n    <xhtml:link rel="alternate" hreflang="en" href="${absoluteUrl(routePath)}?lang=en" />\n    <xhtml:link rel="alternate" hreflang="fr" href="${absoluteUrl(routePath)}?lang=fr" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl(routePath)}" />\n  </url>`;
    })
    .join('\n')}\n</urlset>\n`;

  await writeFile(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
}

function uniqueByCanonical(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const canonicalPath = normalizePath(entry.canonicalPath);
    if (seen.has(canonicalPath)) {
      return false;
    }

    seen.add(canonicalPath);
    return true;
  });
}

function normalizePath(routePath) {
  const trimmed = routePath?.trim() || '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function absoluteUrl(routePath) {
  return `${SITE_ORIGIN}${normalizePath(routePath)}`;
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