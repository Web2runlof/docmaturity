/**
 * Informes PDF (ejecutivo, técnico y entregable académico) con jsPDF y AutoTable.
 * Los gráficos se dibujan con primitivas vectoriales para que el informe no dependa del DOM.
 * Se evita cortar tablas y gráficos entre páginas y se conservan los caracteres del español.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Analysis } from '@/engine/analyze';
import type { AssessmentBundle } from '@/types/domain';
import { LEVEL_NAMES, dimensionName, getSource } from '@/data/bank';
import { getProfile } from '@/data/sector-profiles';
import { COVERAGE_BAND_LABEL, currentScore, levelIndex } from '@/engine/scoring';
import { EVIDENCE_LABEL, LENS_DIMENSIONS, LEVEL_COLORS } from '@/engine/constants';
import { dimensionRangeLabel } from '@/engine/analyze';
import { RISK_STATUS_LABEL } from '@/engine/risk';
import { APP_TAGLINE, MODEL_NAME, TARGET_TERM, VERIFICATION_LABEL, modalityLabel } from '@/config/vocabulary';
import { fmtPct, fmtScore } from '@/utils/core';
import { riskBand, riskScore } from '@/engine/risk';
import { PHASES } from '@/engine/recommendations';
import { buildNarrative } from '@/engine/narrative';
import { roleLabel } from '@/engine/recommendations';

const C = { navy: [20, 43, 58], dark: [15, 32, 45], teal: [13, 148, 136], gold: [198, 155, 89], slate: [100, 116, 139], border: [226, 232, 240], text: [24, 38, 51], canvas: [247, 248, 250] } as const;
const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Misma paleta secuencial de madurez que la interfaz. */
const LEVEL_RGB: [number, number, number][] = LEVEL_COLORS.map(hexRgb);

/** Sustituye los caracteres que la fuente estándar del PDF no puede representar. */
export function pdfSafe(s: string): string {
  return s.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->').replace(/×/g, 'x').replace(/−/g, '-').replace(/[‐-‒]/g, '-').replace(/[^\t\n\r\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, '');
}

/** Formatos únicos: madurez y brechas con 2 decimales; porcentajes con 1 decimal. */
const f1 = (v: number | null | undefined) => fmtScore(v, 'Sin datos');
const fp = (v: number | null | undefined) => fmtPct(v);
/** Color de la serie percibida: el mismo tono de la paleta secuencial que usa el tablero (nivel 3). */
const SERIES_RGB: [number, number, number] = [parseInt(LEVEL_COLORS[3].slice(1, 3), 16), parseInt(LEVEL_COLORS[3].slice(3, 5), 16), parseInt(LEVEL_COLORS[3].slice(5, 7), 16)];
const solidityValue = (a: Analysis) => (a.solidity.index === null ? 'No calculable' : String(Math.round(a.solidity.index)));
const SOLIDITY_FORMULA = '0,4·Cobertura + 0,4·Soporte + 0,2·(Acuerdo × 100)';
const evidenceCell = (s: Analysis['states'][number]) => (!s.applicable ? 'No aplica' : s.insufficientEvidence ? `${s.evidenceStatus} · validado sin evidencia suficiente` : s.evidenceStatus);

class Report {
  doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  y = 20;
  readonly W = 210;
  readonly M = 18;
  readonly CW = 210 - 36;
  constructor(public title: string, public subtitle: string) {
    this.doc.setProperties({ title: pdfSafe(title), subject: pdfSafe(subtitle), creator: 'DOCMATURITY' });
  }
  setColor(c: readonly number[]) { this.doc.setTextColor(c[0], c[1], c[2]); }
  ensure(h: number) {
    if (this.y + h > 297 - 20) { this.doc.addPage(); this.y = 20; }
  }
  cover(org: string, assessment: string, date: string, scope: string) {
    const d = this.doc;
    d.setFillColor(C.dark[0], C.dark[1], C.dark[2]);
    d.rect(0, 0, 210, 297, 'F');
    // Isotipo: capas escalonadas
    d.setFillColor(C.teal[0], C.teal[1], C.teal[2]); d.rect(this.M, 36, 14, 4, 'F');
    d.setFillColor(255, 255, 255); d.rect(this.M, 42, 20, 4, 'F');
    d.setFillColor(C.gold[0], C.gold[1], C.gold[2]); d.rect(this.M, 48, 26, 4, 'F');
    d.setTextColor(255, 255, 255); d.setFont('helvetica', 'bold'); d.setFontSize(11);
    d.text('DOCMATURITY', this.M, 64);
    d.setFont('helvetica', 'normal'); d.setFontSize(8); d.setTextColor(170, 186, 199);
    d.text(pdfSafe(APP_TAGLINE), this.M, 69);
    d.setTextColor(255, 255, 255); d.setFont('helvetica', 'bold'); d.setFontSize(26);
    d.text(d.splitTextToSize(pdfSafe(this.title), this.CW), this.M, 120);
    d.setFont('helvetica', 'normal'); d.setFontSize(13); d.setTextColor(198, 155, 89);
    d.text(d.splitTextToSize(pdfSafe(org), this.CW), this.M, 150);
    d.setFontSize(10); d.setTextColor(200, 210, 220);
    d.text(d.splitTextToSize(pdfSafe(`${assessment} · ${date}`), this.CW), this.M, 162);
    d.text(d.splitTextToSize(pdfSafe(scope), this.CW), this.M, 170);
    d.setFontSize(7.5); d.setTextColor(140, 156, 170);
    d.text(d.splitTextToSize(pdfSafe(`Informe generado con el ${MODEL_NAME} v1.0, propuesta metodológica independiente y orientativa. No constituye certificación, auditoría de cumplimiento ni puntaje oficial de ningún referente.`), this.CW), this.M, 270);
    d.addPage();
    this.y = 20;
  }
  /** Título de sección. `keepWith` reserva el alto del contenido siguiente para no dejar el título huérfano. */
  h1(text: string, keepWith = 0) {
    this.ensure(18 + keepWith);
    this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(15); this.setColor(C.navy);
    this.doc.text(pdfSafe(text), this.M, this.y);
    this.doc.setDrawColor(C.gold[0], C.gold[1], C.gold[2]); this.doc.setLineWidth(0.6);
    this.doc.line(this.M, this.y + 2.5, this.M + 18, this.y + 2.5);
    this.y += 10;
  }
  h2(text: string, keepWith = 0) {
    this.ensure(12 + keepWith);
    this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(11); this.setColor(C.text);
    this.doc.text(pdfSafe(text), this.M, this.y);
    this.y += 6;
  }
  p(text: string, size = 9.5, color: readonly number[] = C.text) {
    this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(size); this.setColor(color);
    const lines = this.doc.splitTextToSize(pdfSafe(text), this.CW) as string[];
    const lh = size * 0.42;
    for (const line of lines) {
      this.ensure(lh + 1);
      this.doc.text(line, this.M, this.y);
      this.y += lh;
    }
    this.y += 2.5;
  }
  /** Tarjetas de indicadores en tres columnas. La nota se ajusta al ancho y la fila crece según la nota más larga. */
  kpis(items: { label: string; value: string; note?: string }[]) {
    const cols = 3;
    const gap = 4;
    const w = (this.CW - (cols - 1) * gap) / cols;
    const noteLh = 2.6;
    this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(6.5);
    const notes = items.map((it) => (it.note ? (this.doc.splitTextToSize(pdfSafe(it.note), w - 6) as string[]).slice(0, 3) : []));
    for (let r = 0; r * cols < items.length; r += 1) {
      const row = items.slice(r * cols, r * cols + cols);
      const maxNote = Math.max(0, ...notes.slice(r * cols, r * cols + cols).map((n) => n.length));
      const h = 16 + maxNote * noteLh + (maxNote ? 1.5 : 0);
      this.ensure(h + 3);
      row.forEach((it, k) => {
        const x = this.M + k * (w + gap);
        const y = this.y;
        this.doc.setDrawColor(C.border[0], C.border[1], C.border[2]); this.doc.setLineWidth(0.3);
        this.doc.rect(x, y, w, h);
        this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(7.5); this.setColor(C.slate);
        this.doc.text((this.doc.splitTextToSize(pdfSafe(it.label), w - 6) as string[])[0], x + 3, y + 5);
        this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(14); this.setColor(C.navy);
        this.doc.text(pdfSafe(it.value), x + 3, y + 12.5);
        const n = notes[r * cols + k];
        if (n.length) {
          this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(6.5); this.setColor(C.slate);
          n.forEach((line, li) => this.doc.text(line, x + 3, y + 16.2 + li * noteLh));
        }
      });
      this.y += h + 3;
    }
    this.y += 1;
  }
  table(head: string[], body: (string | number | null)[][], widths?: number[]) {
    this.ensure(16);
    autoTable(this.doc, {
      startY: this.y,
      head: [head.map(pdfSafe)],
      body: body.map((r) => r.map((c) => pdfSafe(c === null || c === undefined ? '—' : String(c)))),
      margin: { left: this.M, right: this.M },
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.6, textColor: [24, 38, 51], lineColor: [226, 232, 240], lineWidth: 0.2, overflow: 'linebreak' },
      headStyles: { fillColor: [20, 43, 58], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      rowPageBreak: 'avoid',
      columnStyles: widths ? Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])) : undefined,
    });
    this.y = ((this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? this.y) + 6;
  }
  radar(labels: string[], series: { values: (number | null)[]; color: [number, number, number]; name: string }[]) {
    const size = 74;
    this.ensure(size + 18);
    const cx = this.W / 2;
    const cy = this.y + size / 2 + 4;
    const r = size / 2;
    const n = labels.length;
    const pt = (i: number, v: number) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + Math.cos(ang) * r * (v / 5), cy + Math.sin(ang) * r * (v / 5)];
    };
    const d = this.doc;
    d.setLineWidth(0.15); d.setDrawColor(C.border[0], C.border[1], C.border[2]);
    for (let ring = 1; ring <= 5; ring++) {
      for (let i = 0; i < n; i++) {
        const [x1, y1] = pt(i, ring); const [x2, y2] = pt((i + 1) % n, ring);
        d.line(x1, y1, x2, y2);
      }
    }
    d.setFont('helvetica', 'normal'); d.setFontSize(6.5); this.setColor(C.slate);
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, 5); d.line(cx, cy, x, y);
      const [lx, ly] = pt(i, 5.75);
      d.text(pdfSafe(labels[i]), lx, ly, { align: lx < cx - 2 ? 'right' : lx > cx + 2 ? 'left' : 'center' });
    }
    for (const s of series) {
      d.setDrawColor(s.color[0], s.color[1], s.color[2]); d.setLineWidth(0.6);
      for (let i = 0; i < n; i++) {
        const a = s.values[i]; const b = s.values[(i + 1) % n];
        if (a === null || b === null) continue; // discontinuidad cuando faltan datos
        const [x1, y1] = pt(i, a); const [x2, y2] = pt((i + 1) % n, b);
        d.line(x1, y1, x2, y2);
      }
      d.setFillColor(s.color[0], s.color[1], s.color[2]);
      s.values.forEach((v, i) => { if (v !== null) { const [x, y] = pt(i, v); d.circle(x, y, 0.7, 'F'); } });
    }
    let lx = this.M;
    const ly = cy + r + 9;
    series.forEach((s) => {
      d.setFillColor(s.color[0], s.color[1], s.color[2]); d.rect(lx, ly - 2, 3, 2, 'F');
      d.setFontSize(7); this.setColor(C.text); d.text(pdfSafe(s.name), lx + 4.5, ly);
      lx += 52;
    });
    this.y = ly + 6;
  }
  bars(rows: { label: string; value: number | null; target: number }[]) {
    const h = rows.length * 6 + 6;
    this.ensure(h);
    const d = this.doc;
    const x0 = this.M + 48; const wMax = this.CW - 60;
    rows.forEach((r, i) => {
      const y = this.y + i * 6;
      d.setFont('helvetica', 'normal'); d.setFontSize(7); this.setColor(C.text);
      d.text(pdfSafe(r.label).slice(0, 34), this.M, y + 3.2);
      d.setFillColor(C.canvas[0], C.canvas[1], C.canvas[2]); d.rect(x0, y, wMax, 4, 'F');
      if (r.value !== null) {
        const c = LEVEL_RGB[levelIndex(r.value)];
        d.setFillColor(c[0], c[1], c[2]); d.rect(x0, y, (wMax * r.value) / 5, 4, 'F');
        d.text(f1(r.value), x0 + wMax + 2, y + 3.2);
      } else { this.setColor(C.slate); d.text('Sin datos', x0 + 2, y + 3.2); }
      d.setDrawColor(C.gold[0], C.gold[1], C.gold[2]); d.setLineWidth(0.5);
      const tx = x0 + (wMax * r.target) / 5; d.line(tx, y - 0.6, tx, y + 4.6);
    });
    this.y += h;
    this.p('La línea dorada indica la meta. Las dimensiones sin datos no se representan como cero.', 7, C.slate);
  }
  finish(): Blob {
    const pages = this.doc.getNumberOfPages();
    for (let i = 2; i <= pages; i++) {
      this.doc.setPage(i);
      this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(7); this.setColor(C.slate);
      this.doc.text(pdfSafe(`DOCMATURITY · ${this.subtitle}`), this.M, 289);
      this.doc.text(`${i - 1} / ${pages - 1}`, this.W - this.M, 289, { align: 'right' });
    }
    return this.doc.output('blob');
  }
}

const dimLabels = (a: Analysis) => a.dimensionIds.map((d) => d);

function scopeText(a: Analysis) {
  return `${modalityLabel(a.assessment)}. ${a.coverage.applicable} criterios aplicables de ${a.coverage.scope} seleccionados en ${a.dimensionIds.length} dimensiones. Alcance sobre el banco: ${fp(a.coverage.scopeCoverage)}. Cobertura del banco: ${fp(a.coverage.bankCoverage)} (${a.coverage.bankScored} de ${a.coverage.bankTotal} criterios con puntuación).`;
}

function validatedNote(a: Analysis) {
  const v = a.views.validated;
  return v.global.score === null ? 'Sin criterios validados' : `${v.exploratory ? 'Exploratorio · ' : ''}calculada sobre ${v.includedLabel} (${a.coverage.validated} criterios validados)`;
}

export function buildExecutivePDF(a: Analysis, bundle: AssessmentBundle): Blob {
  const r = new Report('Informe ejecutivo de madurez documental', `${a.organization.shortName || a.organization.name} · ${a.assessment.name}`);
  r.cover(a.organization.name, a.assessment.name, new Date().toLocaleDateString('es-CO', { dateStyle: 'long' }), scopeText(a));
  const narrative = buildNarrative(a, { risks: bundle.risks, initiatives: bundle.initiatives });
  r.h1('Resumen ejecutivo');
  for (const key of ['madurez', 'cobertura']) narrative.find((s) => s.key === key)?.paragraphs.forEach((p) => r.p(p.text));
  r.kpis([
    { label: a.globalPreliminary.labelText, value: f1(a.globalPreliminary.score), note: a.globalPreliminary.score === null ? '' : LEVEL_NAMES[levelIndex(a.globalPreliminary.score)] },
    { label: a.globalValidated.labelText, value: f1(a.globalValidated.score), note: validatedNote(a) },
    { label: `Brecha frente a la ${TARGET_TERM.one} (percibida)`, value: f1(a.views.preliminary.gap), note: 'Promedio ponderado por criterio' },
    { label: 'Cobertura del diagnóstico', value: fp(a.coverage.coverage), note: a.coverage.band ? COVERAGE_BAND_LABEL[a.coverage.band] : '' },
    { label: 'Alcance sobre el banco', value: fp(a.coverage.scopeCoverage), note: `${a.coverage.applicable} de ${a.coverage.bankTotal} criterios` },
    { label: 'Cobertura del banco', value: fp(a.coverage.bankCoverage), note: `${a.coverage.bankScored} de ${a.coverage.bankTotal} con puntuación` },
    { label: 'Soporte de evidencias', value: fp(a.evidence.support) },
    { label: 'Cobertura de validación', value: fp(a.coverage.validationCoverage) },
    { label: 'Capacidades críticas con alerta', value: String(a.views.preliminary.critical.length), note: 'Serie percibida' },
    { label: 'Índice orientativo de solidez', value: solidityValue(a), note: `Escala 0–100: ${SOLIDITY_FORMULA}` },
    { label: 'Validados sin evidencia suficiente', value: String(a.lenses.insufficientEvidence.length), note: a.lenses.insufficientEvidence.length ? a.lenses.insufficientEvidence.join(', ') : 'Nivel ≥ 3 con evidencia E0 o E1' },
  ]);
  r.h1('Madurez por dimensión (serie percibida)', 92);
  r.radar(dimLabels(a), [
    { name: 'Percibida (preliminar)', values: a.dimensions.map((d) => d.preliminary), color: SERIES_RGB },
    { name: TARGET_TERM.capital, values: a.dimensions.map((d) => d.target), color: [198, 155, 89] },
  ]);
  r.bars(a.dimensions.map((d) => ({ label: `${d.dimensionId} ${dimensionName(d.dimensionId)}`, value: d.preliminary, target: d.target })));
  r.p('La madurez validada se presenta aparte porque se calcula sobre un universo menor de criterios.', 7.5, C.slate);
  r.h1('Principales brechas', 24);
  const gaps = a.states.filter((s) => s.applicable && currentScore(s) !== null && s.target - (currentScore(s) as number) > 0).sort((x, y) => (y.target - (currentScore(y) as number)) - (x.target - (currentScore(x) as number))).slice(0, 12);
  r.table(['Criterio', 'Nombre', 'Actual*', TARGET_TERM.capital, 'Brecha'], gaps.map((s) => [s.question.id, s.question.criterion, f1(currentScore(s)), f1(s.target), f1(s.target - (currentScore(s) as number))]), [18, 96, 18, 20, 22]);
  r.p('* Actual: nivel validado cuando existe; si no, nivel preliminar del criterio.', 7.5, C.slate);
  r.h1('Riesgos potenciales', 24);
  const risks = bundle.risks.length ? bundle.risks : [];
  if (risks.length) r.table(['Riesgo', 'Estado', 'P', 'I', 'Clasificación'], risks.map((x) => [x.title, RISK_STATUS_LABEL[x.status], x.probability, x.impact, riskBand(riskScore(x.probability, x.impact))?.label ?? 'Sin valorar']), [70, 30, 12, 12, 50]);
  else narrative.find((s) => s.key === 'riesgos')?.paragraphs.forEach((p) => r.p(p.text));
  r.h1('Prioridades', 24);
  r.table(['Criterio', 'Acción recomendada', 'Prioridad'], a.priorities.slice(0, 10).map((p) => [p.questionId, a.recommendations.find((x) => x.questionId === p.questionId)?.action ?? '', f1(p.score)]), [20, 134, 20]);
  r.h1('Hoja de ruta', 24);
  const inis = bundle.initiatives.length ? [...bundle.initiatives].sort((x, y) => x.phase - y.phase || x.startDate.localeCompare(y.startDate) || x.order - y.order) : [];
  if (inis.length) r.table(['Fase', 'Iniciativa', 'Inicio', 'Fin', 'Responsable'], inis.map((i) => [`${i.phase}. ${PHASES[i.phase - 1].name}`, i.name, i.startDate, i.endDate, i.owner]), [36, 64, 20, 20, 34]);
  else narrative.find((s) => s.key === 'hoja_ruta')?.paragraphs.forEach((p) => r.p(p.text));
  r.p('Los plazos son propuestas orientativas, no cronogramas contractuales.', 7.5, C.slate);
  r.h1('Limitaciones', 24);
  narrative.find((s) => s.key === 'limitaciones')?.paragraphs.forEach((p) => r.p(p.text));
  return r.finish();
}

export function buildTechnicalPDF(a: Analysis, bundle: AssessmentBundle): Blob {
  const r = new Report('Informe técnico de diagnóstico documental', `${a.organization.shortName || a.organization.name} · ${a.assessment.name}`);
  r.cover(a.organization.name, a.assessment.name, new Date().toLocaleDateString('es-CO', { dateStyle: 'long' }), scopeText(a));
  const narrative = buildNarrative(a, { risks: bundle.risks, initiatives: bundle.initiatives });
  r.h1('Caracterización');
  const org = a.organization;
  r.table(['Campo', 'Valor'], [
    ['Perfil organizacional', getProfile(org.profileId).label], ['Sector', org.sector], ['Actividad principal', org.mainActivity], ['Ubicación', `${org.municipality} ${org.department}`],
    ['Tamaño', org.size], ['Empleados', org.employees], ['Funciones públicas', org.legalFlags.publicFunctions], ['Recursos públicos', org.legalFlags.publicResources], ['Servicios públicos', org.legalFlags.publicServices],
    ...Object.entries(org.documentary).map(([k, v]) => [k, `${v.value} (${v.quality})`]),
  ], [60, 114]);
  r.h1('Metodología');
  narrative.find((s) => s.key === 'metodologia')?.paragraphs.forEach((p) => r.p(p.text));
  narrative.find((s) => s.key === 'alcance')?.paragraphs.forEach((p) => r.p(p.text));
  r.h2('Ponderaciones utilizadas');
  r.table(['Dimensión', 'Nombre', 'Ponderación'], a.dimensions.map((d) => [d.dimensionId, dimensionName(d.dimensionId), d.weight]), [24, 120, 30]);
  r.h2('Indicadores y fórmulas', 30);
  const vp = a.views.preliminary;
  const vv = a.views.validated;
  r.table(['Indicador', 'Fórmula', 'Valor'], [
    ['Madurez percibida', `Mediana por criterio (una respuesta por participante); promedio ponderado por dimensión. Calculada sobre ${vp.includedLabel}.`, f1(vp.global.score)],
    ['Madurez validada', `Niveles validados; mismo cálculo. Calculada sobre ${vv.includedLabel}${vv.exploratory ? ' (exploratorio)' : ''}.`, f1(vv.global.score)],
    [`Brecha frente a la ${TARGET_TERM.one}`, 'Promedio ponderado de máx(0, meta − nivel) por criterio puntuado (serie percibida).', f1(vp.gap)],
    ['Cobertura del diagnóstico', 'Criterios aplicables con puntuación / criterios aplicables del alcance.', `${fp(a.coverage.coverage)} (${a.coverage.numeric}/${a.coverage.applicable})`],
    ['Alcance sobre el banco', `Criterios aplicables del alcance / ${a.coverage.bankTotal}.`, fp(a.coverage.scopeCoverage)],
    ['Cobertura del banco', `Criterios del banco con puntuación / ${a.coverage.bankTotal}.`, `${fp(a.coverage.bankCoverage)} (${a.coverage.bankScored}/${a.coverage.bankTotal})`],
    ['Soporte de evidencias', 'Promedio ponderado del factor de evidencia (E0 = 0; E1 = 0,25; E2 = 0,6; E3 = 1).', fp(a.evidence.support)],
    ['Acuerdo entre entrevistados', 'Promedio de 1 − rango/5 en criterios con al menos dos participantes (0–1).', f1(a.agreement.agreement)],
    ['Índice orientativo de solidez', `${SOLIDITY_FORMULA}; escala 0–100. No es una confianza estadística.`, solidityValue(a)],
    ['Madurez organizacional', `Promedio ponderado por dimensión de ${dimensionRangeLabel([...LENS_DIMENSIONS.organizational])}.`, f1(vp.organizational.score)],
    ['Madurez tecnológica', `Promedio ponderado por dimensión de ${dimensionRangeLabel([...LENS_DIMENSIONS.technological])}.`, f1(vp.technological.score)],
  ], [40, 108, 26]);
  r.h1('Participantes');
  r.table(['Código', 'Perfil', 'Área', 'Criterios respondidos'], a.participantComparison.map((pc) => [pc.participant.code, roleLabel(pc.participant.profile), pc.participant.area, pc.answered]), [30, 60, 50, 34]);
  r.h1('Resultados por dimensión', 92);
  r.radar(dimLabels(a), [
    { name: 'Percibida (preliminar)', values: a.dimensions.map((d) => d.preliminary), color: SERIES_RGB },
    { name: TARGET_TERM.capital, values: a.dimensions.map((d) => d.target), color: [198, 155, 89] },
  ]);
  r.p(`Madurez validada: ${f1(a.globalValidated.score)} (${validatedNote(a)}).`, 8.5);
  r.table(['Dim.', 'Preliminar', 'Validada', TARGET_TERM.capital, 'Cobertura', 'Evidencia', 'Lectura'], a.dimensions.map((d) => [d.dimensionId, f1(d.preliminary), f1(d.validated), f1(d.target), fp(d.preliminaryCoverage), fp(d.evidenceSupport), d.band ? COVERAGE_BAND_LABEL[d.band] : 'Datos insuficientes']), [14, 20, 20, 18, 22, 22, 58]);
  r.h1('Resultados por criterio');
  r.table(['Criterio', 'Nombre', 'n', 'Mediana', 'Rango', 'Validado', 'Evidencia'], a.states.map((s) => [s.question.id, s.question.criterion, s.stats?.n ?? 0, f1(s.stats?.median), s.stats?.range ?? '—', s.validated ?? '—', evidenceCell(s)]), [18, 72, 8, 18, 14, 16, 28]);
  if (a.lenses.insufficientEvidence.length) r.p(`Validados sin evidencia suficiente (nivel 3 o superior con evidencia E0 o E1): ${a.lenses.insufficientEvidence.join(', ')}.`, 8);
  r.h1('Evidencias referenciadas');
  r.table(['Criterio', 'Título', 'Referencia', 'Estado'], bundle.evidence.map((e) => [e.questionId, e.title, e.reference, `${e.status} · ${EVIDENCE_LABEL[e.status]}`]), [18, 56, 56, 44]);
  r.h1('Discrepancias y contradicciones');
  narrative.find((s) => s.key === 'discrepancias')?.paragraphs.forEach((p) => r.p(`${p.text}${p.refs.length ? ` [${p.refs.slice(0, 8).join(', ')}]` : ''}`));
  if (a.contradictions.length) r.table(['Regla', 'Criterios', 'Descripción'], a.contradictions.map((c) => [c.rule.title, `${c.rule.a.questionId} / ${c.rule.b.questionId}`, c.rule.message]), [14, 40, 120]);
  r.h1('Riesgos');
  r.table(['Riesgo', 'Criterios', 'P', 'I', 'Valor', 'Estado'], (bundle.risks.length ? bundle.risks : a.suggestedRisks.map((s) => ({ title: s.title, questionIds: s.questionIds, probability: null, impact: null, status: 'sugerido' }))).map((x) => [x.title, x.questionIds.join(', '), x.probability, x.impact, riskScore(x.probability, x.impact), RISK_STATUS_LABEL[x.status as keyof typeof RISK_STATUS_LABEL] ?? x.status]), [50, 54, 10, 10, 14, 36]);
  r.h1('Recomendaciones');
  r.table(['Criterio', 'Tipo', 'Acción', 'Responsable', 'Indicador'], a.recommendations.filter((x) => x.status === 'brecha').map((x) => [x.questionId, x.verb ?? '', x.action, x.responsible, x.indicator]), [18, 20, 60, 30, 46]);
  r.h1('Narrativa diagnóstica');
  for (const s of narrative) {
    r.h2(s.title);
    s.paragraphs.forEach((p) => r.p(`${p.text}${p.refs.length ? ` [${[...new Set(p.refs)].slice(0, 8).join(', ')}]` : ''}`));
  }
  r.h1('Fuentes');
  const used = [...new Set(a.questions.flatMap((q) => q.sourceRefs))].map((id) => getSource(id)).filter(Boolean);
  r.table(['ID', 'Referente', 'Versión', 'Verificación'], used.map((s) => [s!.id, s!.title, s!.version, VERIFICATION_LABEL[s!.verificationStatus]]), [12, 100, 36, 26]);
  r.p('Las asociaciones entre criterios y referentes son conceptuales y no implican correspondencia con cláusulas o artículos específicos.', 7.5, C.slate);
  return r.finish();
}

export interface AcademicDeliverable {
  group: string;
  members: string;
  course: string;
  conclusions: string;
}

export function buildAcademicPDF(a: Analysis, bundle: AssessmentBundle, d: AcademicDeliverable): Blob {
  const r = new Report('Entregable del laboratorio de diagnóstico documental', `${d.group || 'Grupo'} · ${a.organization.name}`);
  r.cover(a.organization.name, `${d.course || 'Laboratorio académico'} · ${d.group}`, new Date().toLocaleDateString('es-CO', { dateStyle: 'long' }), 'Caso académico simulado. Los hechos descritos son ficticios.');
  r.h1('Identificación del grupo');
  r.table(['Campo', 'Valor'], [['Grupo', d.group], ['Integrantes', d.members], ['Curso o programa', d.course], ['Organización evaluada (simulación)', a.organization.name]], [50, 124]);
  r.h1('Tablero resumido');
  r.kpis([
    { label: 'Madurez preliminar del alcance', value: f1(a.globalPreliminary.score) },
    { label: 'Madurez validada del alcance', value: f1(a.globalValidated.score), note: validatedNote(a) },
    { label: 'Cobertura del diagnóstico', value: fp(a.coverage.coverage) },
  ]);
  r.radar(dimLabels(a), [{ name: 'Percibida (preliminar)', values: a.dimensions.map((x) => x.preliminary), color: SERIES_RGB }, { name: TARGET_TERM.capital, values: a.dimensions.map((x) => x.target), color: [198, 155, 89] }]);
  r.h1('Cinco brechas principales');
  const gaps = a.states.filter((s) => s.applicable && currentScore(s) !== null && s.target - (currentScore(s) as number) > 0).sort((x, y) => (y.target - (currentScore(y) as number)) - (x.target - (currentScore(x) as number))).slice(0, 5);
  r.table(['Criterio', 'Nombre', 'Actual', 'Brecha'], gaps.map((s) => [s.question.id, s.question.criterion, f1(currentScore(s)), f1(s.target - (currentScore(s) as number))]), [20, 110, 20, 24]);
  r.h1('Tres riesgos relevantes');
  const risks = (bundle.risks.length ? bundle.risks : a.suggestedRisks.map((s) => ({ title: s.title, questionIds: s.questionIds, probability: null, impact: null }))).slice(0, 3);
  r.table(['Riesgo', 'Criterios', 'Valoración'], risks.map((x) => [x.title, x.questionIds.join(', '), riskScore(x.probability, x.impact) ?? 'Sin valorar']), [60, 80, 34]);
  r.h1('Dos contradicciones identificadas');
  r.table(['Regla', 'Descripción'], a.contradictions.slice(0, 2).map((c) => [c.rule.title, c.rule.message]), [20, 154]);
  if (!a.contradictions.length) r.p('No se activaron reglas de contraste con las puntuaciones registradas.');
  r.h1('Tres iniciativas prioritarias');
  r.table(['Iniciativa', 'Fase', 'Criterios'], a.initiatives.slice(0, 3).map((i) => [i.template.name, `${i.phase}. ${PHASES[i.phase - 1].name}`, i.questionIds.join(', ')]), [70, 44, 60]);
  r.h1('Hoja de ruta', 24);
  buildNarrative(a, { risks: bundle.risks, initiatives: bundle.initiatives }).find((s) => s.key === 'hoja_ruta')?.paragraphs.forEach((p) => r.p(p.text));
  r.h1('Conclusiones argumentadas');
  r.p(d.conclusions || 'El grupo no registró conclusiones.');
  r.h1('Referentes utilizados');
  const used = [...new Set(a.questions.flatMap((q) => q.sourceRefs))].map((id) => getSource(id)).filter(Boolean);
  r.table(['ID', 'Referente'], used.map((s) => [s!.id, s!.title]), [14, 160]);
  return r.finish();
}
