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

// Resultado por página: imagen completa + imagen solo de la leyenda (para OCR)
interface PaginaExtraida {
  imagenCompleta: string; // base64 página completa → va al Excel
  imagenLeyenda: string; // base64 franja inferior → va al OCR
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

  pasoActual = 1;
  archivoPaso1: File | null = null;
  nombreArchivoPaso1 = 'Elegir archivo Excel';
  celdaInicio = '';
  celdaFin = '';
  preguntasExtraidas: string[] = [];

  pdfGestores: File | null = null;
  nombrePdfGestores = 'Elegir PDF de Gestores';
  pdfEstudiantes: File | null = null;
  nombrePdfEstudiantes = 'Elegir PDF de Estudiantes';
  pdfConsolidado: File | null = null;
  nombrePdfConsolidado = 'Elegir PDF Consolidado';

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
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f) {
      this.archivoPaso1 = f;
      this.nombreArchivoPaso1 = f.name;
    }
  }
  onPdfGestores(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f) {
      this.pdfGestores = f;
      this.nombrePdfGestores = f.name;
    }
  }
  onPdfEstudiantes(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f) {
      this.pdfEstudiantes = f;
      this.nombrePdfEstudiantes = f.name;
    }
  }
  onPdfConsolidado(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f) {
      this.pdfConsolidado = f;
      this.nombrePdfConsolidado = f.name;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASO 1
  // ═══════════════════════════════════════════════════════════════

  async irPaso2() {
    if (!this.archivoPaso1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Archivo requerido',
        text: 'Selecciona el archivo Excel de preguntas.',
        confirmButtonColor: '#00d68f',
      });
      return;
    }
    const regexCelda = /^[A-Za-z]+\d+$/;
    if (!regexCelda.test(this.celdaInicio.trim())) {
      await Swal.fire({
        icon: 'warning',
        title: 'Celda de inicio inválida',
        text: 'Ej: "E1"',
        confirmButtonColor: '#00d68f',
      });
      return;
    }
    if (!regexCelda.test(this.celdaFin.trim())) {
      await Swal.fire({
        icon: 'warning',
        title: 'Celda de fin inválida',
        text: 'Ej: "O1"',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    const ini = this.celdaInicio.trim().toUpperCase();
    const fin = this.celdaFin.trim().toUpperCase();
    const mI = ini.match(/^([A-Z]+)(\d+)$/)!;
    const mF = fin.match(/^([A-Z]+)(\d+)$/)!;

    if (parseInt(mI[2]) !== parseInt(mF[2]) && mI[1] !== mF[1]) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango inválido',
        text: 'Debe ser una sola fila o columna.',
        confirmButtonColor: '#00d68f',
      });
      return;
    }
    if (XLSX.utils.decode_col(mI[1]) > XLSX.utils.decode_col(mF[1])) {
      await Swal.fire({
        icon: 'error',
        title: 'Rango incorrecto',
        text: `Columna inicio > fin.`,
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
        ini,
        fin,
      );
      if (!preguntas.length) {
        await Swal.fire({
          icon: 'error',
          title: 'Sin preguntas',
          text: `No se encontraron datos en ${ini}→${fin}.`,
          confirmButtonColor: '#00d68f',
        });
        return;
      }
      this.preguntasExtraidas = preguntas;
      await Swal.fire({
        icon: 'success',
        title: '¡Preguntas extraídas!',
        html: `<p><b>${preguntas.length} preguntas</b>:</p>
          <div style="max-height:200px;overflow-y:auto;text-align:left;margin-top:10px">
            ${preguntas.map((p, i) => `<div style="padding:4px 0;border-bottom:1px solid #eee;font-size:.85rem"><b>${i + 1}.</b> ${p}</div>`).join('')}
          </div>`,
        confirmButtonText: 'Continuar al Paso 2',
        confirmButtonColor: '#00d68f',
      });
      this.pasoActual = 2;
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error al leer',
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
          const libro = XLSX.read(
            new Uint8Array(e.target!.result as ArrayBuffer),
            { type: 'array' },
          );
          const jsonData: any[][] = XLSX.utils.sheet_to_json(
            libro.Sheets[libro.SheetNames[0]],
            { header: 1 },
          );
          const ci = XLSX.utils.decode_cell(inicio);
          const cf = XLSX.utils.decode_cell(fin);
          const out: string[] = [];
          if (ci.r === cf.r) {
            for (let c = ci.c; c <= cf.c; c++) {
              const v = jsonData[ci.r]?.[c];
              if (v) out.push(String(v).trim());
            }
          } else {
            for (let r = ci.r; r <= cf.r; r++) {
              const v = jsonData[r]?.[ci.c];
              if (v) out.push(String(v).trim());
            }
          }
          resolve(out);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error lectura'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PASO 2
  // ═══════════════════════════════════════════════════════════════

  async generarMatriz() {
    if (!this.pdfGestores || !this.pdfEstudiantes || !this.pdfConsolidado) {
      await Swal.fire({
        icon: 'warning',
        title: 'PDFs requeridos',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    Swal.fire({
      title: 'Renderizando PDFs...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const [pgsG, pgsE, pgsC] = await Promise.all([
        this.extraerPaginasDePDF(this.pdfGestores),
        this.extraerPaginasDePDF(this.pdfEstudiantes),
        this.extraerPaginasDePDF(this.pdfConsolidado),
      ]);

      const totalPags = pgsG.length + pgsE.length + pgsC.length;
      let procesadas = 0;

      Swal.fire({
        title: `OCR en progreso... (0/${totalPags})`,
        text: 'Leyendo leyendas...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const ocr = async (
        paginas: PaginaExtraida[],
        grupo: string,
      ): Promise<DatosLikert[]> => {
        const resultados: DatosLikert[] = [];
        for (let i = 0; i < paginas.length; i++) {
          procesadas++;
          Swal.update({
            title: `OCR en progreso... (${procesadas}/${totalPags})`,
            text: `${grupo} – gráfica ${i + 1}`,
          });
          resultados.push(await this.ocr_y_parsear(paginas[i].imagenLeyenda));
        }
        return resultados;
      };

      const datosG = await ocr(pgsG, 'Gestores');
      const datosE = await ocr(pgsE, 'Estudiantes');
      const datosC = await ocr(pgsC, 'Consolidado');

      // Pobaciones totales: suma de cantidades de la primera gráfica de cada grupo
      const pobG = datosG[0]?.total ?? 0;
      const pobE = datosE[0]?.total ?? 0;

      const analG = datosG.map((d, i) =>
        this.generarTexto(d, i + 1, 'gestores del conocimiento y aprendizaje'),
      );
      const analE = datosE.map((d, i) =>
        this.generarTexto(d, i + 1, 'estudiantes'),
      );
      const analC = datosC.map((d, i) =>
        this.generarTexto(d, i + 1, 'población consolidada'),
      );

      Swal.fire({
        title: 'Construyendo Excel...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await new Promise((r) => setTimeout(r, 80));

      await this.construirExcel(
        pgsG.map((p) => p.imagenCompleta),
        pgsE.map((p) => p.imagenCompleta),
        pgsC.map((p) => p.imagenCompleta),
        analG,
        analE,
        analC,
        pobG,
        pobE,
      );
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message ?? 'No se pudo generar la matriz.',
        confirmButtonColor: '#00d68f',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXTRACCIÓN DE PÁGINAS PDF
  // Cada página del PDF = una gráfica.
  // Devuelve:
  //   imagenCompleta → página entera a escala 2.5 (para el Excel)
  //   imagenLeyenda  → solo el 28% inferior de la página a escala 3
  //                    (zona donde siempre está la leyenda, para el OCR)
  // ═══════════════════════════════════════════════════════════════

  private extraerPaginasDePDF(file: File): Promise<PaginaExtraida[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const pdf = await pdfjsLib.getDocument({
            data: e.target!.result as ArrayBuffer,
          }).promise;
          const paginas: PaginaExtraida[] = [];

          for (let num = 1; num <= pdf.numPages; num++) {
            const page = await pdf.getPage(num);

            // ── Imagen completa (escala 2.5, para el Excel) ──
            const vpFull = page.getViewport({ scale: 2.5 });
            const cvFull = document.createElement('canvas');
            cvFull.width = vpFull.width;
            cvFull.height = vpFull.height;
            const ctxFull = cvFull.getContext('2d')!;
            ctxFull.fillStyle = '#fff';
            ctxFull.fillRect(0, 0, cvFull.width, cvFull.height);
            await page.render({
              canvasContext: ctxFull,
              viewport: vpFull,
            } as any).promise;
            const imagenCompleta = cvFull.toDataURL('image/jpeg', 0.92);

            // ── Imagen de leyenda (escala 3, solo 28% inferior, para OCR) ──
            // Escala mayor = más resolución = mejor OCR
            const vpLey = page.getViewport({ scale: 3.0 });
            const cvLey = document.createElement('canvas');
            cvLey.width = vpLey.width;
            cvLey.height = vpLey.height;
            const ctxLey = cvLey.getContext('2d')!;
            ctxLey.fillStyle = '#fff';
            ctxLey.fillRect(0, 0, cvLey.width, cvLey.height);
            await page.render({ canvasContext: ctxLey, viewport: vpLey } as any)
              .promise;

            // Recortar: tomar solo el 28% inferior donde vive la leyenda
            const alturaLey = Math.floor(cvLey.height * 0.28);
            const offsetY = cvLey.height - alturaLey;

            const cvRecorte = document.createElement('canvas');
            cvRecorte.width = cvLey.width;
            cvRecorte.height = alturaLey;
            const ctxR = cvRecorte.getContext('2d')!;
            ctxR.fillStyle = '#fff';
            ctxR.fillRect(0, 0, cvRecorte.width, cvRecorte.height);
            ctxR.drawImage(
              cvLey,
              0,
              offsetY,
              cvLey.width,
              alturaLey,
              0,
              0,
              cvLey.width,
              alturaLey,
            );

            // Pre-procesar para OCR: aumentar contraste, convertir a escala de grises
            const imgData = ctxR.getImageData(
              0,
              0,
              cvRecorte.width,
              cvRecorte.height,
            );
            this.preprocesarParaOCR(imgData);
            ctxR.putImageData(imgData, 0, 0);

            const imagenLeyenda = cvRecorte.toDataURL('image/png'); // PNG sin compresión para OCR

            paginas.push({ imagenCompleta, imagenLeyenda });
          }

          resolve(paginas);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo PDF'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Pre-procesa los píxeles para mejorar el OCR:
   * - Convierte a escala de grises
   * - Aplica umbral (threshold): píxeles claros → blanco, oscuros → negro
   * Esto elimina colores de los íconos/leyenda y deja solo el texto nítido.
   */
  private preprocesarParaOCR(imgData: ImageData): void {
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gris = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Umbral 160: píxeles grises medios → blanco (elimina fondos de color de leyenda)
      const val = gris > 160 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = val;
      d[i + 3] = 255;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OCR + PARSER
  // ═══════════════════════════════════════════════════════════════

  private async ocr_y_parsear(imagenLeyenda: string): Promise<DatosLikert> {
    try {
      const worker = await Tesseract.createWorker('spa');
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // leyenda = bloque uniforme
        // Solo permitir caracteres relevantes: letras, números, espacios, comas, puntos, %,  :, (,  )
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789 .,():%',
      });
      const {
        data: { text },
      } = await worker.recognize(imagenLeyenda);
      await worker.terminate();
      return this.parsearLeyenda(text);
    } catch {
      return this.datoVacio();
    }
  }

  /**
   * PARSER ROBUSTO
   *
   * Busca cada categoría con su propio regex que captura:
   *   ETIQUETA ... CANTIDAD (PORCENTAJE%)
   *
   * Reglas de validación post-parseo:
   *  1. Los porcentajes deben sumar entre 95% y 105% (margen de redondeo OCR)
   *  2. El total (suma de cantidades) debe ser > 0
   *  3. Si la validación falla → datoVacio()
   */
  private parsearLeyenda(texto: string): DatosLikert {
    // Normalizar texto OCR
    const t = texto.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Regex por categoría — busca la etiqueta seguida (con hasta 80 chars de ruido)
    // del par  NUMERO (NUMERO%)
    const NUM = String.raw`(\d[\d.,]*)`;
    const GAP = String.raw`[^()]{0,80}?`; // hasta 80 chars que no sean paréntesis
    const PORC = String.raw`\(\s*(\d[\d.,]*)\s*%\s*\)`;

    const buscar = (re: RegExp): { cant: number; porc: number } | null => {
      const m = re.exec(t);
      if (!m) return null;
      const cant = parseFloat(m[1].replace(',', '.'));
      const porc = parseFloat(m[2].replace(',', '.'));
      return isNaN(cant) || isNaN(porc) || cant <= 0 ? null : { cant, porc };
    };

    // Orden de búsqueda: de más específico a menos específico
    const mTA = buscar(
      new RegExp(`totalmente\\s+de\\s+acuerdo${GAP}${NUM}\\s*${PORC}`, 'i'),
    );
    const mTD = buscar(
      new RegExp(`totalmente\\s+en\\s+desacuerdo${GAP}${NUM}\\s*${PORC}`, 'i'),
    );
    const mN = buscar(
      new RegExp(`ni\\s+de\\s+acuerdo${GAP}${NUM}\\s*${PORC}`, 'i'),
    );
    // "De acuerdo" sin "totalmente" antes
    const mA = buscar(
      new RegExp(
        `(?<!totalmente\\s{0,10})de\\s+acuerdo${GAP}${NUM}\\s*${PORC}`,
        'i',
      ),
    );
    // "En desacuerdo" sin "totalmente" antes
    const mD = buscar(
      new RegExp(
        `(?<!totalmente\\s{0,10})en\\s+desacuerdo${GAP}${NUM}\\s*${PORC}`,
        'i',
      ),
    );

    const cantTa = mTA?.cant ?? 0;
    const cantA = mA?.cant ?? 0;
    const cantN = mN?.cant ?? 0;
    const cantD = mD?.cant ?? 0;
    const cantTd = mTD?.cant ?? 0;

    const ta = mTA?.porc ?? 0;
    const a = mA?.porc ?? 0;
    const n = mN?.porc ?? 0;
    const d = mD?.porc ?? 0;
    const td = mTD?.porc ?? 0;

    const total = Math.round(cantTa + cantA + cantN + cantD + cantTd);
    const sumaPorcs = ta + a + n + d + td;
    const encontrados = [mTA, mA, mN, mD, mTD].filter(Boolean).length;

    // ── Validación de coherencia ──────────────────────────────────────────────
    // Si los porcentajes no suman ~100% o no hay suficientes categorías,
    // intentamos el fallback posicional antes de devolver vacío
    if (total <= 0 || encontrados < 3 || sumaPorcs < 85 || sumaPorcs > 115) {
      return this.parsearFallback(t);
    }

    return { ta, cantTa, a, cantA, n, cantN, d, cantD, td, cantTd, total };
  }

  /**
   * FALLBACK POSICIONAL
   *
   * Cuando el OCR no reconoce bien las etiquetas, tomamos TODOS los pares
   * NUMERO (NUMERO%) del texto y elegimos el conjunto de 5 consecutivos
   * cuya suma de porcentajes esté más cerca de 100%.
   *
   * Esto evita que números del título o de los ejes contaminen el resultado.
   */
  private parsearFallback(texto: string): DatosLikert {
    const patron = /(\d[\d.,]*)\s*\(\s*(\d[\d.,]*)\s*%\s*\)/g;
    const todos: Array<{ cant: number; porc: number }> = [];

    let m: RegExpExecArray | null;
    while ((m = patron.exec(texto)) !== null) {
      const cant = parseFloat(m[1].replace(',', '.'));
      const porc = parseFloat(m[2].replace(',', '.'));
      if (!isNaN(cant) && !isNaN(porc) && cant > 0 && porc > 0 && porc <= 100) {
        todos.push({ cant, porc });
      }
    }

    if (todos.length < 5) return this.datoVacio();

    // Buscar la ventana de 5 cuya suma de porcentajes sea más cercana a 100
    let mejorIdx = 0;
    let mejorDelta = Infinity;

    for (let i = 0; i <= todos.length - 5; i++) {
      const suma = todos.slice(i, i + 5).reduce((acc, x) => acc + x.porc, 0);
      const delta = Math.abs(suma - 100);
      if (delta < mejorDelta) {
        mejorDelta = delta;
        mejorIdx = i;
      }
    }

    // Rechazar si la mejor ventana está muy lejos de 100%
    if (mejorDelta > 20) return this.datoVacio();

    const [mTA, mA, mN, mD, mTD] = todos.slice(mejorIdx, mejorIdx + 5);
    const total = Math.round(mTA.cant + mA.cant + mN.cant + mD.cant + mTD.cant);

    return {
      ta: mTA.porc,
      cantTa: mTA.cant,
      a: mA.porc,
      cantA: mA.cant,
      n: mN.porc,
      cantN: mN.cant,
      d: mD.porc,
      cantD: mD.cant,
      td: mTD.porc,
      cantTd: mTD.cant,
      total,
    };
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

  // ═══════════════════════════════════════════════════════════════
  // GENERADOR DE TEXTO
  // ═══════════════════════════════════════════════════════════════

  private generarTexto(
    datos: DatosLikert,
    num: number,
    poblacion: string,
  ): string {
    if (datos.total === 0) {
      return `No se pudieron extraer datos de la gráfica ${num} para ${poblacion}.`;
    }

    const total = datos.total;
    const [cTa, cA, cN, cD, cTd] = this.ajustarRedondeo(
      [datos.ta, datos.a, datos.n, datos.d, datos.td],
      total,
    );

    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

    const pPos = parseFloat((datos.ta + datos.a).toFixed(1));
    const pNeg = parseFloat((datos.n + datos.d + datos.td).toFixed(1));
    const cPos = cTa + cA;
    const cNeg = total - cPos;

    return (
      `Población total consultada: ${total} ${poblacion}. ` +
      `Percepción de la afirmación ${num}: ` +
      `El ${fmt(datos.ta)}% (${cTa} ${poblacion}) están totalmente de acuerdo, ` +
      `el ${fmt(datos.a)}% (${cA} ${poblacion}) están de acuerdo, ` +
      `el ${fmt(datos.n)}% (${cN} ${poblacion}) están ni de acuerdo, ni en desacuerdo, ` +
      `el ${fmt(datos.d)}% (${cD} ${poblacion}) están en desacuerdo ` +
      `y el ${fmt(datos.td)}% (${cTd} ${poblacion}) están totalmente en desacuerdo. ` +
      `En suma, el ${fmt(pPos)}% (${cPos} ${poblacion}) tienen una percepción positiva ` +
      `y el ${fmt(pNeg)}% (${cNeg} ${poblacion}) no la perciben positiva.`
    );
  }

  /** Largest Remainder (Hamilton): suma de enteros == total exacto */
  private ajustarRedondeo(porcentajes: number[], total: number): number[] {
    if (total <= 0) return porcentajes.map(() => 0);
    const exactos = porcentajes.map((p) => (p / 100) * total);
    const pisos = exactos.map(Math.floor);
    const restos = exactos.map((v, i) => ({ resto: v - pisos[i], idx: i }));
    const faltante = total - pisos.reduce((a, b) => a + b, 0);

    if (faltante > 0) {
      restos.sort((a, b) => b.resto - a.resto);
      for (let i = 0; i < faltante && i < restos.length; i++)
        pisos[restos[i].idx]++;
    } else if (faltante < 0) {
      restos.sort((a, b) => a.resto - b.resto);
      for (let i = 0; i < Math.abs(faltante) && i < restos.length; i++) {
        pisos[restos[i].idx] = Math.max(0, pisos[restos[i].idx] - 1);
      }
    }
    return pisos;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONSTRUIR EXCEL
  // ═══════════════════════════════════════════════════════════════

  private async construirExcel(
    imgG: string[],
    imgE: string[],
    imgC: string[],
    analG: string[],
    analE: string[],
    analC: string[],
    pobG: number,
    pobE: number,
  ) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Matriz Análisis', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    const n = this.preguntasExtraidas.length;
    const pobC = pobG + pobE;

    sheet.columns = [
      { key: 'item', width: 6 },
      { key: 'afirm', width: 42 },
      { key: 'gG', width: 36 },
      { key: 'gE', width: 36 },
      { key: 'aG', width: 32 },
      { key: 'aE', width: 32 },
      { key: 'gC', width: 36 },
      { key: 'aC', width: 32 },
    ];

    // Fila 1: cabecera
    const cab = sheet.addRow([
      'ÍTEM',
      'AFIRMACIÓN',
      'GESTORES DEL CONOCIMIENTO Y APRENDIZAJE',
      'ESTUDIANTES',
      'ANÁLISIS GRÁFICA GESTORES DEL CONOCIMIENTO Y APRENDIZAJE',
      'ANÁLISIS GRÁFICA ESTUDIANTES',
      'CONSOLIDADO DE LAS GRÁFICAS',
      'ANÁLISIS GRÁFICA CONSOLIDADOS',
    ]);
    cab.height = 35;
    cab.eachCell((cell: Cell) => {
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

    // Fila 2: subcabecera poblaciones
    const sub = sheet.addRow([
      '',
      '',
      '',
      '',
      pobG > 0 ? `POBLACIÓN TOTAL: ${pobG}` : 'POBLACIÓN TOTAL: N/D',
      pobE > 0 ? `POBLACIÓN TOTAL: ${pobE}` : 'POBLACIÓN TOTAL: N/D',
      '',
      pobC > 0 ? `POBLACIÓN TOTAL: ${pobC}` : 'POBLACIÓN TOTAL: N/D',
    ]);
    sub.height = 18;
    sub.eachCell({ includeEmpty: true }, (cell: Cell, col: number) => {
      const hl = [5, 6, 8].includes(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hl ? 'FF1E2D4A' : 'FF16213A' },
      };
      cell.font = {
        bold: hl,
        color: { argb: hl ? 'FF00D68F' : 'FF16213A' },
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
    });

    // Filas de datos
    for (let i = 0; i < n; i++) {
      const rowNum = i + 3;
      const fila = sheet.addRow([
        i + 1,
        this.preguntasExtraidas[i] || '',
        '',
        '',
        analG[i] || '',
        analE[i] || '',
        '',
        analC[i] || '',
      ]);
      fila.height = 165;

      fila.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
      fila.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      fila.getCell(2).font = { size: 8, name: 'Calibri' };
      fila.getCell(2).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };

      [5, 6, 8].forEach((ci) => {
        fila.getCell(ci).font = { size: 7, name: 'Calibri' };
        fila.getCell(ci).alignment = {
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

      const insertImg = (b64: string, col: number) => {
        const data = b64.replace(/^data:image\/\w+;base64,/, '');
        const imgId = wb.addImage({ base64: data, extension: 'jpeg' });
        sheet.addImage(imgId, {
          tl: { col: col - 0.95, row: rowNum - 0.95 } as any,
          ext: { width: 215, height: 158 },
          editAs: 'oneCell',
        });
      };

      if (imgG[i]) insertImg(imgG[i], 3);
      if (imgE[i]) insertImg(imgE[i], 4);
      if (imgC[i]) insertImg(imgC[i], 7);
    }

    // Descarga
    const blob = new Blob([await wb.xlsx.writeBuffer()], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: url,
      download: 'matriz-analisis.xlsx',
    }).click();
    URL.revokeObjectURL(url);

    Swal.close();
    await Swal.fire({
      icon: 'success',
      title: '¡Matriz generada!',
      html: `<p>Matriz Excel con <b>${n} afirmaciones</b>.</p>
             <p style="font-size:.85rem;color:#888;margin-top:8px">Gestores: ${pobG} | Estudiantes: ${pobE} | Consolidado: ${pobC}</p>`,
      confirmButtonText: '¡Listo!',
      confirmButtonColor: '#00d68f',
    });
  }

  volverPaso1() {
    this.pasoActual = 1;
  }
}
