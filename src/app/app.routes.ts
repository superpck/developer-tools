import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'request', pathMatch: 'full' },
  {
    path: 'request',
    loadChildren: () => import('./components/send-request/send-request').then(m => m.SendRequest)
  },
];
