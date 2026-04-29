import { useState } from 'react';
import { useAppCtx } from '../../app/AppShell';
import { Modal } from '../../designsystem';
import { Loader2, Check, Download } from 'lucide-react';
import { db } from '../../core/db';

export function ExportScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeProfileId } = useAppCtx();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    if (!activeProfileId) return;
    setExporting(true);
    try {
      const [profiles, meds, schedules, events, records, cards, team, updates, tasks, appointments] = await Promise.all([
        db.profiles.toArray(),
        db.medications.toArray(),
        db.medSchedules.toArray(),
        db.doseEvents.toArray(),
        db.records.toArray(),
        db.emergencyCards.toArray(),
        db.careTeamMembers.toArray(),
        db.updates.toArray(),
        db.tasks.toArray(),
        db.appointments.toArray(),
      ]);
      const data = {
        exportedAt: new Date().toISOString(),
        profiles, medications: meds, schedules, doseEvents: events, records,
        emergencyCards: cards, careTeam: team, updates, tasks, appointments,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carebinder-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {}
    setExporting(false);
  };

  return (
    <Modal open={open} onClose={() => { setDone(false); onClose(); }} title="Export Data">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-700">Download all your CareBinder data as a JSON file. This includes profiles, medications, dose events, records metadata, emergency cards, care team, and updates.</p>
          <p className="text-xs text-gray-400 mt-2">Note: Document files (PDFs/images) are not included in the export. Only metadata is exported.</p>
        </div>
        {done ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3"><Check size={24} className="text-emerald-700" /></div>
            <p className="text-sm font-medium text-gray-800">Export complete!</p>
            <p className="text-xs text-gray-500 mt-1">Your file has been downloaded.</p>
          </div>
        ) : (
          <button onClick={handleExport} disabled={exporting || !activeProfileId} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {exporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={18} />}
            {exporting ? 'Exporting...' : 'Export as JSON'}
          </button>
        )}
      </div>
    </Modal>
  );
}
