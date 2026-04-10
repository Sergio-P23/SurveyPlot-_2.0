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
import { layersOutline, cloudUploadOutline } from 'ionicons/icons';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { Chart, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';

Chart.register(...registerables);

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
export class ConsolidadoPage {
  // Formulario 1
  nombreEncuesta1: string = '';
  columnaInicio1: string = '';
  columnaFin1: string = '';
  filaInicio1: string = '';
  filaFin1: string = '';
  archivo1: File | null = null;
  nombreArchivo1: string = 'No se ha seleccionado ningún archivo';

  // Formulario 2
  nombreEncuesta2: string = '';
  columnaInicio2: string = '';
  columnaFin2: string = '';
  filaInicio2: string = '';
  filaFin2: string = '';
  archivo2: File | null = null;
  nombreArchivo2: string = 'No se ha seleccionado ningún archivo';

  // Control de vista
  mostrarFormulario: boolean = true;
  mostrarGraficas: boolean = false;

  // Respuestas procesadas
  private respuestasArchivo1: any[] | null = null;
  private respuestasArchivo2: any[] | null = null;
  private respuestasConsolidadas: any[] = [];

  constructor() {
    addIcons({ layersOutline, cloudUploadOutline });
  }

  onArchivo1Seleccionado(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivo1 = file;
      this.nombreArchivo1 = file.name;
    }
  }

  onArchivo2Seleccionado(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivo2 = file;
      this.nombreArchivo2 = file.name;
    }
  }

  async generarGraficas() {
    // Validar nombre encuesta 1
    if (!this.nombreEncuesta1.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Ingresa el nombre de la Encuesta 1.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // Validar nombre encuesta 2
    if (!this.nombreEncuesta2.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Ingresa el nombre de la Encuesta 2.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // Validar archivos
    if (!this.archivo1 && !this.archivo2) {
      await Swal.fire({
        icon: 'warning',
        title: 'Archivos no seleccionados',
        text: 'Por favor selecciona ambos archivos Excel.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (!this.archivo1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Archivo 1 no seleccionado',
        text: 'Por favor selecciona el archivo Excel de la Encuesta 1.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (!this.archivo2) {
      await Swal.fire({
        icon: 'warning',
        title: 'Archivo 2 no seleccionado',
        text: 'Por favor selecciona el archivo Excel de la Encuesta 2.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // Validar columnas encuesta 1
    const col1Inicio = this.columnaInicio1.trim().toUpperCase();
    const col1Fin = this.columnaFin1.trim().toUpperCase();
    if (!col1Inicio || !/^[A-Z]$/.test(col1Inicio)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Columna inválida - Encuesta 1',
        text: 'La columna primera pregunta debe ser una sola letra.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (!col1Fin || !/^[A-Z]$/.test(col1Fin)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Columna inválida - Encuesta 1',
        text: 'La columna última pregunta debe ser una sola letra.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // Validar columnas encuesta 2
    const col2Inicio = this.columnaInicio2.trim().toUpperCase();
    const col2Fin = this.columnaFin2.trim().toUpperCase();
    if (!col2Inicio || !/^[A-Z]$/.test(col2Inicio)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Columna inválida - Encuesta 2',
        text: 'La columna primera pregunta debe ser una sola letra.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (!col2Fin || !/^[A-Z]$/.test(col2Fin)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Columna inválida - Encuesta 2',
        text: 'La columna última pregunta debe ser una sola letra.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const abecedario = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    if (abecedario.indexOf(col1Inicio) > abecedario.indexOf(col1Fin)) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango incorrecto - Encuesta 1',
        text: `La columna "${col1Inicio}" no puede ser mayor que "${col1Fin}".`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (abecedario.indexOf(col2Inicio) > abecedario.indexOf(col2Fin)) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango incorrecto - Encuesta 2',
        text: `La columna "${col2Inicio}" no puede ser mayor que "${col2Fin}".`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // Validar filas
    const fil1Inicio = parseInt(this.filaInicio1);
    const fil1Fin = parseInt(this.filaFin1);
    const fil2Inicio = parseInt(this.filaInicio2);
    const fil2Fin = parseInt(this.filaFin2);

    if (!this.filaInicio1.trim() || isNaN(fil1Inicio) || fil1Inicio < 1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Fila inválida - Encuesta 1',
        text: 'La fila de inicio debe ser un número válido mayor a 0.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (!this.filaFin1.trim() || isNaN(fil1Fin) || fil1Fin < 1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Fila inválida - Encuesta 1',
        text: 'La fila de fin debe ser un número válido mayor a 0.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (fil1Inicio > fil1Fin) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango de filas incorrecto - Encuesta 1',
        text: `La fila de inicio (${fil1Inicio}) no puede ser mayor que la fila de fin (${fil1Fin}).`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (!this.filaInicio2.trim() || isNaN(fil2Inicio) || fil2Inicio < 1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Fila inválida - Encuesta 2',
        text: 'La fila de inicio debe ser un número válido mayor a 0.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (!this.filaFin2.trim() || isNaN(fil2Fin) || fil2Fin < 1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Fila inválida - Encuesta 2',
        text: 'La fila de fin debe ser un número válido mayor a 0.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    if (fil2Inicio > fil2Fin) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango de filas incorrecto - Encuesta 2',
        text: `La fila de inicio (${fil2Inicio}) no puede ser mayor que la fila de fin (${fil2Fin}).`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    // Confirmación
    const totalPreguntas1 =
      abecedario.indexOf(col1Fin) - abecedario.indexOf(col1Inicio) + 1;
    const totalPreguntas2 =
      abecedario.indexOf(col2Fin) - abecedario.indexOf(col2Inicio) + 1;

    const confirmar = await Swal.fire({
      icon: 'question',
      title: '¿Los datos son correctos?',
      html: `
        <table style="width:100%; text-align:left; border-collapse:collapse; font-size:0.85rem;">
          <tr><td colspan="2" style="padding:6px; font-weight:bold; color:#a855f7">Encuesta 1</td></tr>
          <tr><td style="padding:4px 6px; color:#888">Nombre</td><td style="padding:4px 6px"><b>${this.nombreEncuesta1}</b></td></tr>
          <tr style="background:rgba(0,0,0,0.03)"><td style="padding:4px 6px; color:#888">Archivo</td><td style="padding:4px 6px"><b>${this.archivo1.name}</b></td></tr>
          <tr><td style="padding:4px 6px; color:#888">Rango</td><td style="padding:4px 6px"><b>${col1Inicio}${fil1Inicio} → ${col1Fin}${fil1Fin} (${totalPreguntas1} preguntas)</b></td></tr>
          <tr><td colspan="2" style="padding:8px 6px 4px; font-weight:bold; color:#a855f7">Encuesta 2</td></tr>
          <tr><td style="padding:4px 6px; color:#888">Nombre</td><td style="padding:4px 6px"><b>${this.nombreEncuesta2}</b></td></tr>
          <tr style="background:rgba(0,0,0,0.03)"><td style="padding:4px 6px; color:#888">Archivo</td><td style="padding:4px 6px"><b>${this.archivo2.name}</b></td></tr>
          <tr><td style="padding:4px 6px; color:#888">Rango</td><td style="padding:4px 6px"><b>${col2Inicio}${fil2Inicio} → ${col2Fin}${fil2Fin} (${totalPreguntas2} preguntas)</b></td></tr>
        </table>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Corregir datos',
      confirmButtonColor: '#a855f7',
      cancelButtonColor: '#d33',
    });

    if (!confirmar.isConfirmed) return;

    // Resetear respuestas
    this.respuestasArchivo1 = null;
    this.respuestasArchivo2 = null;

    this.leerArchivo(
      this.archivo1,
      col1Inicio,
      col1Fin,
      fil1Inicio,
      fil1Fin,
      1,
    );
    this.leerArchivo(
      this.archivo2,
      col2Inicio,
      col2Fin,
      fil2Inicio,
      fil2Fin,
      2,
    );
  }

  private leerArchivo(
    file: File,
    colInicio: string,
    colFin: string,
    filInicio: number,
    filFin: number,
    numero: number,
  ) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const datos = new Uint8Array(e.target.result);
        const libroTrabajo = XLSX.read(datos, { type: 'array' });
        const sheet = libroTrabajo.Sheets[libroTrabajo.SheetNames[0]];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
        });

        const respuestas = this.procesarRespuestas(
          jsonData,
          colInicio,
          colFin,
          filInicio,
          filFin,
        );

        if (numero === 1) {
          this.respuestasArchivo1 = respuestas;
        } else {
          this.respuestasArchivo2 = respuestas;
        }

        this.verificarYConsolidar();
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'Archivo inválido',
          text: `No se pudo leer el archivo ${numero}. Asegúrate de que sea un Excel válido.`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3085d6',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private procesarRespuestas(
    datos: any[][],
    colInicio: string,
    colFin: string,
    filaInicio: number,
    filaFin: number,
  ): any[] {
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
        if (respuestasPosibles.includes(respuesta)) conteo[respuesta]++;
      }
      respuestas.push(conteo);
    }
    return respuestas;
  }

  private verificarYConsolidar() {
    if (this.respuestasArchivo1 === null || this.respuestasArchivo2 === null)
      return;

    const maxLength = Math.max(
      this.respuestasArchivo1.length,
      this.respuestasArchivo2.length,
    );
    this.respuestasConsolidadas = [];

    for (let i = 0; i < maxLength; i++) {
      const obj1 = this.respuestasArchivo1[i] || {};
      const obj2 = this.respuestasArchivo2[i] || {};
      const claves = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
      const consolidado: any = {};
      claves.forEach((clave) => {
        consolidado[clave] = (obj1[clave] || 0) + (obj2[clave] || 0);
      });
      this.respuestasConsolidadas.push(consolidado);
    }

    this.alertaProcesado();
  }

  private alertaProcesado() {
    Swal.fire({
      title: '¡Archivos procesados!',
      text: 'Los archivos se consolidaron con éxito.',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/845/845646.png',
      imageWidth: 100,
      imageHeight: 100,
      imageAlt: 'Éxito',
      confirmButtonText: 'Ver gráficas',
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.mostrarFormulario = false;
        this.mostrarGraficas = true;
        setTimeout(() => {
          this.renderizarGraficas();
        }, 300);
      }
    });
  }

  private renderizarGraficas() {
    const container = document.getElementById('graficas-consolidado');
    if (!container) return;
    container.innerHTML = '';

    this.respuestasConsolidadas.forEach((conteo, index) => {
      const col = document.createElement('div');
      col.className = 'grafica-item';

      const canvas = document.createElement('canvas');
      canvas.id = `grafica-cons-${index}`;
      canvas.style.width = '100%';
      canvas.style.maxWidth = '100%';
      canvas.style.height = '100%';
      canvas.style.maxHeight = '340px';
      canvas.style.display = 'block';
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

  private canvasParaPDF(canvas: HTMLCanvasElement, index: number): string {
    const offscreen = document.createElement('canvas');
    offscreen.width = 800;
    offscreen.height = 500;
    const ctx = offscreen.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    const conteo = this.respuestasConsolidadas[index];
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
            color: '#000000',
            font: { size: 13, weight: 'bold', family: 'Roboto' },
            padding: { bottom: 8 },
          },
          legend: {
            position: 'bottom',
            labels: {
              color: '#000000',
              font: { size: 9, family: 'Roboto' },
              padding: 6,
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
                    fontColor: '#000000',
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

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = offscreen.width;
    finalCanvas.height = offscreen.height;
    const finalCtx = finalCanvas.getContext('2d')!;
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    finalCtx.drawImage(offscreen, 0, 0);

    const imgData = finalCanvas.toDataURL('image/jpeg', 0.85);
    tempChart.destroy();
    return imgData;
  }

  async descargarPDF() {
    Swal.fire({
      title: 'Generando PDF...',
      text: 'Por favor espera.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvases = document.querySelectorAll<HTMLCanvasElement>(
      "canvas[id^='grafica-cons-']",
    );
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210,
      pageHeight = 297,
      marginX = 15,
      marginY = 20,
      gap = 10;
    const imgWidth = pageWidth - marginX * 2;
    const imgHeight = (pageHeight - marginY * 2 - gap) / 2;
    let row = 0;

    canvases.forEach((canvas, index) => {
      if (index > 0 && index % 2 === 0) {
        pdf.addPage();
        row = 0;
      }
      const imgData = this.canvasParaPDF(canvas, index);
      pdf.addImage(
        imgData,
        'JPEG',
        marginX,
        marginY + row * (imgHeight + gap),
        imgWidth,
        imgHeight,
      );
      row++;
    });

    const nombre = `graficas consolidadas - ${this.nombreEncuesta1} & ${this.nombreEncuesta2}.pdf`;
    pdf.save(nombre);
    Swal.close();
  }

  regresarMenu() {
    this.mostrarFormulario = true;
    this.mostrarGraficas = false;
    this.respuestasArchivo1 = null;
    this.respuestasArchivo2 = null;
  }
}
