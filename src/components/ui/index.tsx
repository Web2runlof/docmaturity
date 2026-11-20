/** Componentes de interfaz accesibles del sistema de diseño DOCMATURITY. */
import * as RDialog from '@radix-ui/react-dialog';
import * as RTooltip from '@radix-ui/react-tooltip';
import * as RTabs from '@radix-ui/react-tabs';
import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Info, Loader2, X, XCircle } from 'lucide-react';
import { cx } from '@/utils/core';
import { LEVEL_NAMES } from '@/data/bank';
import { levelIndex } from '@/engine/scoring';
import { useUI } from '@/app/store';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-dark border border-navy',
  secondary: 'bg-white text-navy border border-line hover:border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent text-navy border border-transparent hover:bg-slate-100',
  danger: 'bg-white text-lv0 border border-red-200 hover:bg-red-50',
  subtle: 'bg-teal-50 text-teal border border-teal-100 hover:bg-teal-100/70',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  busy?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', size = 'md', icon, busy, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || busy}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
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
        {required && <span className="text-lv0" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs text-lv0">{error}</p>}
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

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[1.6rem] font-semibold md:text-[1.85rem]">{title}</h1>
        {description && <div className="mt-2 text-[0.9375rem] text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, description, actions, children, className, id }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx('panel min-w-0', className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-[1.02rem] font-semibold">{title}</h2>}
            {description && <div className="mt-0.5 text-[0.8125rem] text-muted">{description}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, description, actions }: { icon?: ReactNode; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 text-petrol">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <div className="mt-2 max-w-md text-sm text-muted">{description}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

const LEVEL_BG = ['bg-lv0', 'bg-lv1', 'bg-lv2', 'bg-lv3', 'bg-lv4', 'bg-lv5'];
const LEVEL_TEXT = ['text-lv0', 'text-lv1', 'text-lv2', 'text-lv3', 'text-lv4', 'text-lv5'];

/** Etiqueta de nivel: forma + número + nombre (no depende solo del color). */
export function LevelTag({ score, size = 'md', showName = true }: { score: number | null | undefined; size?: 'sm' | 'md'; showName?: boolean }) {
  if (score === null || score === undefined) {
    return (
      <span className={cx('inline-flex items-center gap-1.5 text-nodata', size === 'sm' ? 'text-xs' : 'text-sm')}>
        <CircleDashed className="size-3.5" aria-hidden />
        Sin datos
      </span>
    );
  }
  const li = levelIndex(score);
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-medium num', LEVEL_TEXT[li], size === 'sm' ? 'text-xs' : 'text-sm')}>
      <span className={cx('inline-block rounded-[2px]', LEVEL_BG[li], size === 'sm' ? 'size-2' : 'size-2.5')} aria-hidden />
      {score.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
      {showName && <span className="font-normal text-muted">· {LEVEL_NAMES[li]}</span>}
    </span>
  );
}

export function Tag({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'gold' | 'danger' | 'warning' | 'info'; icon?: ReactNode }) {
  const tones = {
    neutral: 'text-muted border-line bg-white',
    teal: 'text-teal border-teal-200 bg-teal-50/60',
    gold: 'text-[#8a6a35] border-[#ead9bd] bg-[#fbf6ee]',
    danger: 'text-lv0 border-red-200 bg-red-50/60',
    warning: 'text-[#8a5a12] border-amber-200 bg-amber-50/60',
    info: 'text-lv3 border-blue-200 bg-blue-50/60',
  } as const;
  return <span className={cx('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[0.6875rem] font-medium', tones[tone])}>{icon}{children}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'warning' | 'danger' }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.72rem] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={cx('mt-1 font-display text-2xl font-semibold num', tone === 'danger' ? 'text-lv0' : tone === 'warning' ? 'text-lv2' : 'text-navy')}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Progress({ value, label, tone = 'teal' }: { value: number | null; label: string; tone?: 'teal' | 'navy' | 'gold' }) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const colors = { teal: 'bg-petrol', navy: 'bg-navy', gold: 'bg-gold' };
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(v)} aria-valuetext={value === null ? 'Sin datos' : `${Math.round(v)} %`} className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cx('h-full transition-[width] duration-200', colors[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Dialog({ open, onOpenChange, title, description, children, footer, wide }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-navy-dark/40" />
        <RDialog.Content className={cx('fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-white shadow-xl', wide ? 'max-w-4xl' : 'max-w-lg')}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <RDialog.Title className="font-display text-lg font-semibold text-navy">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-1 text-sm text-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
            </div>
            <RDialog.Close className="rounded p-1 text-muted hover:bg-slate-100" aria-label="Cerrar">
              <X className="size-4" />
            </RDialog.Close>
          </div>
          {children && <div className="px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-slate-50/60 px-5 py-3">{footer}</div>}
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
        <RTooltip.Content sideOffset={6} className="z-50 max-w-xs rounded-md bg-navy-dark px-2.5 py-1.5 text-xs text-white shadow-lg">
          {content}
          <RTooltip.Arrow className="fill-navy-dark" />
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
          <RTabs.Trigger key={t.value} value={t.value} className="-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-navy data-[state=active]:border-petrol data-[state=active]:text-navy">
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
    info: { cls: 'border-blue-200 bg-blue-50/50', icon: <Info className="size-4 text-lv3" aria-hidden /> },
    warning: { cls: 'border-amber-200 bg-amber-50/60', icon: <AlertTriangle className="size-4 text-lv2" aria-hidden /> },
    danger: { cls: 'border-red-200 bg-red-50/60', icon: <XCircle className="size-4 text-lv0" aria-hidden /> },
    success: { cls: 'border-teal-200 bg-teal-50/60', icon: <CheckCircle2 className="size-4 text-petrol" aria-hidden /> },
  }[tone];
  return (
    <div className={cx('flex gap-3 rounded-md border px-4 py-3 text-sm', map.cls)} role={tone === 'danger' ? 'alert' : undefined}>
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
        <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex gap-3 rounded-md border border-line bg-white px-4 py-3 shadow-lg">
          {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-petrol" /> : t.kind === 'error' ? <XCircle className="mt-0.5 size-4 shrink-0 text-lv0" /> : t.kind === 'warning' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-lv2" /> : <Info className="mt-0.5 size-4 shrink-0 text-lv3" />}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-ink">{t.title}</p>
            {t.message && <p className="mt-0.5 text-muted">{t.message}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Cerrar notificación"><X className="size-4" /></button>
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
      className={cx('flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center transition-colors', over ? 'border-petrol bg-teal-50/50' : 'border-slate-300 bg-white hover:border-petrol')}
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
