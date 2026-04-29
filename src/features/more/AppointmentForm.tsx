import { useState } from 'react';
import { api } from '../../core/api';
import { Modal } from '../../designsystem';
import { Loader2 } from 'lucide-react';

export function AppointmentForm({ open, onClose, profileId, onCreated }: {
  open: boolean; onClose: () => void; profileId: string; onCreated: () => void;
}) {
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [provider, setProvider] = useState('');

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!purpose.trim()) return;
    setSaving(true);
    await api.createAppointment(profileId, { date, time, provider: provider || undefined, purpose: purpose.trim() });
    setSaving(false);
    setPurpose(''); setProvider(''); setNotes('');
    onCreated();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Appointment">
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
          <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g., Annual checkup" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <input type="text" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g., Dr. Smith" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any preparation notes..." rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none resize-none" /></div>
        <button onClick={handleSave} disabled={saving || !purpose.trim()} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Save Appointment'}
        </button>
      </div>
    </Modal>
  );
}
