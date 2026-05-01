import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-educators-nclex-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './educators-nclex.page.html',
  styleUrls: ['./educators-nclex.page.css'],
})
export class EducatorsNclexPage {
  features = [
    { icon: '📊', title: 'Faculty Analytics', desc: 'Real-time class dashboards showing individual and cohort progress, pass probability and content-area breakdowns.' },
    { icon: '🗂️', title: 'Custom Test Banks', desc: 'Build custom assessments from 6,000+ NCLEX-style questions, add your own items and share with your cohort.' },
    { icon: '🧑‍🎓', title: 'Student Tracking', desc: 'Track every student\'s daily study time, question accuracy, weak areas and CAT exam readiness score.' },
    { icon: '🔗', title: 'LMS Integration', desc: 'Seamless integration with Canvas, Blackboard, Moodle and D2L — sync grades and assignments automatically.' },
    { icon: '📋', title: 'NCLEX Benchmarking', desc: 'Compare your program\'s performance against national NCLEX pass rate benchmarks and identify at-risk students.' },
    { icon: '🎓', title: 'Faculty CE Credits', desc: 'Earn nursing education continuing education credits through our faculty development modules and webinars.' },
  ];

  packages = [
    { name: 'Program Starter', price: '$299', period: '/semester', popular: false, desc: 'Up to 30 students', features: ['Faculty analytics dashboard', 'Custom test bank builder', 'Student progress tracking', 'LMS integration'] },
    { name: 'Program Pro', price: '$599', period: '/semester', popular: true, desc: 'Up to 100 students', features: ['Everything in Starter', 'Cohort benchmarking', 'At-risk student alerts', 'Live faculty webinars', 'Dedicated success manager', 'NCLEX outcomes reporting'] },
    { name: 'Enterprise', price: 'Custom', period: '', popular: false, desc: 'Unlimited students, multi-campus', features: ['Unlimited students', 'Multi-campus management', 'Custom branding', 'API access', 'Data export & BI tools', 'SLA guarantee'] },
  ];

  checkList = [
    'Real-time class and student analytics',
    'LMS integration (Canvas, Blackboard, Moodle)',
    'Custom test bank from 6,000+ questions',
    'NCLEX national benchmark comparisons',
    'Faculty CE credits included',
  ];
}
