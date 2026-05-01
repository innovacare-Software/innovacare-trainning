import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

interface CMEPackage {
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  features: string[];
  popular?: boolean;
  cta: string;
  ctaLink: string;
}

interface CMEWebinar {
  title: string;
  date: string;
  host: string;
  seats: string;
  tag: 'Live' | 'New' | 'Popular';
}

interface CMEFeature {
  icon: string;
  title: string;
  description: string;
}

interface CMETestimonial {
  quote: string;
  author: string;
  role: string;
  photoUrl: string;
}

@Component({
  selector: 'app-cme-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cme-landing.page.html',
  styleUrls: ['./cme-landing.page.css'],
})
export class CmeLandingPage {
  readonly heroStats = [
    { value: '1,500+', label: 'CME Credits Available' },
    { value: '120+', label: 'Accredited Courses' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '40+', label: 'Medical Specialties' },
  ];

  readonly certifications = [
    'ACCME Accredited',
    'AMA PRA Category 1™',
    'ANCC Approved',
    'AOA Category 2-A',
  ];

  readonly features: CMEFeature[] = [
    {
      icon: '📊',
      title: 'Performance Analytics',
      description:
        'Track your credit progress, identify knowledge gaps, and visualize CME completion with personalized dashboards.',
    },
    {
      icon: '🏁',
      title: 'Instant Certificates',
      description:
        'Auto-generated CME certificates delivered immediately upon course completion. Print, download or share directly.',
    },
    {
      icon: '🔖',
      title: 'Bookmarks & Notes',
      description:
        'Annotate any module, bookmark key slides, and revisit highlighted content before attestation.',
    },
    {
      icon: '📚',
      title: 'Custom Learning Paths',
      description:
        'Build curated CME bundles by specialty, credit type or upcoming renewal deadline.',
    },
    {
      icon: '📖',
      title: 'Evidence-Based Content',
      description:
        'All modules undergo peer review and align with current clinical guidelines and accreditation standards.',
    },
    {
      icon: '🎯',
      title: 'Post-Test & Attestation',
      description:
        'Streamlined post-tests and MOC attestation flows built into every course for seamless compliance.',
    },
  ];

  readonly topics = [
    'Cardiology',
    'Oncology',
    'Neurology',
    'Endocrinology',
    'Infectious Disease',
    'Pediatrics',
    'Geriatrics',
    'Emergency Medicine',
    'Psychiatry',
    'Pharmacology',
    'Patient Safety',
    'Ethics',
    'Primary Care',
    'Surgery',
    'Radiology',
    'Critical Care',
    'Wound Care',
    'Diabetes Management',
    'Hypertension',
    'Pain Management',
  ];

  readonly webinars: CMEWebinar[] = [
    {
      title: 'Advances in Chronic Wound Management 2026',
      date: 'May 12, 2026 • 7:00 PM ET',
      host: 'Dr. Amanda Torres',
      seats: '42 seats left',
      tag: 'Live',
    },
    {
      title: 'AI-Assisted Assessment in Emergency Settings',
      date: 'May 19, 2026 • 6:30 PM ET',
      host: 'Dr. Marcus Chen',
      seats: '28 seats left',
      tag: 'New',
    },
    {
      title: 'Cardiology Update: Heart Failure 2026 Guidelines',
      date: 'May 26, 2026 • 7:00 PM ET',
      host: 'Dr. Priya Patel',
      seats: '15 seats left',
      tag: 'Popular',
    },
    {
      title: 'Diabetes & Metabolic Syndrome: New Therapies',
      date: 'Jun 3, 2026 • 6:00 PM ET',
      host: 'Dr. James Okafor',
      seats: '60 seats left',
      tag: 'Live',
    },
    {
      title: 'Pediatric Infectious Disease Essentials',
      date: 'Jun 9, 2026 • 7:30 PM ET',
      host: 'Dr. Sarah Kim',
      seats: '33 seats left',
      tag: 'New',
    },
    {
      title: 'Ethical Dilemmas in Modern Clinical Practice',
      date: 'Jun 16, 2026 • 6:00 PM ET',
      host: 'Dr. Leonard Webb',
      seats: '50 seats left',
      tag: 'Popular',
    },
    {
      title: 'Opioid Stewardship & Pain Management',
      date: 'Jun 23, 2026 • 7:00 PM ET',
      host: 'Dr. Aisha Brown',
      seats: '22 seats left',
      tag: 'Live',
    },
    {
      title: 'Oncology Nursing: Supportive Care Updates',
      date: 'Jun 30, 2026 • 6:30 PM ET',
      host: 'Dr. Nicole Reed',
      seats: '18 seats left',
      tag: 'New',
    },
  ];

  readonly packages: CMEPackage[] = [
    {
      name: 'CME Essentials',
      subtitle: '30 Credits',
      price: 149,
      originalPrice: 199,
      features: [
        '30 AMA PRA Category 1™ Credits',
        'Access to 40+ on-demand courses',
        'Instant certificate download',
        'Post-test & attestation included',
        '6 months access',
      ],
      cta: 'Buy Now',
      ctaLink: '/courses',
    },
    {
      name: 'CME Professional',
      subtitle: '75 Credits',
      price: 299,
      originalPrice: 399,
      features: [
        '75 AMA PRA Category 1™ Credits',
        'Access to all 120+ courses',
        'Specialty learning paths',
        '5 live webinar credits included',
        'MOC Part II documentation',
        '12 months access',
      ],
      popular: true,
      cta: 'Buy Now',
      ctaLink: '/courses',
    },
    {
      name: 'CME Elite Bundle',
      subtitle: '150 Credits',
      price: 499,
      originalPrice: 699,
      features: [
        '150 AMA PRA Category 1™ Credits',
        'Unlimited course access',
        'All live webinars included',
        'MOC + ABIM documentation',
        'Dedicated CME advisor',
        '24 months access',
      ],
      cta: 'Buy Now',
      ctaLink: '/courses',
    },
  ];

  readonly testimonials: CMETestimonial[] = [
    {
      quote:
        "The best CME platform I've used in 20 years of practice. Easy to navigate, clinically rigorous content, and instant certificates my state board accepts.",
      author: 'Dr. Kevin Marsh',
      role: 'Family Medicine Physician, Ohio',
      photoUrl: 'https://randomuser.me/api/portraits/men/42.jpg',
    },
    {
      quote:
        'I completed 50 CME credits in one weekend for my renewal. The content quality was exceptional and the post-test format is very efficient.',
      author: 'Dr. Priya Nair',
      role: 'Internal Medicine Specialist, Texas',
      photoUrl: 'https://randomuser.me/api/portraits/women/55.jpg',
    },
    {
      quote:
        'Our entire hospitalist group uses Innovacare CME. The group dashboard saves our education director hours every month.',
      author: 'Dr. James Osei',
      role: 'Chief Medical Officer, Regional Hospital',
      photoUrl: 'https://randomuser.me/api/portraits/men/67.jpg',
    },
  ];

  readonly disclosures = [
    'Innovacare is jointly accredited by the ACCME to provide continuing medical education for physicians.',
    'All faculty and planners have disclosed no relevant financial relationships.',
    'This activity has been designated for a maximum of 1.0 AMA PRA Category 1 Credit™ per module.',
    'You will receive credit only for modules you complete with a passing score.',
    'Completion certificates are available within 24 hours of successful attestation.',
  ];

  readonly learningObjectives = [
    'Demonstrate updated clinical knowledge aligned with specialty-specific guidelines',
    'Apply evidence-based strategies to improve patient outcomes',
    'Identify emerging therapeutic approaches in key disease areas',
    'Document professional development compliance for board recertification',
    'Evaluate the effectiveness of new clinical technologies and interventions',
  ];

  readonly faqs = [
    {
      question: 'Are Innovacare CME credits ACCME accredited?',
      answer:
        'Yes. Innovacare is jointly accredited by the ACCME to provide continuing medical education for physicians. All credits are designated as AMA PRA Category 1™.',
    },
    {
      question: 'How do I receive my CME certificate?',
      answer:
        "Upon completing a course's post-test and attestation form, your certificate is generated automatically and available for immediate download in your account.",
    },
    {
      question: 'Can I use Innovacare CME for MOC (Maintenance of Certification)?',
      answer:
        'Yes. Professional and Elite Bundle subscribers receive MOC Part II documentation compliant with ABIM, ABFM, and other major certifying boards.',
    },
    {
      question: 'How many continuing education hours can I earn?',
      answer:
        'There is no annual cap. Credits available depend on your subscription tier: 30, 75, or 150+ AMA PRA Category 1™ credits.',
    },
    {
      question: 'Are live webinars included in all plans?',
      answer:
        'Live webinar credits are included in the Professional (5 credits) and Elite Bundle (unlimited) plans. Essentials subscribers can purchase webinar access individually.',
    },
    {
      question: 'Do I need to complete courses in a specific order?',
      answer:
        'No. All on-demand courses are self-paced and can be accessed in any order. You can also build a custom learning path by specialty or renewal timeline.',
    },
    {
      question: 'What happens after my subscription expires?',
      answer:
        'You retain access to all certificates earned during your subscription. To earn additional credits, simply renew or upgrade your plan at any time.',
    },
  ];

  openFaq = signal<number>(0);

  toggleFaq(index: number): void {
    this.openFaq.set(this.openFaq() === index ? -1 : index);
  }
}
