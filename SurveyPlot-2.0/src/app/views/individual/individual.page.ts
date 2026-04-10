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
// Reemplaza: import QRious from 'qrious';
import QRious from 'qrious';

Chart.register(...registerables);

const supabase = createClient(
  'https://zdpycybjhkbvqdxvriib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcHljeWJqaGtidnFkeHZyaWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTc1MzcsImV4cCI6MjA3Njg5MzUzN30.48IuQYYgzeFz0E8NP4_wSvZAVEioPsAd6TynnzJTbBA',
  { auth: { persistSession: false, autoRefreshToken: false } },
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

  async generarGraficas() {
    if (!this.nombreEncuesta.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Por favor ingresa el nombre de la encuesta antes de continuar.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (!this.archivoSeleccionado) {
      await Swal.fire({
        icon: 'warning',
        title: 'Archivo no seleccionado',
        text: 'Por favor selecciona un archivo Excel antes de continuar.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const colInicio = this.columnaInicio.trim().toUpperCase();
    if (!colInicio || !/^[A-Z]$/.test(colInicio)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Columna inválida',
        text: 'La columna de la primera pregunta debe ser una sola letra (Ej: E).',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const colFin = this.columnaFin.trim().toUpperCase();
    if (!colFin || !/^[A-Z]$/.test(colFin)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Columna inválida',
        text: 'La columna de la última pregunta debe ser una sola letra (Ej: M).',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const abecedario = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    if (abecedario.indexOf(colInicio) > abecedario.indexOf(colFin)) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango de columnas incorrecto',
        text: `La columna "${colInicio}" no puede ser mayor que "${colFin}".`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const filInicio = parseInt(this.filaInicio);
    const filFin = parseInt(this.filaFin);

    if (!this.filaInicio.trim() || isNaN(filInicio) || filInicio < 1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Fila inválida',
        text: 'La fila de inicio debe ser un número válido mayor a 0 (Ej: 2).',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (!this.filaFin.trim() || isNaN(filFin) || filFin < 1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Fila inválida',
        text: 'La fila de fin debe ser un número válido mayor a 0 (Ej: 42).',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (filInicio > filFin) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango de filas incorrecto',
        text: `La fila de inicio (${filInicio}) no puede ser mayor que la fila de fin (${filFin}).`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const totalPreguntas =
      abecedario.indexOf(colFin) - abecedario.indexOf(colInicio) + 1;
    const totalRespuestas = filFin - filInicio + 1;

    const confirmar = await Swal.fire({
      icon: 'question',
      title: '¿Los datos son correctos?',
      html: `
        <table style="width:100%; text-align:left; border-collapse:collapse; font-size:0.9rem;">
          <tr><td style="padding:6px; color:#888">Encuesta</td><td style="padding:6px"><b>${this.nombreEncuesta}</b></td></tr>
          <tr style="background:rgba(0,0,0,0.03)"><td style="padding:6px; color:#888">Archivo</td><td style="padding:6px"><b>${this.archivoSeleccionado.name}</b></td></tr>
          <tr><td style="padding:6px; color:#888">Primera pregunta</td><td style="padding:6px"><b>Columna ${colInicio}, Fila ${filInicio}</b></td></tr>
          <tr style="background:rgba(0,0,0,0.03)"><td style="padding:6px; color:#888">Última pregunta</td><td style="padding:6px"><b>Columna ${colFin}, Fila ${filFin}</b></td></tr>
          <tr><td style="padding:6px; color:#888">Total preguntas</td><td style="padding:6px"><b>${totalPreguntas} columnas × ${totalRespuestas} filas (${totalPreguntas} preguntas - ${totalRespuestas} respuestas)</b></td></tr>
        </table>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Corregir datos',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    });

    if (!confirmar.isConfirmed) return;

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
      try {
        const datos = new Uint8Array(e.target.result);
        const libroTrabajo = XLSX.read(datos, { type: 'array' });
        const hojarespuestas = libroTrabajo.SheetNames[0];
        const sheet = libroTrabajo.Sheets[hojarespuestas];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
        });

        const indiceColInicio = XLSX.utils.decode_col(colInicio);
        const indiceColFin = XLSX.utils.decode_col(colFin);
        const totalFilas = jsonData.length;

        if (filInicio > totalFilas) {
          Swal.fire({
            icon: 'error',
            title: 'Fila fuera de rango',
            text: `El archivo solo tiene ${totalFilas} filas pero indicaste que las respuestas inician en la fila ${filInicio}.`,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#3085d6',
          });
          return;
        }

        const respuestasPosibles = [
          'Totalmente en desacuerdo',
          'En desacuerdo',
          'Ni de acuerdo, ni en desacuerdo',
          'De acuerdo',
          'Totalmente de acuerdo',
        ];

        let totalRespuestasEncontradas = 0;
        for (let col = indiceColInicio; col <= indiceColFin; col++) {
          for (
            let fila = filInicio - 1;
            fila < Math.min(filFin, totalFilas);
            fila++
          ) {
            if (respuestasPosibles.includes(jsonData[fila]?.[col])) {
              totalRespuestasEncontradas++;
            }
          }
        }

        if (totalRespuestasEncontradas === 0) {
          Swal.fire({
            icon: 'error',
            title: 'Sin datos válidos',
            text: `No se encontraron respuestas en el rango especificado (Columna ${colInicio}${filInicio} → ${colFin}${filFin}). Verifica que las columnas y filas sean correctas.`,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#3085d6',
          });
          return;
        }

        this.respuestasProcesadas = this.procesarRespuestas(
          jsonData,
          colInicio,
          colFin,
          filInicio,
          filFin,
        );
        this.alertaProcesado();
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'Archivo inválido',
          text: 'No se pudo leer el archivo. Asegúrate de que sea un Excel válido (.xlsx o .xls).',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3085d6',
        });
      }
    };

    reader.onerror = () => {
      Swal.fire({
        icon: 'error',
        title: 'Error de lectura',
        text: 'Ocurrió un error al leer el archivo. Intenta de nuevo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
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

  private canvasParaPDF(canvas: HTMLCanvasElement, index: number): string {
    const offscreen = document.createElement('canvas');
    offscreen.width = 800;
    offscreen.height = 500;
    const ctx = offscreen.getContext('2d')!;

    // Fondo blanco PRIMERO antes de cualquier cosa
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

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
            color: '#000000',
            font: { size: 18, weight: 'bold', family: 'Roboto' },
            padding: { bottom: 10 },
          },
          legend: {
            position: 'bottom',
            labels: {
              color: '#000000',
              font: { size: 12, family: 'Roboto' },
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

    // Crear un segundo canvas para combinar fondo blanco + chart
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = offscreen.width;
    finalCanvas.height = offscreen.height;
    const finalCtx = finalCanvas.getContext('2d')!;

    // 1. Fondo blanco
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // 2. Chart encima
    finalCtx.drawImage(offscreen, 0, 0);

    const imgData = finalCanvas.toDataURL('image/jpeg', 0.85);
    tempChart.destroy();
    return imgData;
  }

  private buildPDF(): jsPDF {
    const canvases = document.querySelectorAll<HTMLCanvasElement>(
      "canvas[id^='grafica-']",
    );
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210,
      pageHeight = 297,
      marginX = 15,
      marginY = 20,
      gap = 10;
    const imgWidth = pageWidth - marginX * 2;
    const imgHeight = (pageHeight - marginY * 2 - gap) / 2 - 5;
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
    return pdf;
  }

  async descargarPDF() {
    Swal.fire({
      title: 'Generando PDF...',
      text: 'Por favor espera.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const pdf = this.buildPDF();
    pdf.save(`graficas - ${this.nombreEncuesta}.pdf`);
    Swal.close();
  }

  async subirPDF() {
    Swal.fire({
      title: 'Generando PDF...',
      text: 'Por favor espera.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const pdf = this.buildPDF();
    const nameEncuesta = this.nombreEncuesta.trim() || 'Encuesta';
    const pdfBlob = pdf.output('blob');
    const fileName = `${nameEncuesta
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}.pdf`;

    Swal.fire({
      title: 'Subiendo PDF...',
      text: 'Conectando con el servidor.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const { data, error } = await supabase.storage
      .from('Individual-Bucket')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('Supabase error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al subir',
        html: `
        <p>No se pudo subir el PDF.</p>
        <small style="color:#888">${error.message}</small>
      `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('Individual-Bucket')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    Swal.fire({
      title: '<strong>PDF cargado correctamente</strong>',
      icon: 'success',
      html: `
    <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
      <p style="margin:0">¡Escanea el QR para abrir el PDF en tu navegador!</p>
       <div style="width:100%; display:flex; justify-content:center;">
      <canvas id="qr-pdf" style="margin:0 0 0 40px;"></canvas>
    </div>
      <small>
        <a href="${publicUrl}" target="_blank" style="color:#3085d6; font-weight:bold;">
          También puedes abrirlo aquí
        </a>
      </small>
    </div>
  `,
      confirmButtonText: '¡Continuar!',
      didOpen: () => {
        setTimeout(() => {
          const canvas = document.getElementById('qr-pdf') as HTMLCanvasElement;
          if (!canvas) return;
          try {
            new QRious({
              element: canvas,
              value: publicUrl,
              size: 200,
              padding: 20,
              level: 'H',
              foreground: '#000000',
              background: '#ffffff',
            });
          } catch (e) {
            console.error('Error generando QR:', e);
          }
        }, 300);
      },
    });
  }

  regresarMenu() {
    this.mostrarFormulario = true;
    this.mostrarGraficas = false;
  }
}
