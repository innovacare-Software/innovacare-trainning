import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type LegalSection = {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
};

type LegalDocumentContent = {
  title: string;
  subtitle: string;
  updatedAt: string;
  intro: string[];
  sections: LegalSection[];
};

const TERMS_CONTENT: Record<'en' | 'fr', LegalDocumentContent> = {
  en: {
    title: 'Terms and Conditions',
    subtitle: 'The operating terms for learner accounts, purchases, organization access, and public training services.',
    updatedAt: 'April 22, 2026',
    intro: [
      'These Terms and Conditions govern access to Innovacare Training public experiences, learner registration, organization login, tutoring bookings, course purchases, and related services.',
      'By creating an account, signing in, placing an order, or using our public learning environment, you agree to these terms and to our privacy commitments.'
    ],
    sections: [
      {
        id: 'company',
        title: 'Company and Scope',
        body: [
          'For the purposes of these Terms, Innovacare Training operates the public platform, learner registration experience, and connected learning services made available through this website and associated products.',
          'These Terms apply to individual learners, guest users, institutional stakeholders, tutors, and any visitor who accesses public or authenticated areas of the service.'
        ]
      },
      {
        id: 'accounts',
        title: 'Accounts and Eligibility',
        body: [
          'You must provide accurate, current registration information and keep your credentials secure.',
          'You are responsible for all activity that occurs through your account unless you promptly report unauthorized access.'
        ],
        bullets: [
          'Accounts are personal unless an institutional contract states otherwise.',
          'Organization access may be limited to approved users, cohorts, or domains.',
          'We may suspend access if information is fraudulent, inactive, abusive, or violates platform rules.'
        ]
      },
      {
        id: 'purchases',
        title: 'Orders, Payments, and Access',
        body: [
          'Product availability, pricing, and entitlement rules may vary by offering, cohort, and commercial agreement.',
          'Access to paid content begins after successful payment confirmation or institutional assignment.'
        ],
        bullets: [
          'Digital learning products may have fixed access windows or cohort dates.',
          'Tutoring or live sessions may require advance scheduling and confirmation.',
          'We reserve the right to refuse or cancel an order affected by fraud, pricing errors, or operational constraints.'
        ]
      },
      {
        id: 'refunds',
        title: 'Refunds and Cancellations',
        body: [
          'Refund decisions depend on the type of offer, whether content has been consumed, and any applicable institutional or promotional terms.',
          'For services with fixed scheduling, no-show, lateness, or last-minute cancellation rules may apply.'
        ],
        bullets: [
          'Requests should be submitted quickly after purchase or booking.',
          'Some digital products, live events, and assigned licenses may be non-refundable once activated.',
          'Approved refunds are returned through the original payment method when possible.'
        ]
      },
      {
        id: 'acceptable-use',
        title: 'Acceptable Use',
        body: [
          'You may not misuse the platform, copy restricted content, interfere with other learners, or attempt to bypass access controls.',
          'Public, guest, and organization spaces must be used for lawful educational and operational purposes only.'
        ],
        bullets: [
          'No credential sharing, scraping, reverse engineering, or unauthorized automation.',
          'No abusive, discriminatory, fraudulent, or unlawful conduct.',
          'No resale or redistribution of protected training content without written authorization.'
        ]
      },
      {
        id: 'ip',
        title: 'Content and Intellectual Property',
        body: [
          'Course material, assessments, recordings, workflows, and brand assets remain the property of Innovacare Training or its licensors unless otherwise stated.',
          'Limited access to content does not transfer ownership or grant republication rights.'
        ]
      },
      {
        id: 'liability',
        title: 'Service Availability and Liability',
        body: [
          'We work to keep the service reliable, but platform access may be interrupted by maintenance, third-party outages, or security events.',
          'To the maximum extent allowed by law, Innovacare Training is not liable for indirect, incidental, or consequential loss arising from service use.'
        ]
      },
      {
        id: 'governing-law',
        title: 'Governing Law and Changes',
        body: [
          'These Terms are interpreted under the laws applicable to the jurisdiction in which the service is commercially operated, subject to any mandatory consumer protections that apply to you.',
          'We may revise these Terms to reflect legal, operational, or product changes. Updated versions become effective when published unless a different effective date is stated.'
        ]
      },
      {
        id: 'contact',
        title: 'Questions and Contact',
        body: [
          'Questions about commercial terms, eligibility, account actions, or cancellations can be directed through our contact channel or to hello@innovacare.training.',
          'Continued use of the platform after updates means you accept the revised terms.'
        ]
      }
    ]
  },
  fr: {
    title: 'Conditions générales',
    subtitle: 'Les règles applicables aux comptes apprenants, aux achats, aux accès organisationnels et aux services publics de formation.',
    updatedAt: '22 avril 2026',
    intro: [
      'Les présentes conditions régissent l’accès aux expériences publiques Innovacare Training, à l’inscription apprenant, à la connexion organisationnelle, aux réservations de tutorat, aux achats de cours et aux services associés.',
      'En créant un compte, en vous connectant, en passant une commande ou en utilisant notre environnement public, vous acceptez ces conditions ainsi que nos engagements de confidentialité.'
    ],
    sections: [
      {
        id: 'company',
        title: 'Société et périmètre',
        body: [
          'Aux fins des présentes conditions, Innovacare Training exploite la plateforme publique, l’expérience d’inscription apprenant et les services de formation associés accessibles via ce site et ses produits connexes.',
          'Ces conditions s’appliquent aux apprenants individuels, utilisateurs invités, parties prenantes institutionnelles, tuteurs et visiteurs accédant aux espaces publics ou authentifiés.'
        ]
      },
      {
        id: 'accounts',
        title: 'Comptes et admissibilité',
        body: [
          'Vous devez fournir des informations exactes et à jour, et protéger vos identifiants d’accès.',
          'Vous êtes responsable des activités réalisées via votre compte sauf si vous signalez rapidement un accès non autorisé.'
        ],
        bullets: [
          'Les comptes sont personnels sauf clause institutionnelle contraire.',
          'Les accès organisationnels peuvent être limités à des utilisateurs, cohortes ou domaines approuvés.',
          'Nous pouvons suspendre l’accès en cas de fraude, d’inactivité problématique, d’abus ou de violation des règles.'
        ]
      },
      {
        id: 'purchases',
        title: 'Commandes, paiements et accès',
        body: [
          'La disponibilité des offres, les prix et les règles d’accès peuvent varier selon le produit, la cohorte et l’accord commercial.',
          'L’accès au contenu payant commence après confirmation du paiement ou attribution institutionnelle.'
        ],
        bullets: [
          'Les produits numériques peuvent avoir des fenêtres d’accès limitées ou des dates de cohorte fixes.',
          'Les séances de tutorat ou événements en direct peuvent nécessiter une confirmation préalable.',
          'Nous pouvons refuser ou annuler une commande touchée par une fraude, une erreur tarifaire ou une contrainte opérationnelle.'
        ]
      },
      {
        id: 'refunds',
        title: 'Remboursements et annulations',
        body: [
          'Les décisions de remboursement dépendent du type d’offre, du niveau de consommation du contenu et des modalités promotionnelles ou institutionnelles applicables.',
          'Pour les services à horaire fixe, des règles de retard, d’absence ou d’annulation tardive peuvent s’appliquer.'
        ],
        bullets: [
          'Les demandes doivent être soumises rapidement après l’achat ou la réservation.',
          'Certains produits numériques, événements en direct ou licences activées peuvent être non remboursables.',
          'Les remboursements approuvés sont renvoyés sur le moyen de paiement initial lorsque possible.'
        ]
      },
      {
        id: 'acceptable-use',
        title: 'Utilisation acceptable',
        body: [
          'Vous ne pouvez pas détourner la plateforme, copier du contenu protégé, perturber d’autres apprenants ou contourner les contrôles d’accès.',
          'Les espaces publics, invités et organisationnels doivent être utilisés uniquement à des fins légales, éducatives et opérationnelles.'
        ],
        bullets: [
          'Aucun partage d’identifiants, scraping, reverse engineering ou automatisation non autorisée.',
          'Aucun comportement abusif, discriminatoire, frauduleux ou illicite.',
          'Aucune revente ni redistribution de contenu sans autorisation écrite.'
        ]
      },
      {
        id: 'ip',
        title: 'Contenu et propriété intellectuelle',
        body: [
          'Les cours, évaluations, enregistrements, workflows et éléments de marque restent la propriété d’Innovacare Training ou de ses concédants sauf mention contraire.',
          'L’accès au contenu ne transfère ni la propriété ni les droits de republication.'
        ]
      },
      {
        id: 'liability',
        title: 'Disponibilité du service et responsabilité',
        body: [
          'Nous faisons le nécessaire pour maintenir le service disponible, mais des interruptions peuvent survenir lors de maintenance, de pannes tierces ou d’incidents de sécurité.',
          'Dans la limite permise par la loi, Innovacare Training n’est pas responsable des pertes indirectes, accessoires ou consécutives liées à l’usage du service.'
        ]
      },
      {
        id: 'governing-law',
        title: 'Droit applicable et mises à jour',
        body: [
          'Les présentes conditions sont interprétées selon les lois applicables dans la juridiction où le service est exploité commercialement, sous réserve des protections impératives du consommateur qui vous sont applicables.',
          'Nous pouvons réviser ces conditions pour refléter des changements légaux, opérationnels ou produits. Les versions mises à jour prennent effet lors de leur publication, sauf mention contraire.'
        ]
      },
      {
        id: 'contact',
        title: 'Questions et contact',
        body: [
          'Toute question sur les conditions commerciales, l’éligibilité, les actions de compte ou les annulations peut être adressée via notre canal de contact ou à hello@innovacare.training.',
          'La poursuite de l’utilisation du service après mise à jour vaut acceptation des conditions révisées.'
        ]
      }
    ]
  }
};

const PRIVACY_CONTENT: Record<'en' | 'fr', LegalDocumentContent> = {
  en: {
    title: 'Privacy Policy',
    subtitle: 'How Innovacare Training collects, uses, stores, and protects personal information across public and learner flows.',
    updatedAt: 'April 22, 2026',
    intro: [
      'This Privacy Policy explains how Innovacare Training handles personal information when you browse public pages, register, sign in, purchase learning products, or interact with our services.',
      'We collect only the information needed to operate the platform, improve delivery, support learners, and fulfill legal or commercial obligations.'
    ],
    sections: [
      {
        id: 'controller',
        title: 'Controller and Contact',
        body: [
          'Innovacare Training acts as the service operator for the public site, learner registration, and related workflows described in this policy.',
          'Privacy questions, requests, or concerns may be directed through our contact page or by email at hello@innovacare.training.'
        ]
      },
      {
        id: 'collection',
        title: 'Information We Collect',
        body: [
          'We may collect account details, profile information, organization context, communication history, transactional records, and usage signals related to service delivery.',
          'Some information is provided directly by you, and some is generated when you use the platform.'
        ],
        bullets: [
          'Name, email, phone number, country, learner preferences, and goals.',
          'Authentication details and organization identifiers.',
          'Cart, order, booking, support, and learning activity records.'
        ]
      },
      {
        id: 'use',
        title: 'How We Use Data',
        body: [
          'We use information to create accounts, authorize access, deliver purchases, support learning experiences, communicate important service information, and improve operations.',
          'We may also use information to detect fraud, enforce platform terms, and meet compliance obligations.'
        ]
      },
      {
        id: 'sharing',
        title: 'How Information Is Shared',
        body: [
          'We share data only when necessary to run the service, process payments, provide infrastructure, or comply with law.',
          'Institutional administrators may see information required to manage assigned learners, access, and program operations.'
        ],
        bullets: [
          'Infrastructure, analytics, communication, or payment providers acting under contractual controls.',
          'Internal operations teams and approved administrators with a legitimate access need.',
          'Authorities or counterparties where disclosure is legally required or necessary to protect rights and security.'
        ]
      },
      {
        id: 'security',
        title: 'Security and Retention',
        body: [
          'We apply reasonable administrative and technical safeguards to protect personal information against unauthorized access, loss, or misuse.',
          'Retention periods depend on account status, operational need, legal obligations, and support history.'
        ]
      },
      {
        id: 'rights',
        title: 'Your Choices and Rights',
        body: [
          'You may request updates to account details, ask questions about your personal information, or contact us about deletion requests where legally applicable.',
          'Some data may be retained when required for security, payments, audit, contractual, or legal reasons.'
        ]
      },
      {
        id: 'transfers',
        title: 'Cross-Border Processing',
        body: [
          'Where service providers or infrastructure operate across regions, information may be processed in jurisdictions different from your own.',
          'When cross-border processing occurs, we rely on appropriate operational, contractual, and security safeguards relevant to the services in use.'
        ]
      },
      {
        id: 'cookies',
        title: 'Cookies and Analytics',
        body: [
          'Public pages may use cookies or similar technologies for session continuity, performance measurement, and experience improvement.',
          'You can manage browser-level cookie behavior, but some features may be limited if essential storage is blocked.'
        ]
      },
      {
        id: 'children',
        title: 'Children and Sensitive Data',
        body: [
          'The service is intended for users who can lawfully create accounts, transact, or participate in professional or educational workflows applicable to the platform.',
          'Please do not submit information that is not reasonably required for the learning, support, or purchasing experience.'
        ]
      },
      {
        id: 'contact',
        title: 'Contact and Updates',
        body: [
          'If we materially update this Privacy Policy, we may update the published date or provide notice through the platform where appropriate.',
          'Questions about privacy requests or data handling should be sent through our contact page.'
        ]
      }
    ]
  },
  fr: {
    title: 'Politique de confidentialité',
    subtitle: 'Comment Innovacare Training collecte, utilise, conserve et protège les données personnelles dans les parcours publics et apprenants.',
    updatedAt: '22 avril 2026',
    intro: [
      'Cette politique explique comment Innovacare Training traite les données personnelles lorsque vous consultez les pages publiques, créez un compte, vous connectez, achetez des produits de formation ou utilisez nos services.',
      'Nous collectons uniquement les informations nécessaires à l’exploitation de la plateforme, à l’amélioration du service, au support apprenant et au respect des obligations légales ou commerciales.'
    ],
    sections: [
      {
        id: 'controller',
        title: 'Responsable du traitement et contact',
        body: [
          'Innovacare Training agit comme opérateur du site public, de l’inscription apprenant et des workflows associés décrits dans cette politique.',
          'Les questions, demandes ou préoccupations relatives à la confidentialité peuvent être transmises via notre page de contact ou à hello@innovacare.training.'
        ]
      },
      {
        id: 'collection',
        title: 'Informations collectées',
        body: [
          'Nous pouvons collecter des données de compte, des informations de profil, le contexte organisationnel, l’historique de communication, les transactions et les signaux d’usage nécessaires au service.',
          'Certaines données sont fournies directement par vous, d’autres sont générées lors de l’utilisation de la plateforme.'
        ],
        bullets: [
          'Nom, courriel, téléphone, pays, préférences apprenant et objectifs.',
          'Données d’authentification et identifiants organisationnels.',
          'Données de panier, commandes, réservations, support et activité d’apprentissage.'
        ]
      },
      {
        id: 'use',
        title: 'Usage des données',
        body: [
          'Nous utilisons ces informations pour créer les comptes, autoriser l’accès, délivrer les achats, soutenir les parcours d’apprentissage, communiquer les informations importantes et améliorer nos opérations.',
          'Ces données peuvent aussi servir à prévenir la fraude, faire appliquer les conditions d’utilisation et répondre aux obligations de conformité.'
        ]
      },
      {
        id: 'sharing',
        title: 'Partage des informations',
        body: [
          'Nous partageons les données uniquement lorsque cela est nécessaire pour exploiter le service, traiter les paiements, fournir l’infrastructure ou respecter la loi.',
          'Les administrateurs institutionnels peuvent consulter les données utiles à la gestion des apprenants assignés, des accès et des opérations de programme.'
        ],
        bullets: [
          'Prestataires d’infrastructure, d’analytique, de communication ou de paiement agissant dans un cadre contractuel contrôlé.',
          'Équipes opérationnelles internes et administrateurs approuvés ayant un besoin d’accès légitime.',
          'Autorités ou contreparties lorsque la divulgation est exigée par la loi ou nécessaire à la sécurité et à la protection des droits.'
        ]
      },
      {
        id: 'security',
        title: 'Sécurité et conservation',
        body: [
          'Nous appliquons des mesures administratives et techniques raisonnables pour protéger les données contre l’accès non autorisé, la perte ou l’usage abusif.',
          'Les durées de conservation dépendent du statut du compte, des besoins opérationnels, des obligations légales et de l’historique de support.'
        ]
      },
      {
        id: 'rights',
        title: 'Vos choix et vos droits',
        body: [
          'Vous pouvez demander une mise à jour de vos informations, poser des questions sur vos données ou nous contacter au sujet d’une suppression lorsque la loi le permet.',
          'Certaines données peuvent être conservées lorsqu’elles sont nécessaires pour la sécurité, les paiements, l’audit, les obligations contractuelles ou la loi.'
        ]
      },
      {
        id: 'transfers',
        title: 'Traitement transfrontalier',
        body: [
          'Lorsque des prestataires ou infrastructures opèrent dans plusieurs régions, les données peuvent être traitées dans des juridictions différentes de la vôtre.',
          'Dans ces cas, nous nous appuyons sur des garanties opérationnelles, contractuelles et de sécurité appropriées au regard des services utilisés.'
        ]
      },
      {
        id: 'cookies',
        title: 'Cookies et analytique',
        body: [
          'Les pages publiques peuvent utiliser des cookies ou technologies similaires pour la continuité de session, la mesure de performance et l’amélioration de l’expérience.',
          'Vous pouvez gérer les cookies au niveau du navigateur, mais certaines fonctions peuvent être limitées si le stockage essentiel est bloqué.'
        ]
      },
      {
        id: 'children',
        title: 'Mineurs et données sensibles',
        body: [
          'Le service est destiné aux utilisateurs pouvant légalement créer un compte, acheter des offres ou participer aux workflows professionnels et éducatifs concernés.',
          'Merci de ne pas soumettre d’informations non nécessaires à l’expérience d’apprentissage, de support ou d’achat.'
        ]
      },
      {
        id: 'contact',
        title: 'Contact et mises à jour',
        body: [
          'En cas de modification importante de cette politique, nous pouvons mettre à jour la date publiée ou afficher une notification lorsque cela est approprié.',
          'Les questions relatives à la confidentialité ou au traitement des données peuvent être transmises via la page de contact.'
        ]
      }
    ]
  }
};

@Component({
  standalone: true,
  selector: 'app-legal-document-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-document.page.html',
  styleUrl: './legal-document.page.css',
})
export class LegalDocumentPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isFrench = computed(() => this.router.url.startsWith('/fr'));
  readonly documentType = computed(() => {
    const type = String(this.route.snapshot.data['document'] || 'terms').trim().toLowerCase();
    return type === 'privacy' ? 'privacy' : 'terms';
  });
  readonly content = computed<LegalDocumentContent>(() => {
    const locale = this.isFrench() ? 'fr' : 'en';
    return this.documentType() === 'privacy' ? PRIVACY_CONTENT[locale] : TERMS_CONTENT[locale];
  });

  localizedPath(path: string): string {
    return this.isFrench() ? `/fr${path}` : path;
  }
}