import { Component } from '@angular/core';
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
import { documentTextOutline, cloudUploadOutline } from 'ionicons/icons';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { Chart, registerables } from 'chart.js';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';

Chart.register(...registerables);

const supabase = createClient(
  'https://zdpycybjhkbvqdxvriib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcHljeWJqaGtidnFkeHZyaWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTc1MzcsImV4cCI6MjA3Njg5MzUzN30.48IuQYYgzeFz0E8NP4_wSvZAVEioPsAd6TynnzJTbBA',
);

@Component({
  selector: 'app-individual',
  templateUrl: './individual.page.html',
  styleUrls: ['./individual.page.scss'],
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
export class IndividualPage {
  nombreEncuesta: string = '';
  columnaInicio: string = '';
  columnaFin: string = '';
  filaInicio: string = '';
  filaFin: string = '';
  archivoSeleccionado: File | null = null;
  nombreArchivo: string = 'No se ha seleccionado ningún archivo';
  mostrarFormulario: boolean = true;
  mostrarGraficas: boolean = false;
  respuestasProcesadas: any[] = [];

  constructor() {
    addIcons({ documentTextOutline, cloudUploadOutline });
  }

  onArchivoSeleccionado(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      this.nombreArchivo = file.name;
    }
  }

  generarGraficas() {
    const colInicio = this.columnaInicio.toUpperCase();
    const colFin = this.columnaFin.toUpperCase();
    const filInicio = parseInt(this.filaInicio);
    const filFin = parseInt(this.filaFin);

    if (!this.validaciones(colInicio, colFin)) return;

    if (filInicio > filFin) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La fila de inicio no puede ser mayor que la fila de fin.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (!this.archivoSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo no seleccionado',
        text: 'Por favor, selecciona un archivo Excel antes de continuar.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    this.leerArchivo(
      this.archivoSeleccionado,
      colInicio,
      colFin,
      filInicio,
      filFin,
    );
  }

  private leerArchivo(
    file: File,
    colInicio: string,
    colFin: string,
    filInicio: number,
    filFin: number,
  ) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const datos = new Uint8Array(e.target.result);
      const libroTrabajo = XLSX.read(datos, { type: 'array' });
      const hojarespuestas = libroTrabajo.SheetNames[0];
      const sheet = libroTrabajo.Sheets[hojarespuestas];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      this.respuestasProcesadas = this.procesarRespuestas(
        jsonData,
        colInicio,
        colFin,
        filInicio,
        filFin,
      );
      this.alertaProcesado();
    };
    reader.readAsArrayBuffer(file);
  }

  private procesarRespuestas(
    datos: any[][],
    colInicio: string,
    colFin: string,
    filaInicio: number,
    filaFin: number,
  ) {
    const respuestasPosibles = [
      'Totalmente en desacuerdo',
      'En desacuerdo',
      'Ni de acuerdo, ni en desacuerdo',
      'De acuerdo',
      'Totalmente de acuerdo',
    ];

    const indiceColInicio = XLSX.utils.decode_col(colInicio);
    const indiceColFin = XLSX.utils.decode_col(colFin);
    const respuestas = [];

    for (let col = indiceColInicio; col <= indiceColFin; col++) {
      let conteo: any = {};
      respuestasPosibles.forEach((r) => (conteo[r] = 0));
      for (let fila = filaInicio - 1; fila < filaFin; fila++) {
        const respuesta = datos[fila]?.[col];
        if (respuestasPosibles.includes(respuesta)) {
          conteo[respuesta]++;
        }
      }
      respuestas.push(conteo);
    }
    return respuestas;
  }

  private alertaProcesado() {
    Swal.fire({
      title: '¡Archivo procesado!',
      text: 'El archivo se procesó con éxito.',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/845/845646.png',
      imageWidth: 100,
      imageHeight: 100,
      imageAlt: 'Éxito',
      confirmButtonText: 'Ver gráficas',
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.alternarSecciones();
      }
    });
  }

  alternarSecciones() {
    this.mostrarFormulario = false;
    this.mostrarGraficas = true;
    setTimeout(() => {
      this.renderizarGraficas();
    }, 300);
  }

  private renderizarGraficas() {
    const container = document.getElementById('graficas');
    if (!container) return;
    container.innerHTML = '';

    this.respuestasProcesadas.forEach((conteo, index) => {
      const col = document.createElement('div');
      col.className = 'grafica-item';

      const canvas = document.createElement('canvas');
      canvas.id = `grafica-${index}`;
      canvas.style.maxHeight = '300px';
      col.appendChild(canvas);
      container.appendChild(col);

      const labels = Object.keys(conteo);
      const data = labels.map((label) => conteo[label]);

      new Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [
            {
              label: `Pregunta ${index + 1}`,
              data,
              backgroundColor: [
                '#6eab46',
                '#4270c1',
                '#fbbd00',
                '#42662a',
                '#244276',
              ],
              borderColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: `Respuestas - Pregunta ${index + 1}`,
              color: 'rgb(210, 195, 160)',
              font: { size: 15, weight: 'bold', family: 'Roboto' },
              padding: { bottom: 12 },
            },
            legend: {
              position: 'bottom',
              labels: {
                color: 'rgba(231, 246, 254, 0.9)',
                font: { size: 11, family: 'Roboto' },
                padding: 12,
                generateLabels: (chart: any) => {
                  const d = chart.data;
                  return (d.labels as string[]).map((label, i) => {
                    const value = d.datasets[0].data[i] as number;
                    const total = (d.datasets[0].data as number[]).reduce(
                      (a, b) => a + b,
                      0,
                    );
                    return {
                      text: `${label}: ${value} (${((value / total) * 100).toFixed(0)}%)`,
                      fillStyle: (d.datasets[0].backgroundColor as string[])[i],
                      strokeStyle: 'rgba(255,255,255,0.15)',
                      fontColor: 'rgba(231, 246, 254, 0.9)',
                      lineWidth: 1,
                      hidden: false,
                      index: i,
                    };
                  });
                },
              },
            },
          },
        },
      });
    });
  }

  // Convierte canvas a imagen con fondo blanco y proporciones correctas
  private canvasToImagenLimpia(canvas: HTMLCanvasElement): string {
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d')!;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Dibuja el canvas original encima
    ctx.drawImage(canvas, 0, 0);

    return offscreen.toDataURL('image/png');
  }

  private buildPDF(): jsPDF {
    const canvases = document.querySelectorAll<HTMLCanvasElement>(
      "canvas[id^='grafica-']",
    );
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 15;
    const marginY = 20;
    const gap = 10;

    // Una por fila, centrada
    const imgWidth = pageWidth - marginX * 2; // ~180mm ancho completo
    const imgHeight = (pageHeight - marginY * 2 - gap) / 2; // ~120mm — 2 por página

    let row = 0;

    canvases.forEach((canvas, index) => {
      if (index > 0 && index % 2 === 0) {
        pdf.addPage();
        row = 0;
      }

      const imgData = this.canvasParaPDF(canvas, index);

      const x = marginX;
      const y = marginY + row * (imgHeight + gap);

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      row++;
    });

    return pdf;
  }

  private canvasParaPDF(canvas: HTMLCanvasElement, index: number): string {
    // Crea un canvas offscreen del mismo tamaño
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d')!;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Re-renderiza la gráfica con colores para fondo blanco
    const conteo = this.respuestasProcesadas[index];
    const labels = Object.keys(conteo);
    const data = labels.map((l) => conteo[l]);

    const tempChart = new Chart(offscreen, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#6eab46',
              '#4270c1',
              '#fbbd00',
              '#42662a',
              '#244276',
            ],
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false as any,
        plugins: {
          title: {
            display: true,
            text: `Respuestas - Pregunta ${index + 1}`,
            color: '#000000', // ← negro
            font: { size: 16, weight: 'bold', family: 'Roboto' },
            padding: { bottom: 10 },
          },
          legend: {
            position: 'bottom',
            labels: {
              color: '#000000', // ← negro
              font: { size: 10, family: 'Roboto' },
              padding: 8,
              generateLabels: (chart: any) => {
                const d = chart.data;
                return (d.labels as string[]).map((label, i) => {
                  const value = d.datasets[0].data[i] as number;
                  const total = (d.datasets[0].data as number[]).reduce(
                    (a: number, b: number) => a + b,
                    0,
                  );
                  return {
                    text: `${label}: ${value} (${((value / total) * 100).toFixed(0)}%)`,
                    fillStyle: (d.datasets[0].backgroundColor as string[])[i],
                    strokeStyle: '#ffffff',
                    fontColor: '#000000', // ← negro
                    lineWidth: 1,
                    hidden: false,
                    index: i,
                  };
                });
              },
            },
          },
        },
      },
    });

    const imgData = offscreen.toDataURL('image/png');
    tempChart.destroy(); // limpia el chart temporal
    return imgData;
  }

  descargarPDF() {
    const pdf = this.buildPDF();
    pdf.save(`graficas - ${this.nombreEncuesta}.pdf`);
  }

  async subirPDF() {
    const pdf = this.buildPDF();
    const nameEncuesta = this.nombreEncuesta.trim() || 'Encuesta';
    const pdfBlob = pdf.output('blob');
    const fileName = `${nameEncuesta.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

    const { error } = await supabase.storage
      .from('Individual-Bucket')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al subir el PDF a Supabase.',
      });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('Individual-Bucket')
      .getPublicUrl(fileName);

    Swal.fire({
      title: '<strong>PDF cargado correctamente</strong>',
      icon: 'success',
      html: `
        <p>¡Escanea el código para descargar o compartir el PDF!</p>
        <canvas id="qr-pdf" style="width:180px;height:180px;"></canvas>
        <br><small>También puedes <b>descargarlo localmente</b>.</small>
      `,
      confirmButtonText: 'Continuar!',
      didOpen: () => {
        new (window as any).QRious({
          element: document.getElementById('qr-pdf'),
          value: publicUrlData.publicUrl,
          size: 180,
          padding: 10,
        });
      },
    });
  }

  private validaciones(columnaInicio: string, columnaFin: string): boolean {
    const abecedario = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const colInicio = abecedario.indexOf(columnaInicio);
    const colFin = abecedario.indexOf(columnaFin);

    if (colInicio > colFin) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La columna de inicio no puede ser mayor que la columna de fin.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return false;
    }
    return true;
  }

  regresarMenu() {
    this.mostrarFormulario = true;
    this.mostrarGraficas = false;
  }
}
