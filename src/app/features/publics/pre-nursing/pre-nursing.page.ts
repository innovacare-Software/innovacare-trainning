import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pre-nursing-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pre-nursing.page.html',
  styleUrls: ['./pre-nursing.page.css'],
})
export class PreNursingPage {
  features = [
    { icon: '📝', title: 'TEAS 7 Full Prep', desc: '3,000+ practice questions aligned to the latest ATI TEAS 7 blueprint across science, math, reading and English.' },
    { icon: '🔬', title: 'HESI A2 Modules', desc: 'Dedicated HESI A2 content covering anatomy, biology, chemistry, math and vocabulary.' },
    { icon: '📊', title: 'Adaptive Practice Tests', desc: 'AI-driven mock exams that adjust difficulty and focus on your weakest areas.' },
    { icon: '🎯', title: 'Score Predictor', desc: 'Real-time score projection so you always know where you stand before test day.' },
    { icon: '📹', title: 'Video Tutorials', desc: '200+ short video lessons taught by nursing educators with clear explanations and mnemonics.' },
    { icon: '📅', title: 'Study Calendar', desc: 'Personalized 4–12 week study plans that fit around your schedule and target exam date.' },
  ];

  packages = [
    { name: 'Starter', price: '$49', period: '/month', popular: false, desc: 'Perfect for getting started', features: ['TEAS 7 practice bank', 'HESI A2 practice bank', '2 full mock exams', 'Study calendar'] },
    { name: 'Pro', price: '$99', period: '/3 months', popular: true, desc: 'Most popular for exam prep', features: ['Everything in Starter', '10 full mock exams', 'Score predictor', 'Video tutorials', 'Performance analytics', 'Live Q&A sessions'] },
    { name: 'Ultimate', price: '$149', period: '/6 months', popular: false, desc: 'Maximum preparation', features: ['Everything in Pro', 'Unlimited mock exams', '1-on-1 tutoring session', 'Score guarantee', 'Physical study guide', 'Priority support'] },
  ];

  checkList = [
    'Covers TEAS 7 and HESI A2 blueprints',
    'Personalized study schedule',
    'Full performance analytics dashboard',
    'Instant certificate on completion',
    'Access on all devices',
  ];
}
