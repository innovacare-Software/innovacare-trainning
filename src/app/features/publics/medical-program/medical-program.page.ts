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
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622326/D12A1509-BD77-4AF8-8D46-36CCEE440BC4_ctl46n.png',
      imageAlt: 'Clinical coaching illustration',
    },
    {
      title: 'Learner confidence',
      imageUrl: 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1774998911/ChatGPT_Image_31_mars_2026_19_13_12_pogn1o.png',
      imageAlt: 'Learner confidence visual',
    },
  ];
}