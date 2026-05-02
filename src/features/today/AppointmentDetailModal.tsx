import { useState, useEffect } from 'react';
import { Modal } from '../../designsystem';
import { api } from '../../core/api';
import { useToast } from '../../core/toast';
import type { AppointmentRow } from '../../core/db';
import { Calendar, Plus, Trash2, Loader2, Save } from 'lucide-react';

export function AppointmentDetailModal({
  appointmentId,
  onClose
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const [apt, setApt] = useState<AppointmentRow | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (appointmentId) {
      setLoadError('');
      api.getAppointment(appointmentId).then(data => {
        setApt(data);
        setQuestions(data.questions ?? []);
        setNotes(data.notes ?? '');
      }).catch(() => setLoadError('Could not load appointment details'));
    } else {
      setApt(null);
      setLoadError('');
    }
  }, [appointmentId]);

  if (!appointmentId) return null;

  const handleSave = async () => {
    if (!apt) return;
    setSaving(true);
    try {
      await api.patchAppointment(apt.id, { questions, notes });
      toast('Appointment updated', 'success');
      onClose();
    } catch (e: any) {
      toast(e?.message || 'Failed to save appointment', 'error');
    }
    setSaving(false);
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  return (
    <Modal open={!!appointmentId} onClose={onClose} title="Appointment Detail">
      {loadError ? (
        <div className="py-8 text-center text-sm text-red-600">{loadError}</div>
      ) : !apt ? (
        <div className="py-8 text-center">
          <Loader2 className="animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar size={24} className="text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{apt.purpose}</h3>
              <p className="text-sm text-gray-500">{apt.date} at {apt.time}</p>
              {apt.provider && <p className="text-sm text-gray-500">Dr. {apt.provider}</p>}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Pre-visit Questions</h4>
            {questions.length > 0 ? (
              <ul className="space-y-2 mb-3">
                {questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 bg-gray-50 p-2.5 rounded-lg text-sm text-gray-700">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span className="flex-1">{q}</span>
                    <button onClick={() => removeQuestion(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 mb-3 italic">No questions added yet.</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="What should I ask?"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1B6B4A]"
                onKeyDown={e => { if (e.key === 'Enter') addQuestion(); }}
              />
              <button onClick={addQuestion} className="px-3 py-2 bg-gray-100 text-[#1B6B4A] rounded-lg font-medium hover:bg-gray-200">
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Post-visit Notes</h4>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Jot down notes from the visit..."
              className="w-full h-24 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1B6B4A] resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      )}
    </Modal>
  );
}
