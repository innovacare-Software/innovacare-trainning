import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-educators-nursing-school-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './educators-nursing-school.page.html',
  styleUrls: ['./educators-nursing-school.page.css'],
})
export class EducatorsNursingSchoolPage {
  features = [
    { icon: '📚', title: 'Curriculum Alignment', desc: 'Map Innovacare content to your nursing school curriculum by semester, course and weekly learning objectives.' },
    { icon: '👥', title: 'Cohort Management', desc: 'Enroll and manage student cohorts by program year, track completion and generate end-of-term performance reports.' },
    { icon: '📋', title: 'ATI & HESI Aligned', desc: 'Pre-built assessment sets aligned to ATI proctored exams and HESI milestones for all nursing school terms.' },
    { icon: '📊', title: 'Accreditation Reporting', desc: 'Automated ACEN and CCNE accreditation-ready reports on student learning outcomes and program metrics.' },
    { icon: '🤝', title: 'Simulation Integration', desc: 'Connect virtual patient simulations to your curriculum map and track simulation debriefing outcomes.' },
    { icon: '🔗', title: 'Clinical Placement Sync', desc: 'Sync student clinical placement schedules to their study plan so prep content mirrors current clinical rotations.' },
  ];

  packages = [
    { name: 'Program Basic', price: '$399', period: '/semester', popular: false, desc: 'Up to 50 students', features: ['Curriculum mapping tools', 'ATI & HESI aligned content', 'Cohort management', 'Term performance reports'] },
    { name: 'Program Pro', price: '$799', period: '/semester', popular: true, desc: 'Up to 200 students', features: ['Everything in Basic', 'Accreditation reporting', 'Simulation integration', 'Clinical placement sync', 'Dedicated success manager', 'Live faculty PD sessions'] },
    { name: 'Institution', price: 'Custom', period: '', popular: false, desc: 'Multi-program, unlimited seats', features: ['Unlimited students', 'Multi-program management', 'Custom branding & SSO', 'API & SIS integration', 'Regulatory compliance tools', 'SLA & dedicated support'] },
  ];

  checkList = [
    'Curriculum mapped to your program syllabus',
    'ATI & HESI milestone alignment',
    'ACEN/CCNE accreditation reporting',
    'Cohort management & term reports',
    'Clinical rotation study sync',
  ];
}
