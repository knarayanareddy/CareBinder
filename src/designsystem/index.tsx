import { Component, type ReactNode, useState } from 'react';
import { cn } from '../utils/cn';
import {
  Shield, Eye, User, UserCog, CheckCircle2, PauseCircle,
  AlertTriangle, FileText, Loader2, XCircle, Clock, RefreshCw,
  X,
} from 'lucide-react';

type MedStatus = 'active' | 'paused' | 'discontinued';
type RecordProcessingStatus = 'none' | 'uploading' | 'extracting' | 'ready' | 'failed';
type Role = 'owner' | 'manager' | 'contributor' | 'viewer';

// ═══════════════════════════════════════════════
// STATUS PALETTE
// ═══════════════════════════════════════════════

const TONE: Record<string, { bg: string; text: string; border: string }> = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  error:   { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
  info:    { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  neutral: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
};

// ═══════════════════════════════════════════════
// SKELETON SHIMMER
// ═══════════════════════════════════════════════

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton-block', className)}>&nbsp;</div>;
}

export function MedCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <SkeletonBlock className="h-5 w-3/4 mb-3" />
      <SkeletonBlock className="h-4 w-1/2 mb-4" />
      <div className="flex gap-2"><SkeletonBlock className="h-6 w-20 rounded-full" /><SkeletonBlock className="h-6 w-16 rounded-full" /></div>
    </div>
  );
}

export function RecordCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <SkeletonBlock className="h-5 w-2/3 mb-2" />
      <SkeletonBlock className="h-4 w-4/5 mb-3" />
      <div className="flex gap-2"><SkeletonBlock className="h-6 w-16 rounded-full" /><SkeletonBlock className="h-6 w-20 rounded-full" /></div>
    </div>
  );
}

export function MemberSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse flex items-center gap-3">
      <SkeletonBlock className="w-10 h-10 rounded-full" />
      <div className="flex-1"><SkeletonBlock className="h-4 w-32 mb-2" /><SkeletonBlock className="h-3 w-20" /></div>
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <div className="p-4 space-y-4">
      <SkeletonBlock className="h-10 w-full rounded-xl" />
      <div className="bg-white rounded-2xl p-5 shadow-sm"><SkeletonBlock className="h-4 w-24 mb-3" /><SkeletonBlock className="h-6 w-3/4 mb-2" /><SkeletonBlock className="h-4 w-1/2 mb-4" /><div className="flex gap-2"><SkeletonBlock className="h-10 flex-1 rounded-xl" /><SkeletonBlock className="h-10 flex-1 rounded-xl" /><SkeletonBlock className="h-10 flex-1 rounded-xl" /></div></div>
      <MedCardSkeleton />
    </div>
  );
}

// ═══════════════════════════════════════════════
// CHIPS
// ═══════════════════════════════════════════════

const roleMap: Record<Role, { label: string; Icon: typeof Shield; tone: string }> = {
  owner:       { label:'Owner',       Icon: Shield, tone:'info' },
  manager:     { label:'Manager',     Icon: UserCog, tone:'info' },
  contributor: { label:'Contributor', Icon: User, tone:'neutral' },
  viewer:      { label:'Viewer',      Icon: Eye, tone:'neutral' },
};

export function RoleChip({ role }: { role: Role }) {
  const { label, Icon, tone } = roleMap[role];
  const t = TONE[tone];
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', t.bg, t.text, t.border)} aria-label={`Role: ${label}`}><Icon size={12} />{label}</span>;
}

const medMap: Record<MedStatus, { label: string; Icon: typeof CheckCircle2; tone: string }> = {
  active:       { label:'Active',       Icon: CheckCircle2, tone:'success' },
  paused:       { label:'Paused',       Icon: PauseCircle, tone:'warning' },
  discontinued: { label:'Discontinued', Icon: AlertTriangle, tone:'error' },
};

export function MedStatusChip({ status }: { status: MedStatus }) {
  const { label, Icon, tone } = medMap[status];
  const t = TONE[tone];
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', t.bg, t.text, t.border)} aria-label={`Status: ${label}`}><Icon size={12} />{label}</span>;
}

const recMap: Record<RecordProcessingStatus, { label: string; Icon: typeof FileText; tone: string; spin?: boolean }> = {
  none:       { label:'Queued',      Icon: FileText, tone:'neutral' },
  uploading:  { label:'Uploading',   Icon: Loader2, tone:'info', spin:true },
  extracting: { label:'Extracting',  Icon: Loader2, tone:'info', spin:true },
  ready:      { label:'Ready',       Icon: CheckCircle2, tone:'success' },
  failed:     { label:'Failed',      Icon: XCircle, tone:'error' },
};

export function RecordStatusChip({ status }: { status: RecordProcessingStatus }) {
  const { label, Icon, tone, spin } = recMap[status];
  const t = TONE[tone];
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', t.bg, t.text, t.border)} aria-label={`Record: ${label}`}><Icon size={12} className={spin ? 'animate-spin' : ''} />{label}</span>;
}

// ═══════════════════════════════════════════════
// CARDS / PANELS
// ═══════════════════════════════════════════════

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('bg-white rounded-2xl p-4 shadow-sm border border-gray-100', onClick && 'cursor-pointer hover:shadow-md active:shadow-sm transition-shadow', className)}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, message, cta, onCta }: { icon?: ReactNode; title: string; message: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{message}</p>
      {cta && onCta && <button onClick={onCta} className="px-6 py-2.5 bg-[#1B6B4A] text-white rounded-xl font-medium hover:bg-[#175f42] transition-colors">{cta}</button>}
    </div>
  );
}

export function ErrorPanel({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4"><XCircle size={24} className="text-red-700" /></div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{message}</p>
      {onRetry && <button onClick={onRetry} className="px-6 py-2.5 bg-[#1B6B4A] text-white rounded-xl font-medium hover:bg-[#175f42] transition-colors flex items-center gap-2"><RefreshCw size={16} />Retry</button>}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm">
      <Clock size={16} className="text-amber-700 shrink-0" />
      <span className="text-amber-800 font-medium">Offline — showing cached data</span>
    </div>
  );
}

export function ProfileChip({ name, color, active, onClick }: { name: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap', active ? 'bg-[#1B6B4A] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')} aria-label={`Switch to ${name}`} aria-pressed={active}>
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>{name[0]?.toUpperCase()}</span>
      <span>{name}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════
// MODAL / BOTTOM SHEET
// ═══════════════════════════════════════════════

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" />
      <div className={cn('relative bg-white w-full rounded-t-3xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up', wide ? 'max-w-2xl' : 'max-w-lg')} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100" aria-label="Close"><X size={22} className="text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// DOSE ACTION SHEET
// ═══════════════════════════════════════════════

export function DoseSheet({ open, onClose, medName, strength, scheduledTime, onAction }: {
  open: boolean; onClose: () => void; medName: string; strength: string; scheduledTime: string;
  onAction: (action: 'taken' | 'snooze' | 'skip', snoozeMin?: number, skipReason?: string) => void;
}) {
  const [step, setStep] = useState<'main' | 'snooze' | 'skip'>('main');
  const [snoozeMin, setSnoozeMin] = useState(10);
  const [skipReason, setSkipReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handle = (action: 'taken' | 'snooze' | 'skip') => {
    setSubmitting(true);
    setTimeout(() => { onAction(action, action === 'snooze' ? snoozeMin : undefined, action === 'skip' ? skipReason : undefined); setSubmitting(false); setStep('main'); onClose(); }, 300);
  };

  return (
    <Modal open={open} onClose={() => { setStep('main'); onClose(); }} title="Dose Reminder">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e6f4ea] flex items-center justify-center text-lg">💊</div>
          <div><p className="font-semibold text-gray-900">{medName}</p><p className="text-sm text-gray-500">{strength}</p></div>
          <div className="ml-auto flex items-center gap-1 text-sm text-gray-500"><Clock size={14} />{scheduledTime}</div>
        </div>

        {step === 'main' && (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handle('taken')} disabled={submitting} className="flex flex-col items-center gap-2 py-4 bg-emerald-50 rounded-xl text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50" aria-label="Mark taken">
              {submitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}<span className="text-sm">Taken</span>
            </button>
            <button onClick={() => setStep('snooze')} className="flex flex-col items-center gap-2 py-4 bg-blue-50 rounded-xl text-blue-800 font-semibold hover:bg-blue-100 transition-colors" aria-label="Snooze">
              <Clock size={24} /><span className="text-sm">Snooze</span>
            </button>
            <button onClick={() => setStep('skip')} className="flex flex-col items-center gap-2 py-4 bg-amber-50 rounded-xl text-amber-800 font-semibold hover:bg-amber-100 transition-colors" aria-label="Skip dose">
              <AlertTriangle size={24} /><span className="text-sm">Skip</span>
            </button>
          </div>
        )}

        {step === 'snooze' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Snooze for:</p>
            <div className="flex gap-2 flex-wrap">{[5, 10, 15, 30, 60].map(m => (
              <button key={m} onClick={() => setSnoozeMin(m)} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-colors', snoozeMin === m ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>{m} min</button>
            ))}</div>
            <button onClick={() => handle('snooze')} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold">Snooze {snoozeMin} min</button>
          </div>
        )}

        {step === 'skip' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Reason (optional):</p>
            <div className="flex gap-2 flex-wrap">{['Side effects', 'Forgot', 'Not needed', 'Other'].map(r => (
              <button key={r} onClick={() => setSkipReason(r)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-colors', skipReason === r ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>{r}</button>
            ))}</div>
            <button onClick={() => handle('skip')} className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold">Skip Dose</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════

interface EBState { hasError: boolean; error?: Error }
export class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">An unexpected error occurred. Your data is safe.</p>
        <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} className="px-6 py-2.5 bg-[#1B6B4A] text-white rounded-xl font-medium hover:bg-[#175f42] transition-colors">Reload App</button>
      </div>
    );
    return this.props.children;
  }
}

// Re-export types needed by features
export type { MedStatus, RecordProcessingStatus, Role };
