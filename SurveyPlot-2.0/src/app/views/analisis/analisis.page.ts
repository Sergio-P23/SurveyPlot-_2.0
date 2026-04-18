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
  documentOutline,
} from 'ionicons/icons';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

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
  @ViewChild('pdfInputGestores') pdfInputGestores!: ElementRef;
  @ViewChild('pdfInputEstudiantes') pdfInputEstudiantes!: ElementRef;
  @ViewChild('pdfInputConsolidado') pdfInputConsolidado!: ElementRef;

  pasoActual: number = 1;

  // Paso 1
  archivoPaso1: File | null = null;
  nombreArchivoPaso1: string = 'Elegir archivo Excel';
  celdaInicio: string = '';
  celdaFin: string = '';
  preguntasExtraidas: string[] = [];

  // Paso 2
  pdfGestores: File | null = null;
  nombrePdfGestores: string = 'Elegir PDF de Gestores';
  pdfEstudiantes: File | null = null;
  nombrePdfEstudiantes: string = 'Elegir PDF de Estudiantes';
  pdfConsolidado: File | null = null;
  nombrePdfConsolidado: string = 'Elegir PDF Consolidado';

  constructor() {
    addIcons({
      barChartOutline,
      cloudUploadOutline,
      checkmarkOutline,
      helpCircleOutline,
      checkmarkCircleOutline,
      chevronDownOutline,
      documentOutline,
    });
  }

  triggerFile1() {
    this.fileInput1.nativeElement.click();
  }
  triggerPdfGestores() {
    this.pdfInputGestores.nativeElement.click();
  }
  triggerPdfEstudiantes() {
    this.pdfInputEstudiantes.nativeElement.click();
  }
  triggerPdfConsolidado() {
    this.pdfInputConsolidado.nativeElement.click();
  }

  onArchivoPaso1(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoPaso1 = file;
      this.nombreArchivoPaso1 = file.name;
    }
  }
  onPdfGestores(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.pdfGestores = file;
      this.nombrePdfGestores = file.name;
    }
  }
  onPdfEstudiantes(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.pdfEstudiantes = file;
      this.nombrePdfEstudiantes = file.name;
    }
  }
  onPdfConsolidado(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.pdfConsolidado = file;
      this.nombrePdfConsolidado = file.name;
    }
  }

  // ─── PASO 1 ───────────────────────────────────────────────
  async irPaso2() {
    if (!this.archivoPaso1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Archivo requerido',
        text: 'Selecciona el archivo Excel de preguntas.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    const regexCelda = /^[A-Za-z]+\d+$/;
    if (!this.celdaInicio.trim() || !regexCelda.test(this.celdaInicio.trim())) {
      await Swal.fire({
        icon: 'warning',
        title: 'Celda de inicio inválida',
        text: 'Ingresa una celda válida como "E1" o "E3".',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }
    if (!this.celdaFin.trim() || !regexCelda.test(this.celdaFin.trim())) {
      await Swal.fire({
        icon: 'warning',
        title: 'Celda de fin inválida',
        text: 'Ingresa una celda válida como "O1" o "O3".',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    const celdaInicioUpper = this.celdaInicio.trim().toUpperCase();
    const celdaFinUpper = this.celdaFin.trim().toUpperCase();
    const matchInicio = celdaInicioUpper.match(/^([A-Z]+)(\d+)$/);
    const matchFin = celdaFinUpper.match(/^([A-Z]+)(\d+)$/);
    if (!matchInicio || !matchFin) return;

    const colInicio = matchInicio[1];
    const filaInicio = parseInt(matchInicio[2]);
    const colFin = matchFin[1];
    const filaFin = parseInt(matchFin[2]);

    // Validar rango válido (fila o columna)
    if (filaInicio !== filaFin && colInicio !== colFin) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango inválido',
        text: `Debe ser una sola fila (E1 → O1) o una sola columna (B12 → B22).`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    const idxColInicio = XLSX.utils.decode_col(colInicio);
    const idxColFin = XLSX.utils.decode_col(colFin);
    if (idxColInicio > idxColFin) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango incorrecto',
        text: `La columna "${colInicio}" no puede ser mayor que "${colFin}".`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    Swal.fire({
      title: 'Leyendo archivo...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const preguntas = await this.extraerPreguntas(
        this.archivoPaso1,
        celdaInicioUpper,
        celdaFinUpper,
      );

      if (preguntas.length === 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Sin preguntas',
          text: `No se encontraron datos en el rango ${celdaInicioUpper} → ${celdaFinUpper}.`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#00d68f',
        });
        return;
      }

      this.preguntasExtraidas = preguntas;

      await Swal.fire({
        icon: 'success',
        title: '¡Preguntas extraídas!',
        html: `
          <p>Se encontraron <b>${preguntas.length} preguntas</b>:</p>
          <div style="max-height:200px; overflow-y:auto; text-align:left; margin-top:10px;">
            ${preguntas.map((p, i) => `<div style="padding:4px 0; border-bottom:1px solid rgba(0,0,0,0.05); font-size:0.85rem;"><b>${i + 1}.</b> ${p}</div>`).join('')}
          </div>
        `,
        confirmButtonText: 'Continuar al Paso 2',
        confirmButtonColor: '#00d68f',
      });

      this.pasoActual = 2;
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error al leer',
        text: 'No se pudo leer el archivo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
    }
  }

  private extraerPreguntas(
    file: File,
    inicio: string,
    fin: string,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const datos = new Uint8Array(e.target.result);
          const libro = XLSX.read(datos, { type: 'array' });
          const hoja = libro.Sheets[libro.SheetNames[0]];

          const jsonData: any[][] = XLSX.utils.sheet_to_json(hoja, {
            header: 1,
          });

          const celdaInicio = XLSX.utils.decode_cell(inicio);
          const celdaFin = XLSX.utils.decode_cell(fin);

          const preguntas: string[] = [];

          // 🔹 Caso 1: MISMA FILA (horizontal)
          if (celdaInicio.r === celdaFin.r) {
            for (let col = celdaInicio.c; col <= celdaFin.c; col++) {
              const valor = jsonData[celdaInicio.r]?.[col];
              if (valor) preguntas.push(String(valor).trim());
            }
          }

          // 🔹 Caso 2: MISMA COLUMNA (vertical)
          else if (celdaInicio.c === celdaFin.c) {
            for (let row = celdaInicio.r; row <= celdaFin.r; row++) {
              const valor = jsonData[row]?.[celdaInicio.c];
              if (valor) preguntas.push(String(valor).trim());
            }
          }

          // ❌ Caso inválido
          else {
            return reject(
              new Error('El rango debe ser una sola fila o una sola columna'),
            );
          }

          resolve(preguntas);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Error de lectura'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ─── PASO 2 ───────────────────────────────────────────────
  async generarMatriz() {
    if (!this.pdfGestores) {
      await Swal.fire({
        icon: 'warning',
        title: 'PDF requerido',
        text: 'Sube el PDF de Gestores.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }
    if (!this.pdfEstudiantes) {
      await Swal.fire({
        icon: 'warning',
        title: 'PDF requerido',
        text: 'Sube el PDF de Estudiantes.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }
    if (!this.pdfConsolidado) {
      await Swal.fire({
        icon: 'warning',
        title: 'PDF requerido',
        text: 'Sube el PDF Consolidado.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    Swal.fire({
      title: 'Extrayendo gráficas...',
      text: 'Esto puede tomar unos segundos.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const [imagenesGestores, imagenesEstudiantes, imagenesConsolidado] =
        await Promise.all([
          this.extraerImagenesDePDF(this.pdfGestores),
          this.extraerImagenesDePDF(this.pdfEstudiantes),
          this.extraerImagenesDePDF(this.pdfConsolidado),
        ]);

      Swal.fire({
        title: 'Armando matriz...',
        text: 'Generando el PDF final.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.construirMatrizPDF(
        imagenesGestores,
        imagenesEstudiantes,
        imagenesConsolidado,
      );
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'No se pudo generar la matriz.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
    }
  }

  private extraerImagenesDePDF(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const arrayBuffer = e.target.result;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const imagenes: string[] = [];

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.5 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({
              canvasContext: ctx,
              viewport,
              canvas, // ← agrega esto
            } as any).promise;

            // Cada página tiene 2 gráficas — cortar en mitad superior e inferior
            const mitadH = Math.floor(canvas.height / 2);

            // Gráfica superior
            const top = document.createElement('canvas');
            top.width = canvas.width;
            top.height = mitadH;
            const ctxTop = top.getContext('2d')!;
            ctxTop.fillStyle = '#ffffff';
            ctxTop.fillRect(0, 0, top.width, top.height);
            ctxTop.drawImage(
              canvas,
              0,
              0,
              canvas.width,
              mitadH,
              0,
              0,
              canvas.width,
              mitadH,
            );
            imagenes.push(top.toDataURL('image/jpeg', 0.92));

            // Gráfica inferior
            const bot = document.createElement('canvas');
            bot.width = canvas.width;
            bot.height = mitadH;
            const ctxBot = bot.getContext('2d')!;
            ctxBot.fillStyle = '#ffffff';
            ctxBot.fillRect(0, 0, bot.width, bot.height);
            ctxBot.drawImage(
              canvas,
              0,
              mitadH,
              canvas.width,
              mitadH,
              0,
              0,
              canvas.width,
              mitadH,
            );
            imagenes.push(bot.toDataURL('image/jpeg', 0.92));
          }

          resolve(imagenes);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo PDF'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async construirMatrizPDF(
    imagenesGestores: string[],
    imagenesEstudiantes: string[],
    imagenesConsolidado: string[],
  ) {
    // A4 Landscape: 297 x 210 mm
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageW = 297;
    const pageH = 210;
    const mX = 4; // margen horizontal
    const mY = 4; // margen vertical

    // Anchos de columna
    const colItem = 8;
    const colAfirmacion = 45;
    const colGrafica = (pageW - mX * 2 - colItem - colAfirmacion) / 3; // divide el resto en 3 iguales

    const headerH = 9;
    const filasPorPagina = 3;
    const rowH = (pageH - mY * 2 - headerH) / filasPorPagina;

    const totalPreguntas = this.preguntasExtraidas.length;

    const dibujarCabecera = () => {
      let x = mX;
      const y = mY;

      // Fondo cabecera
      pdf.setFillColor(22, 30, 55);
      pdf.rect(x, y, pageW - mX * 2, headerH, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');

      const centrar = (texto: string, xCol: number, wCol: number) => {
        pdf.text(texto, xCol + wCol / 2, y + headerH / 2 + 1, {
          align: 'center',
          baseline: 'middle',
        });
      };

      centrar('ÍTEM', x, colItem);
      x += colItem;
      centrar('AFIRMACIÓN', x, colAfirmacion);
      x += colAfirmacion;
      centrar('GESTORES DEL CONOCIMIENTO', x, colGrafica);
      x += colGrafica;
      centrar('ESTUDIANTES', x, colGrafica);
      x += colGrafica;
      centrar('CONSOLIDADO DE LAS GRÁFICAS', x, colGrafica);
    };

    const dibujarFila = (
      preguntaIdx: number,
      filaEnPagina: number,
      imgGestor: string | null,
      imgEstudiante: string | null,
      imgConsol: string | null,
    ) => {
      const y = mY + headerH + filaEnPagina * rowH;
      let x = mX;

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.25);

      // ── ÍTEM ──
      pdf.rect(x, y, colItem, rowH);
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(preguntaIdx + 1), x + colItem / 2, y + rowH / 2, {
        align: 'center',
        baseline: 'middle',
      });
      x += colItem;

      // ── AFIRMACIÓN ──
      pdf.rect(x, y, colAfirmacion, rowH);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(20, 20, 20);
      const texto = this.preguntasExtraidas[preguntaIdx] || '';
      const lineas = pdf.splitTextToSize(texto, colAfirmacion - 3);
      // Centrar verticalmente el texto
      const alturaTexto = lineas.length * 3.5;
      const yTexto = y + (rowH - alturaTexto) / 2 + 3;
      pdf.text(lineas, x + 2, yTexto);
      x += colAfirmacion;

      // Padding interno para imágenes
      const pad = 2;
      const imgW = colGrafica - pad * 2;
      const imgH = rowH - pad * 2;

      // ── GESTORES ──
      pdf.rect(x, y, colGrafica, rowH);
      if (imgGestor) {
        pdf.addImage(imgGestor, 'JPEG', x + pad, y + pad, imgW, imgH);
      }
      x += colGrafica;

      // ── ESTUDIANTES ──
      pdf.rect(x, y, colGrafica, rowH);
      if (imgEstudiante) {
        pdf.addImage(imgEstudiante, 'JPEG', x + pad, y + pad, imgW, imgH);
      }
      x += colGrafica;

      // ── CONSOLIDADO ──
      pdf.rect(x, y, colGrafica, rowH);
      if (imgConsol) {
        pdf.addImage(imgConsol, 'JPEG', x + pad, y + pad, imgW, imgH);
      }
    };

    // ── Generar páginas ──
    for (let i = 0; i < totalPreguntas; i++) {
      const filaEnPagina = i % filasPorPagina;

      if (filaEnPagina === 0) {
        if (i > 0) pdf.addPage();
        dibujarCabecera();
      }

      dibujarFila(
        i,
        filaEnPagina,
        imagenesGestores[i] ?? null,
        imagenesEstudiantes[i] ?? null,
        imagenesConsolidado[i] ?? null,
      );
    }

    pdf.save('matriz-analisis.pdf');
    Swal.close();

    await Swal.fire({
      icon: 'success',
      title: '¡Matriz generada!',
      html: `<p>Se generó la matriz con <b>${totalPreguntas} afirmaciones</b> en <b>${Math.ceil(totalPreguntas / filasPorPagina)} páginas</b>.</p>`,
      confirmButtonText: '¡Listo!',
      confirmButtonColor: '#00d68f',
    });
  }

  volverPaso1() {
    this.pasoActual = 1;
  }
}
