import { Component, ViewChild, ElementRef } from '@angular/core';
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
import {
  barChartOutline,
  cloudUploadOutline,
  checkmarkOutline,
  helpCircleOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-analisis',
  templateUrl: './analisis.page.html',
  styleUrls: ['./analisis.page.scss'],
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
export class AnalisisPage {
  @ViewChild('fileInput1') fileInput1!: ElementRef;
  @ViewChild('fileInput2') fileInput2!: ElementRef;

  pasoActual: number = 1;

  // Paso 1
  archivoPaso1: File | null = null;
  nombreArchivoPaso1: string = 'Elegir archivo';
  celdaInicio: string = '';
  celdaFin: string = '';

  // Paso 2
  archivoPaso2: File | null = null;
  nombreArchivoPaso2: string = 'Elegir archivo';
  colAfirmaciones: string = '';
  colGestores: string = '';
  colEstudiantes: string = '';
  colConsolidado: string = '';

  constructor() {
    addIcons({
      barChartOutline,
      cloudUploadOutline,
      checkmarkOutline,
      helpCircleOutline,
      checkmarkCircleOutline,
      chevronDownOutline,
    });
  }

  triggerFile1() {
    this.fileInput1.nativeElement.click();
  }
  triggerFile2() {
    this.fileInput2.nativeElement.click();
  }

  onArchivoPaso1(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoPaso1 = file;
      this.nombreArchivoPaso1 = file.name;
    }
  }

  onArchivoPaso2(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoPaso2 = file;
      this.nombreArchivoPaso2 = file.name;
    }
  }

  irPaso2() {
    // aquí irán las validaciones del paso 1
    this.pasoActual = 2;
  }

  volverPaso1() {
    this.pasoActual = 1;
  }

  generarReporte() {
    // aquí irá la lógica del reporte
  }
}
