#!/usr/bin/env node
/**
 * Generador del banco maestro DIAM.
 *
 * Lee las fuentes editoriales en src/data/question-bank/source/D01.txt … D15.txt,
 * valida su estructura y produce:
 *  - src/data/question-bank/bank.generated.json  (consumido por la aplicación)
 *  - docs/question-bank/diam-question-bank.json   (exportación pública)
 *  - docs/question-bank/diam-question-bank.csv
 *  - docs/QUESTION_BANK.md
 *  - docs/SOURCE_TRACEABILITY.csv
 *  - docs/SOURCE_REGISTER.md
 *
 * Si alguna validación falla, el proceso termina con código 1.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src/data/question-bank/source');
const BANK_VERSION = '1.0.0';

const ROLE_CODES = {
  dir: 'direccion', pla: 'planeacion', gd: 'gestion_documental', arc: 'archivo', tec: 'tecnologia',
  seg: 'seguridad', jur: 'juridica', ci: 'control_interno', fin: 'financiera', th: 'talento_humano',
  cal: 'calidad', dat: 'gobierno_datos', pro: 'procesos', usu: 'usuarios', prv: 'proveedores',
};
const MGDA = { EST: 'Estratégico', ADM: 'Administración de archivos', DOC: 'Documental', TEC: 'Tecnológico', CUL: 'Cultural' };
const CRIT = { a: 'alta', m: 'media', b: 'baja' };
const TIER = { q: 'quick', s: 'standard', p: 'professional' };
const LEGAL = { pub: 'obligacion_publica', gen: 'obligacion_general', sec: 'sectorial', bp: 'buena_practica' };
const COND = new Set(['fisico', 'electronico', 'firma', 'nube', 'terceros', 'ia', 'hist', 'datos_personales']);
const VERBS = ['formular', 'formalizar', 'implementar', 'controlar', 'evaluar', 'optimizar'];

const errors = [];
const fail = (m) => errors.push(m);

const sources = JSON.parse(readFileSync(join(root, 'src/data/sources/sources.json'), 'utf8'));
const sourceIds = new Set(sources.map((s) => s.id));
const glossary = JSON.parse(readFileSync(join(root, 'src/data/glossary.json'), 'utf8'));

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function glossaryFor(text) {
  const t = ` ${norm(text)} `;
  const hits = [];
  for (const g of glossary) {
    const keys = [g.term, ...(g.aliases ?? [])];
    if (keys.some((k) => new RegExp(`[^a-z0-9]${norm(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z0-9]`).test(t))) hits.push(g.id);
  }
  return hits;
}

function parseFile(file) {
  const raw = readFileSync(join(srcDir, file), 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  const dim = { id: '', name: '', weight: 0, sources: [], mgda: '', summary: '', questions: [] };
  let q = null;
  const push = () => { if (q) dim.questions.push(q); };
  for (const [i, lineRaw] of lines.entries()) {
    const line = lineRaw.trimEnd();
    if (!line.trim() || line.startsWith('//')) continue;
    const loc = `${file}:${i + 1}`;
    if (line.startsWith('@dimension ')) { dim.id = line.slice(11).trim(); continue; }
    if (line.startsWith('@name ')) { dim.name = line.slice(6).trim(); continue; }
    if (line.startsWith('@weight ')) { dim.weight = Number(line.slice(8)); continue; }
    if (line.startsWith('@sources ')) { dim.sources = line.slice(9).split(',').map((s) => s.trim()); continue; }
    if (line.startsWith('@mgda ')) { dim.mgda = MGDA[line.slice(6).trim()] ?? fail(`${loc} mgda inválido`); continue; }
    if (line.startsWith('@summary ')) { dim.summary = line.slice(9).trim(); continue; }
    if (line.startsWith('@note ')) { dim.note = line.slice(6).trim(); continue; }
    const head = line.match(/^# Q(\d{2}) (.+)$/);
    if (head) {
      push();
      q = { n: head[1], criterion: head[2].trim(), d: [], r: [], loc };
      continue;
    }
    if (!q) { fail(`${loc} contenido fuera de pregunta`); continue; }
    const m = line.match(/^(@|P|A|W|[0-5]|C|X|E|R[0-5]|V):\s?(.*)$/) ?? line.match(/^(@)\s(.*)$/);
    if (!m) { fail(`${loc} línea no reconocida: ${line.slice(0, 40)}`); continue; }
    const [, key, value] = m;
    const v = value.trim();
    if (key === '@') q.meta = v;
    else if (key === 'P') q.question = v;
    else if (key === 'A') q.explanation = v;
    else if (key === 'W') q.why = v;
    else if (/^[0-5]$/.test(key)) q.d[Number(key)] = v;
    else if (key === 'C') q.checks = v.split('|').map((s) => s.trim()).filter(Boolean);
    else if (key === 'X') q.example = v;
    else if (key === 'E') q.evidence = v.split('|').map((s) => s.trim()).filter(Boolean);
    else if (key === 'V') q.validation = v;
    else if (key.startsWith('R')) q.r[Number(key.slice(1))] = v;
  }
  push();
  return dim;
}

function parseMeta(meta, loc) {
  const out = { crit: 'media', critical: false, tier: 'professional', roles: [], src: [], legal: 'buena_practica', cond: [], pre: [], rel: [], min: null, mgda: null };
  for (const tok of (meta ?? '').split(/\s+/).filter(Boolean)) {
    if (tok === 'critical') { out.critical = true; continue; }
    const [k, v] = tok.split('=');
    if (!v) { fail(`${loc} meta sin valor: ${tok}`); continue; }
    const list = v.split(',').filter(Boolean);
    switch (k) {
      case 'crit': out.crit = CRIT[v] ?? (fail(`${loc} crit ${v}`), 'media'); break;
      case 'tier': out.tier = TIER[v] ?? (fail(`${loc} tier ${v}`), 'professional'); break;
      case 'mgda': out.mgda = MGDA[v] ?? (fail(`${loc} mgda ${v}`), null); break;
      case 'roles': out.roles = list.map((r) => ROLE_CODES[r] ?? (fail(`${loc} rol ${r}`), r)); break;
      case 'src': out.src = list; break;
      case 'legal': out.legal = LEGAL[v] ?? (fail(`${loc} legal ${v}`), 'buena_practica'); break;
      case 'cond': out.cond = list; list.forEach((c) => COND.has(c) || fail(`${loc} cond ${c}`)); break;
      case 'pre': out.pre = list; break;
      case 'rel': out.rel = list; break;
      case 'min': out.min = Number(v); break;
      default: fail(`${loc} clave meta desconocida ${k}`);
    }
  }
  return out;
}

const only = process.env.BANK_ONLY ? process.env.BANK_ONLY.split(',') : null;
const files = Array.from({ length: 15 }, (_, i) => `D${String(i + 1).padStart(2, '0')}.txt`).filter((f) => !only || only.includes(f.slice(0, 3)));
const dimensions = [];
const questions = [];
for (const f of files) {
  const dim = parseFile(f);
  if (!dim.id || !dim.name || !dim.weight) fail(`${f} encabezado de dimensión incompleto`);
  if (dim.questions.length !== 15) fail(`${f} tiene ${dim.questions.length} criterios (se esperan 15)`);
  const tiers = { quick: 0, standard: 0, professional: 0 };
  dim.questions.forEach((q, idx) => {
    const id = `${dim.id}-Q${q.n}`;
    if (Number(q.n) !== idx + 1) fail(`${q.loc} numeración no consecutiva (${id})`);
    const meta = parseMeta(q.meta, q.loc);
    for (const [field, label] of [['question', 'P'], ['explanation', 'A'], ['why', 'W'], ['example', 'X']]) {
      if (!q[field]) fail(`${id} falta ${label}`);
    }
    if (!q.question?.startsWith('¿') || !q.question?.endsWith('?')) fail(`${id} la pregunta debe formularse como interrogante`);
    if (q.d.filter(Boolean).length !== 6) fail(`${id} requiere 6 descriptores (tiene ${q.d.filter(Boolean).length})`);
    if (new Set(q.d).size !== 6) fail(`${id} descriptores repetidos`);
    if (q.r.filter(Boolean).length !== 6) fail(`${id} requiere 6 recomendaciones`);
    if (!q.evidence?.length || q.evidence.length < 2) fail(`${id} requiere al menos 2 evidencias sugeridas`);
    if (!q.checks?.length) fail(`${id} requiere comprobaciones observables (C)`);
    if (!meta.roles.length) fail(`${id} sin roles sugeridos`);
    const refs = meta.src.length ? meta.src : dim.sources;
    refs.forEach((s) => sourceIds.has(s) || fail(`${id} fuente desconocida ${s}`));
    tiers[meta.tier] += 1;
    const text = `${q.criterion}. ${q.question} ${q.explanation}`;
    questions.push({
      id,
      bankVersion: BANK_VERSION,
      dimensionId: dim.id,
      order: idx + 1,
      criterion: q.criterion,
      question: q.question,
      explanation: q.explanation,
      whyItMatters: q.why,
      glossaryTerms: glossaryFor(text),
      maturityDescriptors: q.d,
      observableChecks: q.checks,
      examples: [q.example],
      evidenceSuggestions: q.evidence,
      sourceRefs: refs,
      sourceMappingStatus: 'asociacion_conceptual',
      mgdaComponent: meta.mgda ?? dim.mgda,
      suggestedRespondents: meta.roles,
      applicabilityRules: meta.cond,
      legalApplicability: meta.legal,
      defaultWeight: 1,
      criticality: meta.crit,
      isCritical: meta.critical,
      minimumRecommendedLevel: meta.min ?? (meta.critical ? 3 : 2),
      coreTier: meta.tier,
      recommendationByLevel: q.r.map((text, level) => ({ level, verb: VERBS[level], text })),
      prerequisiteQuestionIds: meta.pre,
      relatedQuestionIds: meta.rel,
      contradictionRules: [],
      validationGuidance:
        q.validation ??
        `Contrastar la respuesta con: ${q.checks.join('; ').toLowerCase()}. Solicitar al menos una evidencia del tipo: ${q.evidence[0].toLowerCase()}.`,
    });
  });
  if (tiers.quick !== 2) fail(`${dim.id} debe tener 2 criterios quick (tiene ${tiers.quick})`);
  if (tiers.standard !== 4) fail(`${dim.id} debe tener 4 criterios standard (tiene ${tiers.standard})`);
  dimensions.push({ id: dim.id, name: dim.name, defaultWeight: dim.weight, sourceRefs: dim.sources, mgdaComponent: dim.mgda, summary: dim.summary, note: dim.note ?? null });
}

// Validaciones transversales
const ids = new Set();
const texts = new Map();
for (const q of questions) {
  if (ids.has(q.id)) fail(`Identificador duplicado ${q.id}`);
  ids.add(q.id);
  const key = norm(q.question).replace(/[^a-z ]/g, '');
  if (texts.has(key)) fail(`Pregunta duplicada ${q.id} = ${texts.get(key)}`);
  texts.set(key, q.id);
}
for (const q of questions) {
  [...q.prerequisiteQuestionIds, ...q.relatedQuestionIds].forEach((r) => ids.has(r) || (only && !only.includes(r.slice(0, 3))) || fail(`${q.id} referencia inexistente ${r}`));
}
const totalWeight = dimensions.reduce((a, d) => a + d.defaultWeight, 0);
if (!only && totalWeight !== 100) fail(`La suma de ponderaciones es ${totalWeight} (se espera 100)`);
const descriptorSet = new Set(questions.flatMap((q) => q.maturityDescriptors));
if (!only && descriptorSet.size < 1350) fail(`Descriptores únicos: ${descriptorSet.size} (mínimo 1.350)`);

if (only) {
  if (errors.length) { errors.forEach((e) => console.error('  -', e)); process.exit(1); }
  console.log(`✓ Validación parcial ${only.join(',')}: ${questions.length} criterios`);
  process.exit(0);
}
if (errors.length) {
  console.error(`\n✗ Banco DIAM inválido (${errors.length} errores):`);
  errors.slice(0, 80).forEach((e) => console.error('  -', e));
  process.exit(1);
}

const bank = { bankVersion: BANK_VERSION, methodology: 'DIAM — DocMaturity Integrated Assessment Model v1.0', generatedFrom: 'src/data/question-bank/source', dimensions, questions };
writeFileSync(join(root, 'src/data/question-bank/bank.generated.json'), JSON.stringify(bank));

const docsDir = join(root, 'docs/question-bank');
mkdirSync(docsDir, { recursive: true });
writeFileSync(join(docsDir, 'diam-question-bank.json'), JSON.stringify(bank, null, 2));

const csvCell = (v) => {
  let s = Array.isArray(v) ? v.join(' | ') : String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const header = ['id', 'dimension', 'criterio', 'pregunta', 'aclaracion', 'por_que_importa', 'nivel_0', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4', 'nivel_5', 'evidencias', 'referentes', 'componente_mgda', 'criticidad', 'critico', 'nivel_minimo', 'modalidad', 'aplicabilidad_juridica', 'condiciones', 'roles'];
const dimName = Object.fromEntries(dimensions.map((d) => [d.id, d.name]));
const rows = questions.map((q) => [q.id, dimName[q.dimensionId], q.criterion, q.question, q.explanation, q.whyItMatters, ...q.maturityDescriptors, q.evidenceSuggestions, q.sourceRefs, q.mgdaComponent, q.criticality, q.isCritical ? 'sí' : 'no', q.minimumRecommendedLevel, q.coreTier, q.legalApplicability, q.applicabilityRules, q.suggestedRespondents]);
writeFileSync(join(docsDir, 'diam-question-bank.csv'), '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'));

const srcName = Object.fromEntries(sources.map((s) => [s.id, s]));
const trace = [['criterio', 'dimension', 'fuente', 'titulo_fuente', 'tipo_referente', 'componente_mgda', 'criticidad', 'caracter', 'estado_verificacion', 'tipo_asociacion']];
for (const q of questions) {
  for (const s of q.sourceRefs) {
    const src = srcName[s];
    const caracter = src.type === 'norma_juridica' ? 'normativo (sujeto a aplicabilidad)' : 'orientativo';
    trace.push([q.id, q.dimensionId, s, src.title, src.type, q.mgdaComponent, q.criticality, caracter, src.verificationStatus, 'asociación conceptual']);
  }
}
writeFileSync(join(root, 'docs/SOURCE_TRACEABILITY.csv'), '﻿' + trace.map((r) => r.map(csvCell).join(',')).join('\n'));

const tierLabel = { quick: 'Rápido', standard: 'Estándar', professional: 'Profesional' };
let md = `# Banco maestro DIAM v${BANK_VERSION}\n\n> Documento generado automáticamente por \`npm run bank\` a partir de \`src/data/question-bank/source\`. No editar a mano.\n\n`;
md += `- Dimensiones: ${dimensions.length}\n- Criterios: ${questions.length}\n- Descriptores de madurez: ${questions.length * 6}\n- Recomendaciones por nivel: ${questions.length * 6}\n- Criterios críticos: ${questions.filter((q) => q.isCritical).length}\n- Diagnóstico rápido: ${questions.filter((q) => q.coreTier === 'quick').length} · estándar: ${questions.filter((q) => q.coreTier !== 'professional').length} · profesional: ${questions.length}\n\n`;
md += 'Las asociaciones con referentes son **conceptuales**: no implican correspondencia exacta con cláusulas, numerales o artículos.\n\n';
for (const d of dimensions) {
  md += `## ${d.id}. ${d.name} — ponderación inicial ${d.defaultWeight}%\n\n${d.summary}\n\nReferentes principales: ${d.sourceRefs.join(', ')}.${d.note ? `\n\n_Nota:_ ${d.note}` : ''}\n\n`;
  for (const q of questions.filter((x) => x.dimensionId === d.id)) {
    md += `### ${q.id} · ${q.criterion}\n\n**Pregunta.** ${q.question}\n\n**Aclaración.** ${q.explanation}\n\n**Por qué importa.** ${q.whyItMatters}\n\n`;
    md += q.maturityDescriptors.map((t, i) => `- **${i}.** ${t}`).join('\n');
    md += `\n\n**Evidencias sugeridas:** ${q.evidenceSuggestions.join('; ')}.  \n**Referentes:** ${q.sourceRefs.join(', ')} · **MGDA:** ${q.mgdaComponent} · **Criticidad:** ${q.criticality}${q.isCritical ? ' (crítico)' : ''} · **Modalidad mínima:** ${tierLabel[q.coreTier]}\n\n`;
    md += '**Recomendaciones por nivel:**\n\n' + q.recommendationByLevel.map((r) => `- N${r.level} (${r.verb}): ${r.text}`).join('\n') + '\n\n';
  }
}
writeFileSync(join(root, 'docs/QUESTION_BANK.md'), md);

const typeLabel = { norma_juridica: 'Norma jurídica', estandar_tecnico: 'Estándar técnico', modelo_madurez: 'Modelo de madurez', modelo_requisitos: 'Modelo de requisitos funcionales', metodologia: 'Metodología de implementación', buena_practica: 'Buena práctica / marco', referente_academico: 'Referente académico', modelo_gestion: 'Modelo de gestión' };
const statusLabel = { verificado: 'Verificado', verificado_parcial: 'Verificado parcialmente', referencia_conceptual: 'Referencia conceptual (resumen oficial)', no_verificado: 'No verificado — pendiente' };
let reg = `# Registro de fuentes DIAM\n\n> Generado por \`npm run bank\` desde \`src/data/sources/sources.json\`.\n\nFecha de consulta de referencia: ver columna correspondiente. Las asociaciones con el banco son conceptuales.\n\n| ID | Título | Autor institucional | Año / versión | Tipo | Estado | Dimensiones | Criterios asociados |\n|---|---|---|---|---|---|---|---|\n`;
for (const s of sources) {
  const n = questions.filter((q) => q.sourceRefs.includes(s.id)).length;
  reg += `| ${s.id} | ${s.title} | ${s.author} | ${s.version} | ${typeLabel[s.type] ?? s.type} | ${statusLabel[s.verificationStatus]} | ${s.dimensions.join(', ')} | ${n} |\n`;
}
reg += '\n## Detalle\n\n';
for (const s of sources) {
  reg += `### ${s.id} — ${s.title}\n\n- **URL oficial:** ${s.urls.join(' · ') || 'No aplica'}\n- **Fecha de consulta:** ${s.consultedAt}\n- **Alcance:** ${s.scope}\n- **Qué evalúa:** ${s.evaluates}\n- **Qué no evalúa:** ${s.notEvaluates}\n- **Relación con DIAM:** ${s.relation}\n- **Componentes o apartados verificados:** ${s.verifiedParts}\n- **Limitaciones de acceso:** ${s.accessLimitations}\n- **Estado de verificación:** ${statusLabel[s.verificationStatus]}\n\n`;
}
writeFileSync(join(root, 'docs/SOURCE_REGISTER.md'), reg);

console.log(`✓ Banco DIAM v${BANK_VERSION}: ${dimensions.length} dimensiones, ${questions.length} criterios, ${descriptorSet.size} descriptores únicos, ${questions.filter((q) => q.isCritical).length} críticos.`);
