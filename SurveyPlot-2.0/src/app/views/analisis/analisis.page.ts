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
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

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
  preguntasExtraidas: string[] = [];

  // Paso 2
  archivoPaso2: File | null = null;
  nombreArchivoPaso2: string = 'Elegir archivo';
  nombreHoja: string = '';
  colAfirmaciones: string = '';
  colGestores: string = '';
  colEstudiantes: string = '';
  colConsolidado: string = '';

  // Libro de trabajo del paso 2 en memoria
  private libroTrabajoPaso2: XLSX.WorkBook | null = null;

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

  // ─── PASO 1 ───────────────────────────────────────────────
  async irPaso2() {
    // 1. Validar archivo
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

    // 2. Validar formato celdas — deben ser LETRA(S)+NUMERO
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

    // 3. Extraer columna y fila de cada celda
    const matchInicio = celdaInicioUpper.match(/^([A-Z]+)(\d+)$/);
    const matchFin = celdaFinUpper.match(/^([A-Z]+)(\d+)$/);

    if (!matchInicio || !matchFin) {
      await Swal.fire({
        icon: 'warning',
        title: 'Formato inválido',
        text: 'Usa el formato COLUMNA+FILA, por ejemplo: E1, O3.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    const colInicio = matchInicio[1];
    const filaInicio = parseInt(matchInicio[2]);
    const colFin = matchFin[1];
    const filaFin = parseInt(matchFin[2]);

    // 4. Validar que la fila sea igual en inicio y fin
    if (filaInicio !== filaFin) {
      await Swal.fire({
        icon: 'error',
        title: 'Filas distintas',
        text: `La celda de inicio está en la fila ${filaInicio} y la de fin en la fila ${filaFin}. Deben estar en la misma fila.`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    // 5. Validar que columna inicio no sea mayor que fin
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

    // 6. Leer el archivo y extraer preguntas
    Swal.fire({
      title: 'Leyendo archivo...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const preguntas = await this.extraerPreguntas(
        this.archivoPaso1,
        colInicio,
        colFin,
        filaInicio,
      );

      if (preguntas.length === 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Sin preguntas',
          text: `No se encontraron datos en el rango ${celdaInicioUpper} → ${celdaFinUpper}. Verifica las celdas.`,
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
          <p>Se encontraron <b>${preguntas.length} preguntas</b> en el rango ${celdaInicioUpper} → ${celdaFinUpper}:</p>
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
        text: 'No se pudo leer el archivo. Asegúrate de que sea un Excel válido.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
    }
  }

  private extraerPreguntas(
    file: File,
    colInicio: string,
    colFin: string,
    fila: number,
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

          const filaIndex = fila - 1; // base 0
          const idxInicio = XLSX.utils.decode_col(colInicio);
          const idxFin = XLSX.utils.decode_col(colFin);

          const preguntas: string[] = [];
          for (let col = idxInicio; col <= idxFin; col++) {
            const valor = jsonData[filaIndex]?.[col];
            if (valor !== undefined && valor !== null && valor !== '') {
              preguntas.push(String(valor).trim());
            }
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
  async generarReporte() {
    // 1. Validar archivo
    if (!this.archivoPaso2) {
      await Swal.fire({
        icon: 'warning',
        title: 'Archivo requerido',
        text: 'Selecciona el archivo Excel de gráficas.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    // 2. Validar nombre de hoja
    if (!this.nombreHoja.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Nombre de hoja requerido',
        text: 'Ingresa el nombre exacto de la hoja donde se pegarán las afirmaciones.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    // 3. Validar columna de afirmaciones
    if (
      !this.colAfirmaciones.trim() ||
      !/^[A-Za-z]+$/.test(this.colAfirmaciones.trim())
    ) {
      await Swal.fire({
        icon: 'warning',
        title: 'Columna inválida',
        text: 'Ingresa solo la letra de la columna de afirmaciones (Ej: C).',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
      return;
    }

    Swal.fire({
      title: 'Procesando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await this.pegarAfirmaciones(
        this.archivoPaso2,
        this.nombreHoja.trim(),
        this.colAfirmaciones.trim().toUpperCase(),
        this.preguntasExtraidas,
      );
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Ocurrió un error al procesar el archivo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#00d68f',
      });
    }
  }

  private pegarAfirmaciones(
    file: File,
    nombreHoja: string,
    colAfirmaciones: string,
    preguntas: string[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const datos = new Uint8Array(e.target.result);
          const libro = XLSX.read(datos, { type: 'array' });

          // Verificar que la hoja existe
          if (!libro.SheetNames.includes(nombreHoja)) {
            Swal.fire({
              icon: 'error',
              title: 'Hoja no encontrada',
              html: `No se encontró la hoja "<b>${nombreHoja}</b>" en el archivo.<br><br>
                     <small>Hojas disponibles: <b>${libro.SheetNames.join(', ')}</b></small>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#00d68f',
            });
            reject(new Error('Hoja no encontrada'));
            return;
          }

          const hoja = libro.Sheets[nombreHoja];
          const jsonData: any[][] = XLSX.utils.sheet_to_json(hoja, {
            header: 1,
          });

          // Encontrar la primera fila vacía debajo del título en la columna de afirmaciones
          const idxCol = XLSX.utils.decode_col(colAfirmaciones);
          let filaDestino = -1;

          for (let i = 0; i < jsonData.length; i++) {
            const celda = jsonData[i]?.[idxCol];
            if (
              celda === undefined ||
              celda === null ||
              String(celda).trim() === ''
            ) {
              filaDestino = i;
              break;
            }
          }

          // Si no encontró fila vacía, pega después de la última
          if (filaDestino === -1) {
            filaDestino = jsonData.length;
          }

          // Pegar preguntas en la columna indicada
          preguntas.forEach((pregunta, i) => {
            const celdaRef = `${colAfirmaciones}${filaDestino + i + 1}`;
            hoja[celdaRef] = { v: pregunta, t: 's' };
          });

          // Actualizar el rango de la hoja
          const rango = XLSX.utils.decode_range(hoja['!ref'] || 'A1');
          const nuevaFilaMax = filaDestino + preguntas.length - 1;
          if (nuevaFilaMax > rango.e.r) rango.e.r = nuevaFilaMax;
          hoja['!ref'] = XLSX.utils.encode_range(rango);

          // Guardar libro en memoria
          this.libroTrabajoPaso2 = libro;

          Swal.fire({
            icon: 'success',
            title: '¡Listo para descargar!',
            html: `
              <p>Se pegaron <b>${preguntas.length} afirmaciones</b> en la columna <b>${colAfirmaciones}</b> de la hoja "<b>${nombreHoja}</b>".</p>
              <p style="margin-top:8px; font-size:0.85rem; color:#888">Presiona el botón para descargar el archivo modificado.</p>
            `,
            confirmButtonText: '⬇ Descargar Excel',
            confirmButtonColor: '#00d68f',
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
          }).then((result) => {
            if (result.isConfirmed) {
              this.descargarExcel();
            }
          });

          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error de lectura'));
      reader.readAsArrayBuffer(file);
    });
  }

  descargarExcel() {
    if (!this.libroTrabajoPaso2) return;
    const nombreBase = this.nombreArchivoPaso2
      .replace('.xlsx', '')
      .replace('.xls', '');
    XLSX.writeFile(this.libroTrabajoPaso2, `${nombreBase}_modificado.xlsx`);
  }

  volverPaso1() {
    this.pasoActual = 1;
  }
}
