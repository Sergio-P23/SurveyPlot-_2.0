import { Component } from '@angular/core';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  layersOutline,
  barChartOutline,
  gridOutline,
} from 'ionicons/icons';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonContent, IonGrid, IonRow, IonCol, IonIcon, IonText, RouterLink],
})
export class HomePage {
  // <--- ESTE NOMBRE DEBE COINCIDIR EN app.routes.ts
  constructor() {
    // Registramos los iconos de la imagen
    addIcons({ personOutline, layersOutline, barChartOutline, gridOutline });
  }
}
