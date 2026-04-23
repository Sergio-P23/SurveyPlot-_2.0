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
import ExcelJS from 'exceljs';
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

    if (filaInicio !== filaFin && colInicio !== colFin) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango inválido',
        text: 'Debe ser una sola fila (E1 → O1) o una sola columna (B12 → B22).',
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

          if (celdaInicio.r === celdaFin.r) {
            for (let col = celdaInicio.c; col <= celdaFin.c; col++) {
              const valor = jsonData[celdaInicio.r]?.[col];
              if (valor) preguntas.push(String(valor).trim());
            }
          } else if (celdaInicio.c === celdaFin.c) {
            for (let row = celdaInicio.r; row <= celdaFin.r; row++) {
              const valor = jsonData[row]?.[celdaInicio.c];
              if (valor) preguntas.push(String(valor).trim());
            }
          } else {
            return reject(
              new Error('El rango debe ser una sola fila o columna'),
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
        title: 'Armando matriz Excel...',
        text: 'Generando el archivo.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.construirMatrizExcel(
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
            await page.render({ canvasContext: ctx, viewport, canvas } as any)
              .promise;

            const mitadH = Math.floor(canvas.height / 2);

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

  private async construirMatrizExcel(
    imagenesGestores: string[],
    imagenesEstudiantes: string[],
    imagenesConsolidado: string[],
  ) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Matriz Análisis', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    const totalPreguntas = this.preguntasExtraidas.length;

    // Orden columnas:
    // A: Ítem
    // B: Afirmación
    // C: Gráfica Gestores
    // D: Gráfica Estudiantes
    // E: Análisis Gestores (vacío)
    // F: Análisis Estudiantes (vacío)
    // G: Gráfica Consolidado
    // H: Análisis Consolidado (vacío)

    sheet.columns = [
      { key: 'item', width: 6 },
      { key: 'afirmacion', width: 42 },
      { key: 'grafGestores', width: 36 },
      { key: 'grafEstud', width: 36 },
      { key: 'anGestores', width: 32 },
      { key: 'anEstud', width: 32 },
      { key: 'grafConsol', width: 36 },
      { key: 'anConsol', width: 32 },
    ];

    // ── Fila 1: cabecera principal ──
    const cabecera = sheet.addRow([
      'ÍTEM',
      'AFIRMACIÓN',
      'GESTORES DEL CONOCIMIENTO Y APRENDIZAJE',
      'ESTUDIANTES',
      'ANÁLISIS GRÁFICA GESTORES DEL CONOCIMIENTO Y APRENDIZAJE',
      'ANÁLISIS GRÁFICA ESTUDIANTES',
      'CONSOLIDADO DE LAS GRÁFICAS',
      'ANÁLISIS GRÁFICA CONSOLIDADOS',
    ]);

    cabecera.height = 35;
    cabecera.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF16213A' },
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 8,
        name: 'Calibri',
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF8888AA' } },
        left: { style: 'medium', color: { argb: 'FF8888AA' } },
        bottom: { style: 'medium', color: { argb: 'FF8888AA' } },
        right: { style: 'medium', color: { argb: 'FF8888AA' } },
      };
    });

    // ── Fila 2: subcabecera POBLACIÓN TOTAL: N ──
    const subCabecera = sheet.addRow([
      '',
      '',
      '',
      '',
      'POBLACIÓN TOTAL: N',
      'POBLACIÓN TOTAL: N',
      '',
      'POBLACIÓN TOTAL: N',
    ]);

    subCabecera.height = 18;
    subCabecera.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const conSub = [5, 6, 8].includes(colNumber);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: conSub ? 'FF1E2D4A' : 'FF16213A' },
      };
      cell.font = { color: { argb: 'FFAABBCC' }, size: 7, name: 'Calibri' };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF8888AA' } },
        left: { style: 'thin', color: { argb: 'FF8888AA' } },
        bottom: { style: 'medium', color: { argb: 'FF8888AA' } },
        right: { style: 'thin', color: { argb: 'FF8888AA' } },
      };
    });

    const rowHeightPts = 165;

    for (let i = 0; i < totalPreguntas; i++) {
      const rowNum = i + 3; // filas 1 y 2 son cabeceras

      const fila = sheet.addRow([
        i + 1,
        this.preguntasExtraidas[i] || '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);

      fila.height = rowHeightPts;

      fila.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
      fila.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      fila.getCell(2).font = { size: 8, name: 'Calibri' };
      fila.getCell(2).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };

      fila.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
      });

      // ── Insertar imágenes ──
      const insertarImagen = (base64: string, colIndex: number) => {
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const imgId = workbook.addImage({
          base64: base64Data,
          extension: 'jpeg',
        });
        sheet.addImage(imgId, {
          tl: { col: colIndex - 0.95, row: rowNum - 0.95 } as any,
          ext: { width: 215, height: 158 },
          editAs: 'oneCell',
        });
      };

      if (imagenesGestores[i]) insertarImagen(imagenesGestores[i], 3); // col C
      if (imagenesEstudiantes[i]) insertarImagen(imagenesEstudiantes[i], 4); // col D
      if (imagenesConsolidado[i]) insertarImagen(imagenesConsolidado[i], 7); // col G
    }

    // ── Descargar ──
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matriz-analisis.xlsx';
    a.click();
    URL.revokeObjectURL(url);

    Swal.close();

    await Swal.fire({
      icon: 'success',
      title: '¡Matriz generada!',
      html: `
        <p>Se generó la matriz Excel con <b>${totalPreguntas} afirmaciones</b>.</p>
        <p style="font-size:0.85rem; color:#888; margin-top:8px">
          Las columnas E, F y H están vacías para completar el análisis.
        </p>
      `,
      confirmButtonText: '¡Listo!',
      confirmButtonColor: '#00d68f',
    });
  }

  volverPaso1() {
    this.pasoActual = 1;
  }
}
