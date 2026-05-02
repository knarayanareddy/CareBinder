import { useState } from 'react';
import { Modal } from '../../designsystem';
import { Bell, Moon, Sun, Volume2, VolumeX, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getNotifPref, setNotifPref, requestAndSchedule, clearAllReminders } from '../../core/notifications';

export function NotificationPrefs({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const [doseReminders, setDoseReminders] = useState(() => getNotifPref('doses'));
  const [teamUpdates, setTeamUpdates] = useState(() => getNotifPref('teamUpdates'));
  const [recordUpdates, setRecordUpdates] = useState(() => getNotifPref('recordUpdates'));
  const [sound, setSound] = useState(() => getNotifPref('sound'));
  const [permStatus, setPermStatus] = useState<'unknown' | 'granted' | 'denied'>(() => {
    if (!('Notification' in window)) return 'unknown';
    return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'unknown';
  });

  const handleDoseToggle = async () => {
    const next = !doseReminders;
    setDoseReminders(next);
    setNotifPref('doses', next);
    if (next) {
      const granted = await requestAndSchedule(profileId);
      if (granted) {
        setPermStatus('granted');
      } else {
        setDoseReminders(false);
        setNotifPref('doses', false);
        setPermStatus(Notification.permission === 'denied' ? 'denied' : 'unknown');
      }
    } else {
      clearAllReminders();
    }
  };

  const handleTeamToggle = () => {
    const next = !teamUpdates;
    setTeamUpdates(next);
    setNotifPref('teamUpdates', next);
  };

  const handleRecordToggle = () => {
    const next = !recordUpdates;
    setRecordUpdates(next);
    setNotifPref('recordUpdates', next);
  };

  const handleSoundToggle = () => {
    const next = !sound;
    setSound(next);
    setNotifPref('sound', next);
  };

  const handleEnablePermission = async () => {
    const granted = await requestAndSchedule(profileId);
    if (granted) {
      setPermStatus('granted');
      setDoseReminders(true);
    } else {
      setPermStatus(Notification.permission === 'denied' ? 'denied' : 'unknown');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Configure which notifications you receive for this profile.</p>

        {permStatus === 'denied' && (
          <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">Notifications are blocked. Enable them in your browser or device settings, then reopen this screen.</p>
          </div>
        )}
        {permStatus === 'granted' && (
          <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <p className="text-xs text-emerald-700">Notifications are enabled.</p>
          </div>
        )}

        <div className="space-y-3">
          <ToggleRow icon={<Bell size={18} />} label="Dose Reminders" desc="Get reminded when medications are due" checked={doseReminders} onToggle={handleDoseToggle} />
          <ToggleRow icon={<Bell size={18} />} label="Care Team Updates" desc="Invites, permission changes" checked={teamUpdates} onToggle={handleTeamToggle} />
          <ToggleRow icon={<Bell size={18} />} label="Record Processing" desc="Extraction complete, upload status" checked={recordUpdates} onToggle={handleRecordToggle} />
          <ToggleRow icon={sound ? <Volume2 size={18} /> : <VolumeX size={18} />} label="Sound" desc="Play sound with notifications" checked={sound} onToggle={handleSoundToggle} />
        </div>

        {permStatus !== 'granted' && permStatus !== 'denied' && (
          <button onClick={handleEnablePermission} className="w-full py-2.5 bg-[#1B6B4A] text-white rounded-xl font-medium text-sm hover:bg-[#175f42] transition-colors">
            Enable Browser Notifications
          </button>
        )}

        <p className="text-xs text-gray-400 text-center">Reminders fire while the app is open or installed as a PWA. True background push requires server integration.</p>
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
