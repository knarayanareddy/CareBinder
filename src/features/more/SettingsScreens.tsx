import { useState } from 'react';
import { Modal } from '../../designsystem';
import { Bell, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../utils/cn';

export function NotificationPrefs({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [doseReminders, setDoseReminders] = useState(true);
  const [teamUpdates, setTeamUpdates] = useState(true);
  const [recordUpdates, setRecordUpdates] = useState(true);
  const [sound, setSound] = useState(true);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        alert('Notifications permission denied. You can enable them in your browser settings.');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Configure which notifications you receive for this profile.</p>
        <div className="space-y-3">
          <ToggleRow icon={<Bell size={18} />} label="Dose Reminders" desc="Get reminded when medications are due" checked={doseReminders} onToggle={() => setDoseReminders(!doseReminders)} />
          <ToggleRow icon={<Bell size={18} />} label="Care Team Updates" desc="Invites, permission changes" checked={teamUpdates} onToggle={() => setTeamUpdates(!teamUpdates)} />
          <ToggleRow icon={<Bell size={18} />} label="Record Processing" desc="Extraction complete, upload status" checked={recordUpdates} onToggle={() => setRecordUpdates(!recordUpdates)} />
          <ToggleRow icon={sound ? <Volume2 size={18} /> : <VolumeX size={18} />} label="Sound" desc="Play sound with notifications" checked={sound} onToggle={() => setSound(!sound)} />
        </div>
        <button onClick={requestPermission} className="w-full py-2.5 bg-[#1B6B4A] text-white rounded-xl font-medium text-sm hover:bg-[#175f42] transition-colors">
          Enable Browser Notifications
        </button>
        <p className="text-xs text-gray-400 text-center">Reminders require notifications permission. If the browser restricts background timers, reminders may only fire when the app is open.</p>
      </div>
    </Modal>
  );
}

function ToggleRow({ icon, label, desc, checked, onToggle }: { icon: React.ReactNode; label: string; desc: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="text-gray-500">{icon}</div>
      <div className="flex-1"><p className="text-sm font-medium text-gray-800">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
      <button onClick={onToggle} className={cn('w-11 h-6 rounded-full relative transition-colors', checked ? 'bg-[#1B6B4A]' : 'bg-gray-300')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

export function DarkModeToggle({ darkMode, onToggle }: { darkMode: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="text-gray-500">{darkMode ? <Moon size={18} /> : <Sun size={18} />}</div>
      <div className="flex-1"><p className="text-sm font-medium text-gray-800">Dark Mode</p><p className="text-xs text-gray-400">{darkMode ? 'On' : 'Off'}</p></div>
      <button onClick={onToggle} className={cn('w-11 h-6 rounded-full relative transition-colors', darkMode ? 'bg-[#1B6B4A]' : 'bg-gray-300')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', darkMode ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}
