/** Helpers para armar y descargar archivos CSV en el navegador. */

const escapeCsvValue = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/** Convierte filas de un mismo shape en un bloque CSV con encabezado. */
export const rowsToCsv = (headers: string[], rows: unknown[][]): string => {
  const lines = [headers.map(escapeCsvValue).join(',')];
  rows.forEach((row) => lines.push(row.map(escapeCsvValue).join(',')));
  return lines.join('\n');
};

/** Dispara la descarga de un archivo de texto (CSV) en el navegador. */
export const downloadCsv = (filename: string, content: string) => {
  // BOM para que Excel reconozca UTF-8 correctamente (tildes, ñ).
  const blob = new Blob(['﻿' + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
