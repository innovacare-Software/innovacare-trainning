import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';

interface SocialChannelCard {
  platform: string;
  handle: string;
  audience: string;
  followers: string;
  posts: string;
  href: string;
  accent: 'teal' | 'gold' | 'navy';
}

interface SocialTrack {
  id: string;
  label: string;
  title: string;
  intro: string;
  sample: string;
  channels: SocialChannelCard[];
}

@Component({
  selector: 'app-social-learning-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective],
  templateUrl: './social-learning.page.html',
  styleUrls: ['./social-learning.page.css'],
})
export class SocialLearningPage {
  readonly heroStats = [
    { value: '4', label: 'Innovacare Review communities' },
    { value: '12+', label: 'Community touchpoints' },
    { value: 'Weekly', label: 'Fresh study prompts' },
  ];

  readonly benefits = [
    {
      title: 'Study with visible momentum',
      body: 'Peer activity, shared wins, and regular prompts make it easier to stay consistent through long exam cycles inside the Innovacare Review ecosystem.',
    },
    {
      title: 'Learn from real questions',
      body: 'Each community shares review snippets, rationale patterns, and focused tips learners can use right away.',
    },
    {
      title: 'Keep referrals warm',
      body: 'The page works as a public destination for ambassadors, affiliates, and learners inviting friends into Innovacare Review.',
    },
  ];

  readonly tracks: SocialTrack[] = [
    {
      id: 'nclex',
      label: 'NCLEX',
      title: 'Innovacare Review NCLEX communities for daily accountability and study support',
      intro:
        'Follow Innovacare Review NCLEX communities to review quick questions, see peer progress, and stay connected to a study routine that feels active.',
      sample:
        'Best for pre-licensure nursing students, repeat test-takers, and peer-led study circles preparing for NCLEX-RN or NCLEX-PN.',
      channels: [
        {
          platform: 'Facebook Group',
          handle: '@InnovacareReviewNCLEX',
          audience: 'Group study and peer support',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'teal',
        },
        {
          platform: 'Instagram',
          handle: '@innovacarereview.nclex',
          audience: 'Daily study prompts and reminders',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'gold',
        },
        {
          platform: 'TikTok',
          handle: '@innovacarereview.nclex',
          audience: 'Short-form review and quick tips',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'navy',
        },
      ],
    },
    {
      id: 'fnp',
      label: 'FNP',
      title: 'Innovacare Review FNP communities for certification prep and clinical reasoning',
      intro:
        'Join Innovacare Review channels built around board-style cases, pharmacology refreshers, and exam-focused coaching for nurse practitioner candidates.',
      sample:
        'Best for FNP, PMHNP, and advanced practice learners who want consistent exposure to clinical reasoning and board-aligned content.',
      channels: [
        {
          platform: 'Facebook Group',
          handle: '@InnovacareReviewFNP',
          audience: 'Board prep discussion and Q&A',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'teal',
        },
        {
          platform: 'Instagram',
          handle: '@innovacarereview.fnp',
          audience: 'Question walk-throughs and cases',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'gold',
        },
        {
          platform: 'TikTok',
          handle: '@innovacarereview.fnp',
          audience: 'Clinical pearls and rapid reviews',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'navy',
        },
      ],
    },
    {
      id: 'teas-7',
      label: 'TEAS 7',
      title: 'Innovacare Review TEAS 7 communities for nursing school entrance prep',
      intro:
        'Use Innovacare Review prompts in science, reading, and math to stay engaged while you prepare for nursing school admission tests.',
      sample:
        'Best for pre-nursing applicants balancing admission timelines, foundational review, and daily question practice.',
      channels: [
        {
          platform: 'Facebook Group',
          handle: '@InnovacareReviewTEAS7',
          audience: 'Admissions-focused study support',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'teal',
        },
        {
          platform: 'Instagram',
          handle: '@innovacarereview.teas',
          audience: 'Quick drills and concept refreshers',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'gold',
        },
        {
          platform: 'TikTok',
          handle: '@innovacarereview.teas',
          audience: 'Short-form entrance exam review',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'navy',
        },
      ],
    },
    {
      id: 'medical',
      label: 'Medical',
      title: 'Innovacare Review medical communities for board prep and clinical refreshers',
      intro:
        'Stay connected to Innovacare Review medical content, board preparation prompts, and professional study loops across advanced clinical pathways.',
      sample:
        'Best for USMLE, COMLEX, PANCE, and broader medical review audiences who need a public community touchpoint between study sessions.',
      channels: [
        {
          platform: 'Facebook Group',
          handle: '@InnovacareReviewMedical',
          audience: 'Board review community',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'teal',
        },
        {
          platform: 'Instagram',
          handle: '@innovacarereview.medical',
          audience: 'Clinical review and study content',
          followers: 'Growing',
          posts: 'Weekly',
          href: '/contact',
          accent: 'gold',
        },
        {
          platform: 'Website path',
          handle: 'Innovacare Review medical pathways',
          audience: 'Programs and next-step enrollment',
          followers: '4 paths',
          posts: 'Updated',
          href: '/medical-program',
          accent: 'navy',
        },
      ],
    },
  ];
}