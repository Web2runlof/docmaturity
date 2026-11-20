/** Estado temporal de interfaz (no persistente salvo preferencias no sensibles). */
import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

const PREF_KEY = 'docmaturity.ui';
type Prefs = { sidebarCollapsed: boolean; activeAssessmentId: string | null };
const readPrefs = (): Prefs => {
  try {
    return { sidebarCollapsed: false, activeAssessmentId: null, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') };
  } catch {
    return { sidebarCollapsed: false, activeAssessmentId: null };
  }
};
const writePrefs = (p: Partial<Prefs>) => {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...readPrefs(), ...p }));
  } catch {
    /* preferencia no sensible; se ignora si el almacenamiento no está disponible */
  }
};

interface UIState {
  sidebarCollapsed: boolean;
  /** Última evaluación abierta: mantiene el bloque «Evaluación activa» en todas las rutas de la aplicación. */
  activeAssessmentId: string | null;
  setActiveAssessment: (id: string | null) => void;
  mobileNavOpen: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  setMobileNav: (open: boolean) => void;
  notify: (kind: ToastKind, title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useUI = create<UIState>((set, get) => ({
  sidebarCollapsed: readPrefs().sidebarCollapsed,
  activeAssessmentId: readPrefs().activeAssessmentId,
  setActiveAssessment: (id) => {
    if (get().activeAssessmentId === id) return;
    writePrefs({ activeAssessmentId: id });
    set({ activeAssessmentId: id });
  },
  mobileNavOpen: false,
  toasts: [],
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    writePrefs({ sidebarCollapsed: next });
    set({ sidebarCollapsed: next });
  },
  setMobileNav: (open) => set({ mobileNavOpen: open }),
  notify: (kind, title, message) => {
    const id = ++seq;
    set({ toasts: [...get().toasts, { id, kind, title, message }] });
    setTimeout(() => get().dismiss(id), kind === 'error' ? 9000 : 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const notify = (kind: ToastKind, title: string, message?: string) => useUI.getState().notify(kind, title, message);

/** Ejecuta una acción y devuelve true si terminó sin errores (útil para acciones sin valor de retorno). */
export async function attemptOk(fn: () => Promise<unknown>, success?: string): Promise<boolean> {
  try {
    await fn();
    if (success) notify('success', success);
    return true;
  } catch (e) {
    notify('error', 'No fue posible completar la acción', (e as Error).message);
    return false;
  }
}

/** Ejecuta una acción mostrando un mensaje de error comprensible si falla. */
export async function attempt<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const r = await fn();
    if (success) notify('success', success);
    return r;
  } catch (e) {
    notify('error', 'No fue posible completar la acción', (e as Error).message);
    return undefined;
  }
}
