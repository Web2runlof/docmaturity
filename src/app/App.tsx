import { Component, Suspense, lazy, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button, Toaster, TooltipProvider } from '@/components/ui';
import { UpdatePrompt } from './UpdatePrompt';

const Landing = lazy(() => import('@/features/landing/LandingPage'));
const HowItWorks = lazy(() => import('@/features/landing/InfoPages').then((m) => ({ default: m.HowItWorksPage })));
const MethodologyPage = lazy(() => import('@/features/landing/InfoPages').then((m) => ({ default: m.MethodologyPage })));
const ReferencesPage = lazy(() => import('@/features/landing/InfoPages').then((m) => ({ default: m.ReferencesPage })));
const PrivacyPage = lazy(() => import('@/features/landing/InfoPages').then((m) => ({ default: m.PrivacyPage })));
const RespondentHome = lazy(() => import('@/features/respondent/RespondentPages').then((m) => ({ default: m.RespondentHome })));
const RespondentSessionPage = lazy(() => import('@/features/respondent/RespondentPages').then((m) => ({ default: m.RespondentSessionPage })));
const HomePage = lazy(() => import('@/features/home/HomePage'));
const OrganizationsPage = lazy(() => import('@/features/organizations/OrganizationsPage'));
const OrganizationForm = lazy(() => import('@/features/organizations/OrganizationForm'));
const OrganizationDetail = lazy(() => import('@/features/organizations/OrganizationDetail'));
const AssessmentsPage = lazy(() => import('@/features/assessments/AssessmentsPage'));
const NewAssessment = lazy(() => import('@/features/assessments/NewAssessment'));
const AssessmentOverview = lazy(() => import('@/features/assessments/AssessmentOverview'));
const ScopePage = lazy(() => import('@/features/assessments/ScopePage'));
const InterviewsPage = lazy(() => import('@/features/interviews/InterviewsPage'));
const DirectedInterview = lazy(() => import('@/features/interviews/DirectedInterview'));
const EvidencePage = lazy(() => import('@/features/evidence/EvidencePage'));
const ValidationDesk = lazy(() => import('@/features/consolidation/ValidationDesk'));
const ResultsDashboard = lazy(() => import('@/features/analytics/ResultsDashboard'));
const GapsRisksPage = lazy(() => import('@/features/roadmap/GapsRisksPage'));
const RoadmapPage = lazy(() => import('@/features/roadmap/RoadmapPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const LibraryPage = lazy(() => import('@/features/methodology/LibraryPage'));
const QuestionBankPage = lazy(() => import('@/features/methodology/QuestionBankPage'));
const AcademicLab = lazy(() => import('@/features/academic/AcademicLab'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted" role="status">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Cargando…
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <p className="eyebrow">Error de la aplicación</p>
        <h1 className="mt-2 text-2xl font-semibold">No fue posible mostrar esta pantalla</h1>
        <p className="mt-3 text-sm text-muted">Sus datos locales no se han modificado. Puede volver al inicio o recargar la aplicación. Si el problema persiste, exporte una copia de seguridad desde Configuración.</p>
        <p className="mt-3 rounded-md border border-line bg-canvas px-3 py-2 font-mono text-xs text-muted">{this.state.error.message.slice(0, 300)}</p>
        <div className="mt-6 flex gap-2">
          <Button variant="primary" onClick={() => { this.setState({ error: null }); window.location.hash = '#/app'; }}>Ir al inicio</Button>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      </div>
    );
  }
}

export function App() {
  return (
    <TooltipProvider>
      <HashRouter>
        <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<Landing />} />
                <Route path="como-funciona" element={<HowItWorks />} />
                <Route path="metodologia" element={<MethodologyPage />} />
                <Route path="referentes" element={<ReferencesPage />} />
                <Route path="privacidad" element={<PrivacyPage />} />
                <Route path="responder" element={<RespondentHome />} />
              </Route>
              <Route path="responder/:sid" element={<RespondentSessionPage />} />
              <Route path="app/evaluaciones/:aid/entrevistas/:iid" element={<DirectedInterview />} />
              <Route path="app" element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="organizaciones" element={<OrganizationsPage />} />
                <Route path="organizaciones/nueva" element={<OrganizationForm />} />
                <Route path="organizaciones/:oid" element={<OrganizationDetail />} />
                <Route path="organizaciones/:oid/editar" element={<OrganizationForm />} />
                <Route path="evaluaciones" element={<AssessmentsPage />} />
                <Route path="evaluaciones/nueva" element={<NewAssessment />} />
                <Route path="evaluaciones/:aid" element={<AssessmentOverview />} />
                <Route path="evaluaciones/:aid/alcance" element={<ScopePage />} />
                <Route path="evaluaciones/:aid/entrevistas" element={<InterviewsPage />} />
                <Route path="evaluaciones/:aid/evidencias" element={<EvidencePage />} />
                <Route path="evaluaciones/:aid/validacion" element={<ValidationDesk />} />
                <Route path="evaluaciones/:aid/resultados" element={<ResultsDashboard />} />
                <Route path="evaluaciones/:aid/brechas" element={<GapsRisksPage />} />
                <Route path="evaluaciones/:aid/hoja-de-ruta" element={<RoadmapPage />} />
                <Route path="evaluaciones/:aid/informes" element={<ReportsPage />} />
                <Route path="cuestionarios" element={<QuestionBankPage />} />
                <Route path="biblioteca" element={<LibraryPage />} />
                <Route path="academico" element={<AcademicLab />} />
                <Route path="configuracion" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </HashRouter>
      <Toaster />
      <UpdatePrompt />
    </TooltipProvider>
  );
}
