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
import * as ExcelJS from 'exceljs';
import type { Cell } from 'exceljs';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DatosLikert {
  ta: number;
  cantTa: number;
  a: number;
  cantA: number;
  n: number;
  cantN: number;
  d: number;
  cantD: number;
  td: number;
  cantTd: number;
  total: number;
}

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

  archivoPaso1: File | null = null;
  nombreArchivoPaso1: string = 'Elegir archivo Excel';
  celdaInicio: string = '';
  celdaFin: string = '';
  preguntasExtraidas: string[] = [];

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

  onArchivoPaso1(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.archivoPaso1 = file;
      this.nombreArchivoPaso1 = file.name;
    }
  }
  onPdfGestores(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.pdfGestores = file;
      this.nombrePdfGestores = file.name;
    }
  }
  onPdfEstudiantes(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.pdfEstudiantes = file;
      this.nombrePdfEstudiantes = file.name;
    }
  }
  onPdfConsolidado(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.pdfConsolidado = file;
      this.nombrePdfConsolidado = file.name;
    }
  }

  // ─── PASO 1 ───────────────────────────────────────────────────────────────

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
          <div style="max-height:200px;overflow-y:auto;text-align:left;margin-top:10px;">
            ${preguntas.map((p, i) => `<div style="padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.05);font-size:0.85rem;"><b>${i + 1}.</b> ${p}</div>`).join('')}
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
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const datos = new Uint8Array(e.target!.result as ArrayBuffer);
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

  // ─── PASO 2 ───────────────────────────────────────────────────────────────

  async generarMatriz() {
    if (!this.pdfGestores || !this.pdfEstudiantes || !this.pdfConsolidado) {
      await Swal.fire({
        icon: 'warning',
        title: 'PDFs requeridos',
        text: 'Sube los tres PDFs antes de continuar.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    Swal.fire({
      title: 'Renderizando PDFs...',
      text: 'Convirtiendo páginas a imágenes.',
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

      const total =
        imagenesGestores.length +
        imagenesEstudiantes.length +
        imagenesConsolidado.length;
      let procesadas = 0;

      const actualizarProgreso = (label: string) => {
        procesadas++;
        Swal.update({
          title: `OCR en progreso... (${procesadas}/${total})`,
          text: label,
        });
      };

      Swal.fire({
        title: `OCR en progreso... (0/${total})`,
        text: 'Leyendo leyendas de las gráficas...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // OCR secuencial para no saturar el worker
      const datosGestores: DatosLikert[] = [];
      for (let i = 0; i < imagenesGestores.length; i++) {
        actualizarProgreso(`Gestores – gráfica ${i + 1}`);
        datosGestores.push(await this.ocr_y_parsear(imagenesGestores[i]));
      }

      const datosEstudiantes: DatosLikert[] = [];
      for (let i = 0; i < imagenesEstudiantes.length; i++) {
        actualizarProgreso(`Estudiantes – gráfica ${i + 1}`);
        datosEstudiantes.push(await this.ocr_y_parsear(imagenesEstudiantes[i]));
      }

      const datosConsolidado: DatosLikert[] = [];
      for (let i = 0; i < imagenesConsolidado.length; i++) {
        actualizarProgreso(`Consolidado – gráfica ${i + 1}`);
        datosConsolidado.push(await this.ocr_y_parsear(imagenesConsolidado[i]));
      }

      const pobTotalGestores = datosGestores[0]?.total || 0;
      const pobTotalEstudiantes = datosEstudiantes[0]?.total || 0;
      const pobTotalConsol = pobTotalGestores + pobTotalEstudiantes;

      const analisisGestores = datosGestores.map((d, i) =>
        this.generarTextoAnalisis(
          d,
          i + 1,
          'gestores del conocimiento y aprendizaje',
        ),
      );
      const analisisEstudiantes = datosEstudiantes.map((d, i) =>
        this.generarTextoAnalisis(d, i + 1, 'estudiantes'),
      );
      const analisisConsolidado = datosConsolidado.map((d, i) =>
        this.generarTextoAnalisis(d, i + 1, 'población consolidada'),
      );

      Swal.fire({
        title: 'Armando matriz Excel...',
        text: 'Generando el archivo final.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await new Promise((resolve) => setTimeout(resolve, 80));

      await this.construirMatrizExcel(
        imagenesGestores,
        imagenesEstudiantes,
        imagenesConsolidado,
        analisisGestores,
        analisisEstudiantes,
        analisisConsolidado,
        pobTotalGestores,
        pobTotalEstudiantes,
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

  // ─── OCR con Tesseract ────────────────────────────────────────────────────

  private async ocr_y_parsear(imagenBase64: string): Promise<DatosLikert> {
    try {
      const worker = await Tesseract.createWorker('spa');
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
      });
      const {
        data: { text },
      } = await worker.recognize(imagenBase64);
      await worker.terminate();
      return this.parsearLeyenda(text);
    } catch {
      return this.datoVacio();
    }
  }

  private parsearLeyenda(texto: string): DatosLikert {
    const t = texto.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
    const tLower = t.toLowerCase();

    // Regex: captura pares CANTIDAD (PORCENTAJE%) en la leyenda
    const patron = /(\d[\d.,]*)\s*\(\s*(\d[\d.,]*)\s*%\s*\)/g;
    const matches: Array<{ cant: number; porc: number; pos: number }> = [];

    let m: RegExpExecArray | null;
    while ((m = patron.exec(t)) !== null) {
      const cant = parseFloat(m[1].replace(',', '.'));
      const porc = parseFloat(m[2].replace(',', '.'));
      if (!isNaN(cant) && !isNaN(porc)) {
        matches.push({ cant, porc, pos: m.index });
      }
    }

    if (matches.length === 0) return this.datoVacio();

    const categorias = {
      ta: 0,
      cantTa: 0,
      a: 0,
      cantA: 0,
      n: 0,
      cantN: 0,
      d: 0,
      cantD: 0,
      td: 0,
      cantTd: 0,
    };

    const asignar = (pos: number, cant: number, porc: number) => {
      const inicio = Math.max(0, pos - 90);
      const contexto = tLower.substring(inicio, pos);

      if (
        /totalmente\s+de\s+acuerdo/.test(contexto) &&
        !/en\s+desacuerdo/.test(contexto)
      ) {
        if (!categorias.cantTa) {
          categorias.cantTa = cant;
          categorias.ta = porc;
        }
      } else if (/ni\s+de\s+acuerdo/.test(contexto)) {
        if (!categorias.cantN) {
          categorias.cantN = cant;
          categorias.n = porc;
        }
      } else if (/totalmente\s+en\s+desacuerdo/.test(contexto)) {
        if (!categorias.cantTd) {
          categorias.cantTd = cant;
          categorias.td = porc;
        }
      } else if (/en\s+desacuerdo/.test(contexto)) {
        if (!categorias.cantD) {
          categorias.cantD = cant;
          categorias.d = porc;
        }
      } else if (/de\s+acuerdo/.test(contexto)) {
        if (!categorias.cantA) {
          categorias.cantA = cant;
          categorias.a = porc;
        }
      }
    };

    for (const match of matches) {
      asignar(match.pos, match.cant, match.porc);
    }

    // Fallback posicional si el OCR no reconoció palabras clave
    const asignadas = [
      categorias.cantTa,
      categorias.cantA,
      categorias.cantN,
      categorias.cantD,
      categorias.cantTd,
    ].filter((v) => v > 0).length;

    if (asignadas < 3 && matches.length >= 5) {
      categorias.cantTa = matches[0].cant;
      categorias.ta = matches[0].porc;
      categorias.cantA = matches[1].cant;
      categorias.a = matches[1].porc;
      categorias.cantN = matches[2].cant;
      categorias.n = matches[2].porc;
      categorias.cantD = matches[3].cant;
      categorias.d = matches[3].porc;
      categorias.cantTd = matches[4].cant;
      categorias.td = matches[4].porc;
    }

    const total = Math.round(
      categorias.cantTa +
        categorias.cantA +
        categorias.cantN +
        categorias.cantD +
        categorias.cantTd,
    );

    return { ...categorias, total };
  }

  private datoVacio(): DatosLikert {
    return {
      ta: 0,
      cantTa: 0,
      a: 0,
      cantA: 0,
      n: 0,
      cantN: 0,
      d: 0,
      cantD: 0,
      td: 0,
      cantTd: 0,
      total: 0,
    };
  }

  // ─── Generador de texto de análisis ──────────────────────────────────────

  private generarTextoAnalisis(
    datos: DatosLikert,
    numAfirmacion: number,
    nombrePoblacion: string,
  ): string {
    if (datos.total === 0) {
      return `No se pudieron extraer datos de la gráfica ${numAfirmacion} para ${nombrePoblacion}.`;
    }

    const total = datos.total;
    const cantidades = this.ajustarRedondeo(
      [datos.ta, datos.a, datos.n, datos.d, datos.td],
      total,
    );
    const [cantTa, cantA, cantN, cantD, cantTd] = cantidades;

    const fmt = (n: number): string =>
      Number.isInteger(n) ? String(n) : n.toFixed(1);

    const porcPos = parseFloat((datos.ta + datos.a).toFixed(1));
    const porcNeg = parseFloat((datos.n + datos.d + datos.td).toFixed(1));
    const cantPos = cantTa + cantA;
    const cantNeg = total - cantPos;

    return (
      `Población total consultada: ${total} ${nombrePoblacion}. ` +
      `Percepción de la afirmación ${numAfirmacion}: ` +
      `El ${fmt(datos.ta)}% (${cantTa} ${nombrePoblacion}) están totalmente de acuerdo, ` +
      `el ${fmt(datos.a)}% (${cantA} ${nombrePoblacion}) están de acuerdo, ` +
      `el ${fmt(datos.n)}% (${cantN} ${nombrePoblacion}) están ni de acuerdo, ni en desacuerdo, ` +
      `el ${fmt(datos.d)}% (${cantD} ${nombrePoblacion}) están en desacuerdo ` +
      `y el ${fmt(datos.td)}% (${cantTd} ${nombrePoblacion}) están totalmente en desacuerdo. ` +
      `En suma, el ${fmt(porcPos)}% (${cantPos} ${nombrePoblacion}) tienen una percepción positiva ` +
      `y el ${fmt(porcNeg)}% (${cantNeg} ${nombrePoblacion}) no la perciben positiva.`
    );
  }

  /**
   * Algoritmo Largest Remainder (Hamilton):
   * garantiza que la suma de enteros == total exacto.
   */
  private ajustarRedondeo(porcentajes: number[], total: number): number[] {
    // Si no hay total válido, devolver ceros
    if (total <= 0) return porcentajes.map(() => 0);

    const exactos = porcentajes.map((p) => (p / 100) * total);
    const pisos = exactos.map(Math.floor);
    const restos = exactos.map((v, i) => ({ resto: v - pisos[i], idx: i }));

    let suma = pisos.reduce((a, b) => a + b, 0);
    let faltante = total - suma;

    // Puede ser negativo si los porcentajes suman >100 por redondeo OCR
    if (faltante === 0) return pisos;

    restos.sort((a, b) => b.resto - a.resto);

    if (faltante > 0) {
      // Sumar 1 a los de mayor resto
      for (let i = 0; i < faltante && i < restos.length; i++) {
        pisos[restos[i].idx]++;
      }
    } else {
      // Restar 1 a los de menor resto (faltante negativo)
      restos.sort((a, b) => a.resto - b.resto);
      for (let i = 0; i < Math.abs(faltante) && i < restos.length; i++) {
        pisos[restos[i].idx] = Math.max(0, pisos[restos[i].idx] - 1);
      }
    }

    return pisos;
  }

  // ─── Renderizar PDF → imágenes ────────────────────────────────────────────

  private extraerImagenesDePDF(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const arrayBuffer = e.target!.result as ArrayBuffer;
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
            await page.render({ canvasContext: ctx, viewport } as any).promise;

            const mitadH = Math.floor(canvas.height / 2);

            const recortar = (offsetY: number): string => {
              const c = document.createElement('canvas');
              c.width = canvas.width;
              c.height = mitadH;
              const cx = c.getContext('2d')!;
              cx.fillStyle = '#ffffff';
              cx.fillRect(0, 0, c.width, c.height);
              cx.drawImage(
                canvas,
                0,
                offsetY,
                canvas.width,
                mitadH,
                0,
                0,
                canvas.width,
                mitadH,
              );
              return c.toDataURL('image/jpeg', 0.92);
            };

            imagenes.push(recortar(0));
            imagenes.push(recortar(mitadH));
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

  // ─── Construir Excel ──────────────────────────────────────────────────────

  private async construirMatrizExcel(
    imagenesGestores: string[],
    imagenesEstudiantes: string[],
    imagenesConsolidado: string[],
    analisisGestores: string[],
    analisisEstudiantes: string[],
    analisisConsolidado: string[],
    pobTotalGestores: number,
    pobTotalEstudiantes: number,
  ) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Matriz Análisis', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    const totalPreguntas = this.preguntasExtraidas.length;
    const pobTotalConsol = pobTotalGestores + pobTotalEstudiantes;

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

    // ── Fila 1: cabecera ──────────────────────────────────────────────────────
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
    cabecera.eachCell((cell: Cell) => {
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

    // ── Fila 2: subcabecera con poblaciones totales ───────────────────────────
    const subCabecera = sheet.addRow([
      '',
      '',
      '',
      '',
      pobTotalGestores > 0
        ? `POBLACIÓN TOTAL: ${pobTotalGestores}`
        : 'POBLACIÓN TOTAL: N/D',
      pobTotalEstudiantes > 0
        ? `POBLACIÓN TOTAL: ${pobTotalEstudiantes}`
        : 'POBLACIÓN TOTAL: N/D',
      '',
      pobTotalConsol > 0
        ? `POBLACIÓN TOTAL: ${pobTotalConsol}`
        : 'POBLACIÓN TOTAL: N/D',
    ]);

    subCabecera.height = 18;
    subCabecera.eachCell(
      { includeEmpty: true },
      (cell: Cell, colNumber: number) => {
        const conSub = [5, 6, 8].includes(colNumber);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: conSub ? 'FF1E2D4A' : 'FF16213A' },
        };
        cell.font = {
          bold: conSub,
          color: { argb: conSub ? 'FF00D68F' : 'FF16213A' },
          size: 8,
          name: 'Calibri',
        };
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
      },
    );

    // ── Filas de datos ────────────────────────────────────────────────────────
    const rowHeightPts = 165;

    for (let i = 0; i < totalPreguntas; i++) {
      const rowNum = i + 3;

      const fila = sheet.addRow([
        i + 1,
        this.preguntasExtraidas[i] || '',
        '',
        '',
        analisisGestores[i] || '',
        analisisEstudiantes[i] || '',
        '',
        analisisConsolidado[i] || '',
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

      [5, 6, 8].forEach((colIdx) => {
        const cell = fila.getCell(colIdx);
        cell.font = { size: 7, name: 'Calibri' };
        cell.alignment = {
          vertical: 'top',
          horizontal: 'left',
          wrapText: true,
        };
      });

      fila.eachCell({ includeEmpty: true }, (cell: Cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
      });

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

      if (imagenesGestores[i]) insertarImagen(imagenesGestores[i], 3);
      if (imagenesEstudiantes[i]) insertarImagen(imagenesEstudiantes[i], 4);
      if (imagenesConsolidado[i]) insertarImagen(imagenesConsolidado[i], 7);
    }

    // ── Descarga ──────────────────────────────────────────────────────────────
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
        <p style="font-size:0.85rem;color:#888;margin-top:8px">
          Gestores: ${pobTotalGestores} | Estudiantes: ${pobTotalEstudiantes} | Consolidado: ${pobTotalConsol}
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
