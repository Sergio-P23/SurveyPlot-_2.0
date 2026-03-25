import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'individual',
    loadComponent: () => import('./views/individual/individual.page').then( m => m.IndividualPage)
  },
  {
    path: 'consolidado',
    loadComponent: () => import('./views/consolidado/consolidado.page').then( m => m.ConsolidadoPage)
  },
  {
    path: 'analisis',
    loadComponent: () => import('./views/analisis/analisis.page').then( m => m.AnalisisPage)
  },
];
