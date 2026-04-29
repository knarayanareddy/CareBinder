import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '../../utils/cn';
import { db } from '../../core/db';
import { api, computeAdherence, formatDate, formatTime } from '../../core/api';
import { useAppCtx } from '../../app/AppShell';
import { Card, EmptyState, MedStatusChip, Modal } from '../../designsystem';
import { Pill, Plus, Clock, ChevronRight, Trash2, PauseCircle, PlayCircle, Loader2, AlertCircle } from 'lucide-react';

export function MedsTab() {
  const { activeProfileId } = useAppCtx();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  const meds = useLiveQuery(() => activeProfileId ? api.listMedications(activeProfileId) : Promise.resolve([]), [activeProfileId]) ?? [];
  const allSchedules = useLiveQuery(() => db.medSchedules.toArray(), []) ?? [];
  const allEvents = useLiveQuery(() => activeProfileId ? api.listDoseEvents(activeProfileId) : Promise.resolve([]), [activeProfileId]) ?? [];
  const selectedMed = selectedMedId ? meds.find(m => m.id === selectedMedId) : null;
  const selectedSchedule = selectedMedId ? allSchedules.find(s => s.medicationId === selectedMedId) : undefined;

  if (!activeProfileId) return <EmptyState icon={<Pill size={48} />} title="No profile" message="Select a profile first." />;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Medications</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-2 bg-[#1B6B4A] text-white rounded-xl text-sm font-medium hover:bg-[#175f42] transition-colors"><Plus size={16} />Add</button>
      </div>

      {meds.length > 0 ? (
        <div className="space-y-3">{meds.map(med => {
          const sched = allSchedules.find(s => s.medicationId === med.id);
          return (
            <Card key={med.id} onClick={() => setSelectedMedId(med.id)} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e6f4ea] flex items-center justify-center text-lg shrink-0">💊</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><p className="font-semibold text-gray-800 truncate">{med.displayName}</p><MedStatusChip status={med.status} /></div>
                <p className="text-sm text-gray-500">{med.strength}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400"><Clock size={12} />{sched?.times.join(', ') ?? 'No schedule'}</div>
              </div>
              <ChevronRight size={18} className="text-gray-300 shrink-0 mt-1" />
            </Card>
          );
        })}</div>
      ) : <EmptyState icon={<Pill size={48} />} title="No medications" message="Add a medication to start reminders." cta="Add Medication" onCta={() => setShowAdd(true)} />}

      <AddMedModal open={showAdd} onClose={() => setShowAdd(false)} profileId={activeProfileId} />
      <MedDetailModal med={selectedMed ?? null} schedule={selectedSchedule} events={allEvents.filter(e => e.medicationId === selectedMedId)} onClose={() => setSelectedMedId(null)} />
    </div>
  );
}

function AddMedModal({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const [mode, setMode] = useState<'chooser' | 'form'>('chooser');
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [instructions, setInstructions] = useState('');
  const [asNeeded, setAsNeeded] = useState(false);
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.createMedication(profileId, { displayName: name.trim(), strength: strength.trim(), instructions: instructions.trim() || 'Take as directed', asNeeded, times: asNeeded ? [] : times, days: [0,1,2,3,4,5,6] });
      setName(''); setStrength(''); setInstructions(''); setAsNeeded(false); setTimes(['08:00']); setMode('chooser'); onClose();
    } catch (e: any) { setError(e?.message || 'Failed to add medication'); }
    setSaving(false);
  };

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setName('Lisinopril');
      setStrength('10mg');
      setInstructions('Take one tablet daily');
      setTimes(['08:00']);
      setScanning(false);
      setMode('form');
    }, 1500);
  };

  return (
    <Modal open={open} onClose={() => { setMode('chooser'); onClose(); }} title="Add Medication">
      {mode === 'chooser' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">How would you like to add this medication?</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleSimulateScan} disabled={scanning} className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-[#1B6B4A] transition-colors disabled:opacity-50">
              {scanning ? <Loader2 size={32} className="animate-spin text-[#1B6B4A]" /> : <span className="text-3xl">📷</span>}
              <span className="text-sm font-medium text-gray-800">{scanning ? 'Scanning...' : 'Scan Label'}</span>
            </button>
            <button onClick={() => setMode('form')} className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-[#1B6B4A] transition-colors">
              <span className="text-3xl">✍️</span>
              <span className="text-sm font-medium text-gray-800">Enter Manually</span>
            </button>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2"><AlertCircle size={16} className="text-red-600" /><p className="text-sm text-red-700">{error}</p></div>}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Amoxicillin" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Strength</label><input type="text" value={strength} onChange={e => setStrength(e.target.value)} placeholder="e.g., 500mg" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label><input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g., Take with food" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
        <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-700">As needed (PRN)</span>
          <button onClick={() => setAsNeeded(!asNeeded)} className={cn('w-12 h-7 rounded-full relative transition-colors', asNeeded ? 'bg-[#1B6B4A]' : 'bg-gray-300')} role="switch" aria-checked={asNeeded}><span className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform', asNeeded ? 'translate-x-5' : 'translate-x-0.5')} /></button>
        </div>
        {!asNeeded && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Times</label>
            <div className="flex flex-wrap gap-2 mb-2">{times.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#e6f4ea] text-[#1B6B4A] rounded-full text-sm font-medium">{t}{times.length > 1 && <button onClick={() => setTimes(times.filter((_, j) => j !== i))} className="text-[#1B6B4A]/50 hover:text-[#1B6B4A]">×</button>}</span>
            ))}</div>
            <input type="time" onChange={e => { if (e.target.value && !times.includes(e.target.value)) setTimes([...times, e.target.value]); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
          </div>
        )}
        <button onClick={handleSave} disabled={saving || !name.trim()} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 transition-colors">{saving ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Add Medication'}</button>
      </div>
      )}
    </Modal>
  );
}

function MedDetailModal({ med, schedule, events, onClose }: {
  med: { id: string; displayName: string; strength: string; instructions: string; status: 'active' | 'paused' | 'discontinued'; asNeeded: boolean } | null;
  schedule: { times: string[]; days: number[] } | undefined;
  events: { action: string; takenAt: string }[];
  onClose: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  if (!med) return null;
  const adherence = events.length > 0 ? computeAdherence(events as any[], 30) : null;

  return (
    <Modal open={!!med} onClose={onClose} title="Medication Detail">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3"><div className="text-2xl">💊</div><div><h3 className="font-bold text-gray-900">{med.displayName}</h3><p className="text-sm text-gray-500">{med.strength}</p><MedStatusChip status={med.status} /></div></div>
        <div className="space-y-2">
          <Field label="Instructions" value={med.instructions || 'None'} />
          <Field label="Schedule" value={med.asNeeded ? 'As needed (PRN)' : schedule?.times.join(', ') ?? 'No schedule'} />
        </div>
        {adherence && <Card><p className="text-xs text-gray-500 uppercase font-medium mb-1">30-Day Adherence</p><p className="text-2xl font-bold text-[#1B6B4A]">{Math.round(adherence.rate * 100)}%</p><p className="text-xs text-gray-400">{adherence.taken} of {adherence.total} doses</p></Card>}
        {events.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Doses</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {events.slice(0, 10).map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{formatDate(e.takenAt)} {formatTime(e.takenAt)}</span>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', e.action === 'taken' ? 'bg-emerald-50 text-emerald-700' : e.action === 'snooze' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}>{e.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={async () => { await api.patchMedication(med.id, { status: med.status === 'active' ? 'paused' : 'active' }); onClose(); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700">{med.status === 'active' ? <><PauseCircle size={16} />Pause</> : <><PlayCircle size={16} />Resume</>}</button>
          <button onClick={() => setShowDelete(true)} className="py-2.5 px-4 bg-red-50 rounded-xl text-sm font-medium text-red-700"><Trash2 size={16} /></button>
        </div>
        {showDelete && <div className="bg-red-50 rounded-xl p-4 animate-fade-in"><p className="font-medium text-red-700 mb-2">Delete this medication?</p><div className="flex gap-2"><button onClick={() => setShowDelete(false)} className="flex-1 py-2 bg-white rounded-xl text-sm font-medium">Cancel</button><button onClick={async () => { await api.deleteMedication(med.id); onClose(); }} className="flex-1 py-2 bg-red-700 text-white rounded-xl text-sm font-medium">Delete</button></div></div>}
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-gray-400 uppercase">{label}</p><p className="text-sm text-gray-700 mt-0.5">{value}</p></div>; }
