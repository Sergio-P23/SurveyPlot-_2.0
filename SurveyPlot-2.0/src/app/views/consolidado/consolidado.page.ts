import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { layersOutline, cloudUploadOutline } from 'ionicons/icons';

@Component({
  selector: 'app-consolidado',
  templateUrl: './consolidado.page.html',
  styleUrls: ['./consolidado.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonIcon,
    CommonModule,
    FormsModule,
    RouterLink,
  ],
})
export class ConsolidadoPage implements OnInit {
  constructor() {
    addIcons({ layersOutline, cloudUploadOutline });
  }
  ngOnInit() {}
}
