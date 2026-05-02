import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '../../utils/cn';
import { api, formatTime, computeAdherence, type Medication, type DoseEvent } from '../../core/api';
import { useAppCtx } from '../../app/AppShell';
import { useToast } from '../../core/toast';
import { Card, EmptyState, DoseSheet, SkeletonBlock } from '../../designsystem';
import { Pill, CheckCircle2, Clock, Plus, RefreshCw, Calendar, ChevronRight } from 'lucide-react';
import { AdherenceChart } from './AdherenceChart';
import { AppointmentForm } from '../more/AppointmentForm';
import { AppointmentDetailModal } from './AppointmentDetailModal';

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function buildAdherenceChartData(events: DoseEvent[]) {
  const result: { day: string; taken: number; missed: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const dayEvents = events.filter(e => new Date(e.takenAt).toDateString() === dateStr);
    result.push({
      day: DAY_NAMES[d.getDay()],
      taken: dayEvents.filter(e => e.action === 'taken').length,
      missed: dayEvents.filter(e => e.action !== 'taken').length,
    });
  }
  return result;
}

function TodaySkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm"><SkeletonBlock className="h-5 w-24 mb-3" /><SkeletonBlock className="h-6 w-3/4 mb-2" /><SkeletonBlock className="h-4 w-1/2 mb-4" /><div className="flex gap-2"><SkeletonBlock className="h-10 flex-1 rounded-xl" /><SkeletonBlock className="h-10 flex-1 rounded-xl" /><SkeletonBlock className="h-10 flex-1 rounded-xl" /></div></div>
      <div className="bg-white rounded-2xl p-4 shadow-sm"><SkeletonBlock className="h-5 w-3/4 mb-3" /><SkeletonBlock className="h-4 w-1/2 mb-3" /><SkeletonBlock className="h-4 w-1/3" /></div>
      <div className="bg-white rounded-2xl p-4 shadow-sm"><SkeletonBlock className="h-5 w-2/3 mb-3" /><SkeletonBlock className="h-4 w-1/2" /></div>
    </div>
  );
}

export function TodayTab() {
  const { activeProfileId, activeProfile, setTab } = useAppCtx();
  const [doseSheetMed, setDoseSheetMed] = useState<{ med: Medication; nextTime: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [showAddApt, setShowAddApt] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const { toast } = useToast();

  const bundle = useLiveQuery(
    () => activeProfileId ? api.getTodayBundle(activeProfileId) : null,
    [activeProfileId]
  );

  if (!activeProfileId || !activeProfile) return <EmptyState icon={<Pill size={48} />} title="Welcome" message="Create a profile to get started." />;
  if (!bundle) return <TodaySkeleton />;

  const { nextDoses, recentUpdates, events, tasks, appointments } = bundle;
  const todayEvents = events.filter(e => new Date(e.takenAt).toDateString() === new Date().toDateString());
  const adherence7 = computeAdherence(events, 7);

  const handleDoseAction = async (action: 'taken' | 'snooze' | 'skip', medId: string, snoozeMin?: number, skipReason?: string) => {
    try {
      await api.createDoseEvent({ medicationId: medId, profileId: activeProfileId, scheduledTime: new Date().toISOString(), action, snoozeMinutes: snoozeMin, skipReason });
      const label = action === 'taken' ? 'Dose marked as taken' : action === 'snooze' ? `Snoozed ${snoozeMin ?? 10} min` : 'Dose skipped';
      toast(label, 'success');
    } catch (e: any) {
      toast(e?.message || 'Failed to log dose', 'error');
    }
    setDoseSheetMed(null);
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Quick actions */}
      <div className="flex gap-2">
        <button onClick={() => setTab('more')} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors" aria-label="Emergency Card">🚨 Emergency</button>
        <button onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 ml-auto" aria-label="Refresh"><RefreshCw size={18} className={refreshing ? 'animate-spin text-gray-500' : 'text-gray-500'} /></button>
      </div>

      {/* Adherence */}
      {events.length > 0 && (
        <>
          <Card className="flex items-center gap-4">
            <div className="flex-1"><p className="text-xs text-gray-500 uppercase font-medium">7-Day Adherence</p><p className="text-2xl font-bold text-[#1B6B4A]">{Math.round(adherence7.rate * 100)}%</p></div>
            <div className="text-right text-sm text-gray-500"><p>{adherence7.taken} taken</p><p>{adherence7.total} total</p></div>
          </Card>
          <AdherenceChart data={buildAdherenceChartData(events)} />
        </>
      )}

      {/* Next Dose */}
      {nextDoses.length > 0 ? (() => {
        const item = nextDoses[0];
        if (!item) return null;
        const { medication: med, nextOccurrence: next } = item;
        return (
          <Card className="bg-gradient-to-r from-[#1B6B4A] to-[#175f42] text-white border-0">
            <div className="flex items-start justify-between mb-3">
              <div><p className="text-[#c2e6cb] text-xs font-medium uppercase tracking-wide mb-1">Next Dose</p><p className="text-xl font-bold">{med.displayName}</p><p className="text-[#c2e6cb] text-sm">{med.strength}</p></div>
              <Pill size={28} className="text-[#c2e6cb]" />
            </div>
            <div className="flex items-center gap-2 text-[#c2e6cb] text-sm mb-4"><Clock size={14} />{next ? formatTime(next.toISOString()) : 'No upcoming'}</div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleDoseAction('taken', med.id)} className="py-2.5 bg-white/20 rounded-xl text-sm font-semibold hover:bg-white/30 flex items-center justify-center gap-1"><CheckCircle2 size={16} />Taken</button>
              <button onClick={() => setDoseSheetMed({ med, nextTime: next ? formatTime(next.toISOString()) : 'Now' })} className="py-2.5 bg-white/20 rounded-xl text-sm font-semibold hover:bg-white/30">Snooze</button>
              <button onClick={() => setDoseSheetMed({ med, nextTime: next ? formatTime(next.toISOString()) : 'Now' })} className="py-2.5 bg-white/20 rounded-xl text-sm font-semibold hover:bg-white/30">Skip</button>
            </div>
          </Card>
        );
      })() : (
        <Card className="border-dashed border-gray-200"><EmptyState icon={<Pill size={36} />} title="No medications" message="Add a medication to start reminders." cta="Add Medication" onCta={() => setTab('meds')} /></Card>
      )}

      {/* Today's History */}
      {todayEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Today's Doses</h3>
          <div className="space-y-2">{todayEvents.slice(0, 5).map(e => {
            const med = bundle.activeMeds.find(m => m.id === e.medicationId);
            return (
              <Card key={e.id} className="flex items-center gap-3 py-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', e.action === 'taken' ? 'bg-emerald-50' : e.action === 'snooze' ? 'bg-blue-50' : 'bg-amber-50')}>
                  {e.action === 'taken' ? <CheckCircle2 size={16} className="text-emerald-700" /> : <Clock size={16} className="text-blue-700" />}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{med?.displayName ?? 'Unknown'}</p><p className="text-xs text-gray-400">{formatTime(e.takenAt)} · {e.action}</p></div>
              </Card>
            );
          })}</div>
        </div>
      )}

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tasks</h3>
          <button onClick={() => setShowAddTask(true)} className="text-xs text-[#1B6B4A] font-medium flex items-center gap-0.5"><Plus size={14} />Add</button>
        </div>
        {showAddTask && (
          <Card className="flex gap-2 items-center animate-fade-in">
            <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title..." className="flex-1 px-3 py-2 rounded-xl border border-gray-200 outline-none text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter' && taskTitle.trim() && activeProfileId) { api.createTask(activeProfileId, taskTitle.trim()); setTaskTitle(''); setShowAddTask(false); } }} />
            <button onClick={() => { if (taskTitle.trim() && activeProfileId) { api.createTask(activeProfileId, taskTitle.trim()); setTaskTitle(''); setShowAddTask(false); }}} className="px-3 py-2 bg-[#1B6B4A] text-white rounded-xl text-sm font-medium">Add</button>
            <button onClick={() => { setShowAddTask(false); setTaskTitle(''); }} className="px-2 py-2 text-gray-400 text-lg">×</button>
          </Card>
        )}
        {tasks.length > 0 ? <div className="space-y-2">{tasks.map(t => (
          <Card key={t.id} className="flex items-center gap-3 py-3" onClick={() => activeProfileId && api.toggleTask(t.id)}>
            <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center', t.completed ? 'bg-emerald-50 border-emerald-300' : 'border-gray-300')}>{t.completed && <CheckCircle2 size={14} className="text-emerald-700" />}</div>
            <span className={cn('text-sm', t.completed ? 'line-through text-gray-400' : 'text-gray-700')}>{t.title}</span>
          </Card>
        ))}</div> : <Card className="text-center py-4"><p className="text-sm text-gray-400">No tasks</p></Card>}
      </div>

      {/* Appointments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Appointments</h3>
          <button onClick={() => setShowAddApt(true)} className="text-xs text-[#1B6B4A] font-medium flex items-center gap-0.5"><Plus size={14} />Add</button>
        </div>
        {appointments.length > 0 ? <div className="space-y-2">{appointments.slice(0, 3).map(a => (
          <Card key={a.id} className="flex items-center gap-3 py-3" onClick={() => setSelectedAptId(a.id)}>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Calendar size={18} className="text-blue-700" /></div>
            <div className="flex-1"><p className="text-sm font-medium text-gray-800">{a.purpose}</p><p className="text-xs text-gray-400">{a.date} · {a.time}</p></div>
            <ChevronRight size={16} className="text-gray-300" />
          </Card>
        ))}</div> : <Card className="text-center py-4"><p className="text-sm text-gray-400">No appointments</p></Card>}
      </div>

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Updates</h3>
          <div className="space-y-2">{recentUpdates.slice(0, 3).map(u => (
            <Card key={u.id} className="flex items-center gap-3 py-3" onClick={() => api.markUpdateRead(u.id)}>
              {!u.read && <div className="w-2 h-2 rounded-full bg-[#1B6B4A] shrink-0" />}
              <p className="text-sm text-gray-700 flex-1">{u.message}</p>
              <span className="text-xs text-gray-400">{formatTime(u.timestamp)}</span>
            </Card>
          ))}</div>
        </div>
      )}

      {/* Appointment Form */}
      {activeProfileId && <AppointmentForm open={showAddApt} onClose={() => setShowAddApt(false)} profileId={activeProfileId} onCreated={() => setShowAddApt(false)} />}

      {/* Dose Sheet */}
      {doseSheetMed && (
        <DoseSheet open={!!doseSheetMed} onClose={() => setDoseSheetMed(null)} medName={doseSheetMed.med.displayName} strength={doseSheetMed.med.strength} scheduledTime={doseSheetMed.nextTime}
          onAction={(action, snoozeMin, skipReason) => handleDoseAction(action, doseSheetMed.med.id, snoozeMin, skipReason)} />
      )}
      
      {/* Appointment Detail Modal */}
      <AppointmentDetailModal appointmentId={selectedAptId} onClose={() => setSelectedAptId(null)} />
    </div>
  );
}
