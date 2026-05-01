import { Routes } from '@angular/router';

export const FOR_EDUCATORS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./for-educators.page').then(m => m.ForEducatorsPage),
  },
  {
    path: 'request-demo',
    loadComponent: () =>
      import('./request-demo/request-demo.page').then(m => m.RequestDemoPage),
  },
];
