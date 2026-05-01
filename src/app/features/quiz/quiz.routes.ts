import { Routes } from '@angular/router';

export const QUIZ_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/quiz-shell/quiz-shell.component').then((m) => m.QuizShellComponent),
  },
];
