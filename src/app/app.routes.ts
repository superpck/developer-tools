import { Routes } from '@angular/router';
import { PageNotFound } from './pages/page-not-found/page-not-found';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
    pathMatch: 'full' 
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.Home)
  },
  {
    path: '',
    loadComponent: () => import('./components/layout/layout').then(m => m.Layout),
    children: [
      {
        path: 'request',
        loadComponent: () => import('./components/send-request/send-request').then(m => m.SendRequest)
      },
      {
        path: 'crypto',
        loadComponent: () => import('./components/crypto-tool/crypto-tool').then(m => m.CryptoTool)
      },
      {
        path: 'jwt',
        loadComponent: () => import('./components/jwt-tool/jwt-tool').then(m => m.JwtTool)
      },
      { path: '**', component: PageNotFound }
    ]
  }
];
