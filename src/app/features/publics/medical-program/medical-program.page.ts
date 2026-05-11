import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';

@Component({
  selector: 'app-medical-program-page',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroParallaxDirective],
  templateUrl: './medical-program.page.html',
  styleUrls: ['./medical-program.page.css'],
})
export class MedicalProgramPage {
  readonly pillars = [
    'Clinical review tracks for FNP and advanced nursing learners',
    'Faculty-led checkpoints, readiness metrics and targeted remediation',
    'Institution-ready packaging for bridge programs and cohort launches',
  ];

  readonly modules = [
    'Clinical reasoning and exam strategy',
    'Systems review and case-based repetition',
    'Timed assessments and remediation loops',
    'Confidence coaching and progression planning',
  ];

  readonly heroMetrics = [
    { value: '4', label: 'Clinical tracks' },
    { value: '1:many', label: 'Faculty-ready delivery' },
    { value: 'Live', label: 'Readiness monitoring' },
  ];

  readonly gallery = [
    {
      title: 'Clinical coaching',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
      imageAlt: 'Clinical coaching illustration',
    },
    {
      title: 'Learner confidence',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121785/ChatGPT_Image_6_mai_2026_22_40_16_6_jpgu4b.png',
      imageAlt: 'Learner confidence visual',
    },
  ];
}