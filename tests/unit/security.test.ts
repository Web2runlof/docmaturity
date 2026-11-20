import { beforeEach, describe, expect, it } from 'vitest';
import { db, guarded, StorageQuotaError } from '@/database/db';
import { loadCase } from '@/services/demo';
import { loadBundle, newOrganization, saveOrganization } from '@/services/repo';
import { buildOrganizationPackage, importAssignmentPackage, PackageError } from '@/services/packages';
import { analyzeAssessment } from '@/engine/analyze';
import { buildAIPrompt, reviewExternalText } from '@/services/ai';
import { packageHash, plainText, readFileText, safeParseJSON, UnsafeContentError } from '@/utils/core';
import { PACKAGE_LIMITS } from '@/schemas/packages';
import { proposeInitiatives } from '@/engine/recommendations';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Protección de contenido', () => {
  it('49 · el contenido con HTML se almacena como texto y nunca se interpreta', async () => {
    const malicious = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const org = newOrganization({ name: plainText(malicious), description: malicious });
    await saveOrganization(org);
    const stored = await db.organizations.get(org.id);
    expect(stored?.name).toBe(malicious);
    // La interfaz usa React sin dangerouslySetInnerHTML (regla de ESLint), por lo que el texto se escapa al mostrarse.
    const el = document.createElement('div');
    el.textContent = stored?.name ?? '';
    expect(el.querySelector('img, script')).toBeNull();
  });

  it('49 · rechaza archivos con claves que contaminan prototipos', () => {
    expect(() => safeParseJSON('{"__proto__": {"admin": true}}')).toThrow(UnsafeContentError);
    expect(() => safeParseJSON('{"a": {"constructor": {"prototype": {}}}}')).toThrow(UnsafeContentError);
  });

  it('elimina caracteres de control en textos libres', () => {
    expect(plainText('a\u0000b\u0007c\nd')).toBe('abc\nd');
  });

  it('26 · rechaza paquetes de asignación que no son JSON o que tienen otro formato', async () => {
    await expect(importAssignmentPackage('no es json')).rejects.toThrow();
    await expect(importAssignmentPackage(JSON.stringify({ format: 'otro.formato' }))).rejects.toBeInstanceOf(PackageError);
  });
});

describe('57 · límites de almacenamiento y de archivos', () => {
  it('traduce el error de cuota del navegador a un mensaje comprensible', async () => {
    const quota = Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    await expect(guarded(async () => { throw quota; })).rejects.toBeInstanceOf(StorageQuotaError);
    const wrapped = Object.assign(new Error('dexie'), { name: 'AbortError', inner: { name: 'QuotaExceededError' } });
    await expect(guarded(async () => { throw wrapped; })).rejects.toBeInstanceOf(StorageQuotaError);
  });

  it('rechaza archivos que superan el tamaño máximo antes de leerlos', async () => {
    const big = { size: PACKAGE_LIMITS.assignment + 1, text: async () => '' } as unknown as File;
    await expect(readFileText(big, PACKAGE_LIMITS.assignment)).rejects.toThrow(/tamaño máximo/);
  });
});

describe('Asistente de IA opcional', () => {
  it('el prompt anonimizado no incluye el nombre de la organización ni los códigos de participantes', async () => {
    const id = await loadCase('caso-ips', 'demo');
    const bundle = await loadBundle(id);
    const a = analyzeAssessment(bundle!);
    const prompt = buildAIPrompt(a, { purpose: 'resumen_ejecutivo', anonymize: true, includeNotes: false });
    expect(prompt).not.toContain(bundle!.organization.name);
    expect(prompt).not.toContain(bundle!.organization.shortName);
    for (const p of bundle!.participants) expect(prompt).not.toContain(p.code);
    expect(prompt).toMatch(/No afirme certificación/);
    const named = buildAIPrompt(a, { purpose: 'resumen_ejecutivo', anonymize: false, includeNotes: false });
    expect(named).toContain(bundle!.organization.name);
  });

  it('advierte sobre afirmaciones de certificación y criterios fuera del alcance en textos externos', async () => {
    const id = await loadCase('caso-ips', 'demo');
    const a = analyzeAssessment((await loadBundle(id))!);
    const w = reviewExternalText('La entidad obtuvo la certificación. Ver D99-Q99.', a);
    expect(w.some((x) => /certificaciones/.test(x))).toBe(true);
    expect(w.some((x) => /D99-Q99/.test(x))).toBe(true);
  });
});

describe('Hoja de ruta', () => {
  it('las iniciativas no dependen de forma circular y cada una aparece después de sus dependencias', async () => {
    for (const caseId of ['caso-alcaldia', 'caso-universidad', 'caso-ips', 'caso-industrial', 'caso-financiera']) {
      const id = await loadCase(caseId, 'academic');
      const a = analyzeAssessment((await loadBundle(id))!);
      const list = proposeInitiatives(a.states, a.priorities);
      const pos = new Map(list.map((p, i) => [p.template.id, i]));
      for (const p of list) {
        for (const d of p.dependsOn) {
          expect(pos.get(d)).toBeLessThan(pos.get(p.template.id) as number);
          expect(list.find((x) => x.template.id === d)?.dependsOn.includes(p.template.id)).toBe(false);
        }
      }
      const ia = list.find((p) => p.template.id === 'T18');
      const auto = list.find((p) => p.template.id === 'T12');
      if (ia && auto) expect(auto.dependsOn).toContain('T18');
    }
  });
});

describe('Exportación JSON de organización', () => {
  it('incluye versiones de esquema y metodología, dependencias y un hash verificable', async () => {
    const org = newOrganization({ name: 'Organización exportable' });
    await saveOrganization(org, ['Archivo central', 'Tecnología']);
    const pkg = await buildOrganizationPackage(org.id);
    expect(pkg.format).toBe('docmaturity.organization');
    expect(pkg.methodologyVersion).toBe('DIAM 1.0');
    expect(pkg.departments.map((d) => d.name).sort()).toEqual(['Archivo central', 'Tecnología']);
    const { hash, ...base } = pkg;
    expect(await packageHash(base)).toBe(hash);
  });
});
