/** Componentes de interfaz accesibles del sistema de diseño DOCMATURITY (ver docs/DESIGN_SYSTEM.md). */
import * as RDialog from '@radix-ui/react-dialog';
import * as RTooltip from '@radix-ui/react-tooltip';
import * as RTabs from '@radix-ui/react-tabs';
import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, CircleDot, Clock3, FileWarning, GitCompareArrows, Info, Loader2, MinusCircle, ShieldCheck, Split, X, XCircle } from 'lucide-react';
import { cx, fmtScore } from '@/utils/core';
import { LEVEL_NAMES } from '@/data/bank';
import { levelIndex } from '@/engine/scoring';
import { useUI } from '@/app/store';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'dark' | 'outline-light';

/** Clases de botón reutilizables también por enlaces (<Link className={buttonClass(...)}>). */
export const buttonClass = (variant: ButtonVariant = 'secondary', size: 'sm' | 'md' | 'lg' = 'md', className?: string) =>
  cx('btn', size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', `btn-${variant}`, className);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  busy?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', size = 'md', icon, busy, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} type="button" disabled={disabled || busy} aria-busy={busy || undefined} className={buttonClass(variant, size, className)} {...rest}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function Field({ label, hint, error, children, htmlFor, required }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[0.8125rem] font-medium text-ink">
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="flex items-center gap-1 text-xs text-danger"><XCircle className="size-3.5 shrink-0" aria-hidden />{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx('input', className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...p }, ref) {
  return <textarea ref={ref} rows={rows} className={cx('input resize-y', className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return <select ref={ref} className={cx('input pr-8', className)} {...p}>{children}</select>;
});

/** Encabezado editorial de página: contexto, título, descripción, metadatos y acciones. */
export function PageHeader({ eyebrow, title, description, actions, meta, tone = 'default' }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode; meta?: ReactNode; tone?: 'default' | 'academic' }) {
  return (
    <header className={cx('mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between', tone === 'academic' && 'border-l-[3px] border-violet pl-5')}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className={cx('eyebrow mb-2.5', tone === 'academic' && '!text-violet-strong')}>{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-[-0.022em] md:text-[2.1rem]">{title}</h1>
        {description && <div className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">{description}</div>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}

/** Bloque de contenido con encabezado. `flush` elimina el relleno para tablas a todo el ancho. */
export function Section({ title, description, actions, children, className, id, flush, eyebrow }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string; flush?: boolean; eyebrow?: string }) {
  return (
    <section id={id} className={cx('panel min-w-0 scroll-mt-20', className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 border-b border-line px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            {title && <h2 className="text-[1rem] font-semibold">{title}</h2>}
            {description && <div className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{description}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, description, actions }: { icon?: ReactNode; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-mint-soft text-mint-strong ring-8 ring-mint-soft/40">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <div className="mt-2 max-w-md text-sm text-muted">{description}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

const LEVEL_BG = ['bg-lv0', 'bg-lv1', 'bg-lv2', 'bg-lv3', 'bg-lv4', 'bg-lv5'];

/** Etiqueta de nivel: forma + número + nombre (no depende solo del color). */
export function LevelTag({ score, size = 'md', showName = true }: { score: number | null | undefined; size?: 'sm' | 'md'; showName?: boolean }) {
  if (score === null || score === undefined) {
    return (
      <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap text-nodata', size === 'sm' ? 'text-xs' : 'text-sm')}>
        <CircleDashed className="size-3.5" aria-hidden />
        Sin datos
      </span>
    );
  }
  const li = levelIndex(score);
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-ink num', size === 'sm' ? 'text-xs' : 'text-sm')} title={`${fmtScore(score)} · ${LEVEL_NAMES[li]}`}>
      <span className={cx('inline-block rounded-[2px]', LEVEL_BG[li], size === 'sm' ? 'size-2.5' : 'size-3')} aria-hidden />
      {fmtScore(score)}
      {showName && <span className="font-normal text-muted">· {LEVEL_NAMES[li]}</span>}
    </span>
  );
}

export type TagTone = 'neutral' | 'teal' | 'gold' | 'danger' | 'warning' | 'info' | 'violet' | 'dark';
export function Tag({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: TagTone; icon?: ReactNode }) {
  const tones: Record<TagTone, string> = {
    neutral: 'text-muted border-line bg-white',
    teal: 'text-mint-strong border-[#bfeedb] bg-mint-soft',
    gold: 'text-[#7d5d2b] border-[#ead9bd] bg-[#fbf6ee]',
    danger: 'text-danger border-red-200 bg-red-50',
    warning: 'text-[#8a4b0f] border-amber-200 bg-amber-50',
    info: 'text-info border-blue-200 bg-blue-50',
    violet: 'text-violet-strong border-[#dcd5fd] bg-violet-soft',
    dark: 'text-white border-midnight bg-midnight',
  };
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-[5px] border px-1.5 py-0.5 text-[0.6875rem] font-medium', tones[tone])}>{icon}{children}</span>;
}

/** Estados de revisión: siempre con icono y texto, nunca solo color. */
export type StatusKind = 'pendiente' | 'validado' | 'discrepancia' | 'contradiccion' | 'evidencia_insuficiente' | 'evidencia_registrada' | 'no_aplica' | 'en_curso' | 'finalizado' | 'por_validar';
const STATUS_STYLE: Record<StatusKind, { label: string; tone: TagTone; icon: ReactNode }> = {
  pendiente: { label: 'Pendiente', tone: 'neutral', icon: <CircleDashed className="size-3" aria-hidden /> },
  validado: { label: 'Validado', tone: 'teal', icon: <ShieldCheck className="size-3" aria-hidden /> },
  discrepancia: { label: 'Discrepancia', tone: 'warning', icon: <Split className="size-3" aria-hidden /> },
  contradiccion: { label: 'Contradicción', tone: 'danger', icon: <GitCompareArrows className="size-3" aria-hidden /> },
  evidencia_insuficiente: { label: 'Sin evidencia suficiente', tone: 'warning', icon: <FileWarning className="size-3" aria-hidden /> },
  evidencia_registrada: { label: 'Evidencia registrada', tone: 'info', icon: <CheckCircle2 className="size-3" aria-hidden /> },
  no_aplica: { label: 'No aplica', tone: 'neutral', icon: <MinusCircle className="size-3" aria-hidden /> },
  en_curso: { label: 'En curso', tone: 'info', icon: <Clock3 className="size-3" aria-hidden /> },
  finalizado: { label: 'Finalizado', tone: 'teal', icon: <CheckCircle2 className="size-3" aria-hidden /> },
  por_validar: { label: 'Por validar', tone: 'violet', icon: <CircleDot className="size-3" aria-hidden /> },
};
export function StatusBadge({ kind, label }: { kind: StatusKind; label?: string }) {
  const s = STATUS_STYLE[kind];
  return <Tag tone={s.tone} icon={s.icon}>{label ?? s.label}</Tag>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'warning' | 'danger' }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={cx('mt-1 font-display text-2xl font-semibold num', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-navy')}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

/** Indicador KPI con acento lateral opcional y contexto. */
export function KPIStat({ label, value, hint, icon, accent = false, tone }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; accent?: boolean; tone?: 'warning' | 'danger' }) {
  return (
    <div className={cx('relative min-w-0 bg-white px-5 py-4', accent && 'before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r before:bg-mint')}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted">{label}</div>
        {icon && <span className="text-muted" aria-hidden>{icon}</span>}
      </div>
      <div className={cx('mt-1.5 font-display text-[1.65rem] font-bold leading-none tracking-tight num', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-navy')}>{value}</div>
      {hint && <div className="mt-1.5 text-xs leading-snug text-muted">{hint}</div>}
    </div>
  );
}

export function Progress({ value, label, tone = 'teal', dark = false }: { value: number | null; label: string; tone?: 'teal' | 'navy' | 'gold'; dark?: boolean }) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const colors = { teal: 'bg-petrol', navy: 'bg-navy', gold: 'bg-gold' };
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(v)} aria-valuetext={value === null ? 'Sin datos' : `${Math.round(v)} %`} className={cx('h-1.5 w-full overflow-hidden rounded-full', dark ? 'bg-white/10' : 'bg-neutral')}>
      <div className={cx('h-full rounded-full transition-[width] duration-300', dark ? 'bg-mint' : colors[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Anillo de avance circular (decorativo para la cifra que lo acompaña, que siempre se muestra en texto). */
export function ProgressRing({ value, size = 56, stroke = 6, label, dark = false, children }: { value: number | null; size?: number; stroke?: number; label: string; dark?: boolean; children?: ReactNode }) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value === null ? 'sin datos' : `${Math.round(v)} %`}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? 'rgb(255 255 255 / 0.12)' : '#e9eef4'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? '#35d9a4' : '#0e9f74'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 700ms var(--ease-out)' }} />
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </div>
  );
}

/** Esqueleto de carga para bloques que dependen de IndexedDB. */
export function SkeletonLoader({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('animate-pulse space-y-2.5', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => <div key={i} className="h-3 rounded bg-neutral" style={{ width: `${92 - i * 14}%` }} />)}
    </div>
  );
}

export function Dialog({ open, onOpenChange, title, description, children, footer, wide }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-midnight/55 backdrop-blur-[2px]" />
        <RDialog.Content className={cx('fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-white shadow-pop', wide ? 'max-w-4xl' : 'max-w-lg')}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <RDialog.Title className="font-display text-lg font-semibold text-navy">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-1 text-sm text-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
            </div>
            <RDialog.Close className="rounded-md p-1 text-muted transition-colors hover:bg-neutral hover:text-ink" aria-label="Cerrar">
              <X className="size-4" />
            </RDialog.Close>
          </div>
          {children && <div className="px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-soft px-5 py-3">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirmar', danger, onConfirm, children, requireText }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void | Promise<void>; children?: ReactNode; requireText?: string }) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const id = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { setTyped(''); onOpenChange(o); }}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} busy={busy} disabled={Boolean(requireText) && typed !== requireText} onClick={async () => { setBusy(true); try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); } }}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {requireText && (
        <div className="mt-3">
          <Field label={`Escriba «${requireText}» para confirmar`} htmlFor={id}>
            <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </Field>
        </div>
      )}
    </Dialog>
  );
}

export function Tip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RTooltip.Root delayDuration={200}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content sideOffset={6} className="z-50 max-w-xs rounded-md bg-midnight px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-pop">
          {content}
          <RTooltip.Arrow className="fill-midnight" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

export function Tabs({ tabs, value, onValueChange, children }: { tabs: { value: string; label: ReactNode }[]; value: string; onValueChange: (v: string) => void; children: ReactNode }) {
  return (
    <RTabs.Root value={value} onValueChange={onValueChange}>
      <RTabs.List className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Secciones">
        {tabs.map((t) => (
          <RTabs.Trigger key={t.value} value={t.value} className="relative -mb-px whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-muted transition-colors duration-150 hover:text-ink data-[state=active]:border-mint-strong data-[state=active]:text-navy">
            {t.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  );
}
export const TabPanel = RTabs.Content;

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; title?: string; children: ReactNode }) {
  const map = {
    info: { cls: 'border-blue-200 bg-blue-50/70 before:bg-info', icon: <Info className="size-4 text-info" aria-hidden /> },
    warning: { cls: 'border-amber-200 bg-amber-50/80 before:bg-warning', icon: <AlertTriangle className="size-4 text-warning" aria-hidden /> },
    danger: { cls: 'border-red-200 bg-red-50/80 before:bg-danger', icon: <XCircle className="size-4 text-danger" aria-hidden /> },
    success: { cls: 'border-[#bfeedb] bg-mint-soft before:bg-petrol', icon: <CheckCircle2 className="size-4 text-mint-strong" aria-hidden /> },
  }[tone];
  return (
    <div className={cx('relative flex gap-3 overflow-hidden rounded-md border py-3 pr-4 pl-5 text-sm before:absolute before:inset-y-0 before:left-0 before:w-[3px]', map.cls)} role={tone === 'danger' ? 'alert' : undefined}>
      <div className="mt-0.5 shrink-0">{map.icon}</div>
      <div className="min-w-0">
        {title && <p className="font-medium text-ink">{title}</p>}
        <div className="text-ink/80">{children}</div>
      </div>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useUI();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className="page-in pointer-events-auto flex gap-3 rounded-lg border border-edge bg-midnight px-4 py-3 text-white shadow-pop">
          {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint" /> : t.kind === 'error' ? <XCircle className="mt-0.5 size-4 shrink-0 text-red-300" /> : t.kind === 'warning' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" /> : <Info className="mt-0.5 size-4 shrink-0 text-sky-300" />}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-white">{t.title}</p>
            {t.message && <p className="mt-0.5 text-fog">{t.message}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-fog hover:text-white" aria-label="Cerrar notificación"><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}

export function FileDrop({ accept, onFile, label, hint }: { accept: string; onFile: (f: File) => void; label: string; hint?: string }) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      className={cx('flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-mint', over ? 'border-mint-strong bg-mint-soft' : 'border-[#c3cdda] bg-white hover:border-mint-strong')}
    >
      <span className="text-sm font-medium text-navy">{label}</span>
      {hint && <span className="mt-1 text-xs text-muted">{hint}</span>}
      <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </label>
  );
}

export function KeyValue({ items }: { items: { k: string; v: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.k} className="min-w-0">
          <dt className="text-xs text-muted">{it.k}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{it.v || <span className="text-nodata">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export const TooltipProvider = RTooltip.Provider;

/**
 * Enlace para saltar al contenido. Con HashRouter un ancla «#contenido» se interpretaría como una
 * ruta, por lo que el enlace mueve el foco de forma programática.
 */
export function SkipLink({ target = 'contenido' }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      onClick={(e) => { e.preventDefault(); const el = document.getElementById(target); el?.focus(); el?.scrollIntoView(); }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
    >
      Saltar al contenido
    </a>
  );
}
