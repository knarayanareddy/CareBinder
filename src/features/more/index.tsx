import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '../../utils/cn';
import { api, formatDate } from '../../core/api';
import { useAppCtx } from '../../app/AppShell';
import { Card, EmptyState, Modal } from '../../designsystem';
import { MoreHorizontal, Siren, Shield, Bell, Lock, HelpCircle, ChevronRight, LogOut, UserPlus, Plus, Trash2, Edit3, Loader2, Phone, BellOff, Download } from 'lucide-react';
import { HelpScreen } from './HelpScreen';
import { ExportScreen } from './ExportScreen';
import { NotificationPrefs, DarkModeToggle } from './SettingsScreens';

export function MoreTab() {
  const { activeProfileId, activeProfile, profiles, logout } = useAppCtx();
  const [showEmergency, setShowEmergency] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('cb_dark', next ? '1' : '0'); } catch {}
  };

  if (!activeProfileId || !activeProfile) return <EmptyState icon={<MoreHorizontal size={48} />} title="No profile" message="Select a profile first." />;

  const menu = [
    { icon: <Siren size={20} />, label: 'Emergency Card', desc: 'Offline-accessible medical info', color: 'text-red-600', bg: 'bg-red-50', action: () => setShowEmergency(true) },
    { icon: <Bell size={20} />, label: 'Updates Inbox', desc: 'Recent activity', color: 'text-[#1B6B4A]', bg: 'bg-[#e6f4ea]', action: () => setShowUpdates(true) },
    { icon: <UserPlus size={20} />, label: 'Add Profile', desc: 'Manage another family member', color: 'text-[#1B6B4A]', bg: 'bg-[#e6f4ea]', action: () => setShowAddProfile(true) },
    { icon: <Bell size={20} />, label: 'Notification Preferences', desc: 'Reminders, sounds, quiet hours', color: 'text-amber-600', bg: 'bg-amber-50', action: () => setShowNotifs(true) },
    { icon: <Lock size={20} />, label: 'Security & Privacy', desc: 'Encryption, audit log', color: 'text-blue-600', bg: 'bg-blue-50', action: () => setShowSettings(true) },
    { icon: <Download size={20} />, label: 'Export Data', desc: 'Download your records', color: 'text-purple-600', bg: 'bg-purple-50', action: () => setShowExport(true) },
    { icon: <HelpCircle size={20} />, label: 'Help & FAQ', desc: 'How to use CareBinder', color: 'text-gray-500', bg: 'bg-gray-100', action: () => setShowHelp(true) },
    { icon: <LogOut size={20} />, label: 'Sign Out', desc: '', color: 'text-red-600', bg: 'bg-red-50', action: () => { if (confirm('Sign out? All local data will be cleared.')) logout(); } },
  ];

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <Card className="flex items-center gap-4"><div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ backgroundColor: activeProfile.avatarColor }}>{activeProfile.name[0]?.toUpperCase()}</div><div className="flex-1"><h2 className="text-lg font-bold text-gray-900">{activeProfile.name}</h2><p className="text-sm text-gray-500 capitalize">{activeProfile.type}{activeProfile.dob ? ` · ${activeProfile.dob}` : ''}</p></div></Card>
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-3"><p className="text-2xl font-bold text-[#1B6B4A]">{profiles.length}</p><p className="text-xs text-gray-500">Profiles</p></Card>
      </div>

      {/* Dark mode toggle */}
      <Card><DarkModeToggle darkMode={darkMode} onToggle={toggleDark} /></Card>

      <div className="space-y-2">{menu.map((item, i) => (
        <button key={i} onClick={item.action} className="w-full"><Card className="flex items-center gap-3"><div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bg, item.color)}>{item.icon}</div><div className="flex-1 text-left"><p className="font-medium text-gray-800">{item.label}</p>{item.desc && <p className="text-xs text-gray-400">{item.desc}</p>}</div><ChevronRight size={16} className="text-gray-300" /></Card></button>
      ))}</div>

      <EmergencyCardModal open={showEmergency} onClose={() => setShowEmergency(false)} profileId={activeProfileId} />
      <UpdatesModal open={showUpdates} onClose={() => setShowUpdates(false)} profileId={activeProfileId} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} profileId={activeProfileId} />
      <AddProfileModal open={showAddProfile} onClose={() => setShowAddProfile(false)} />
      <HelpScreen open={showHelp} onClose={() => setShowHelp(false)} />
      <ExportScreen open={showExport} onClose={() => setShowExport(false)} />
      <NotificationPrefs open={showNotifs} onClose={() => setShowNotifs(false)} />
    </div>
  );
}

function EmergencyCardModal({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const card = useLiveQuery(async () => { try { return await api.getEmergencyCard(profileId); } catch { return null; } }, [profileId, open]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [conditions, setConditions] = useState('');
  const [physician, setPhysician] = useState('');
  const [insurance, setInsurance] = useState('');
  const [contacts, setContacts] = useState<{ name: string; phone: string; relationship: string }[]>([]);

  const startEdit = () => {
    if (!card) return;
    setAllergies(card.allergies.join(', ')); setMedications(card.medications.join(', ')); setConditions(card.conditions.join(', '));
    setPhysician(card.primaryPhysician ?? ''); setInsurance(card.insuranceInfo ?? ''); setContacts(card.emergencyContacts); setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await api.patchEmergencyCard(profileId, {
      allergies: allergies.split(',').map(s => s.trim()).filter(Boolean), medications: medications.split(',').map(s => s.trim()).filter(Boolean),
      conditions: conditions.split(',').map(s => s.trim()).filter(Boolean), primaryPhysician: physician || undefined, insuranceInfo: insurance || undefined, emergencyContacts: contacts.filter(c => c.name),
    });
    setSaving(false); setEditing(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="🚨 Emergency Card">
      {!card ? <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" /></div> : editing ? (
        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl p-3 flex items-center gap-2"><Siren size={16} className="text-red-600" /><p className="text-xs text-red-700">Keep this card up to date. It works offline.</p></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label><input type="text" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="Penicillin, Latex" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Medications</label><input type="text" value={medications} onChange={e => setMedications(e.target.value)} placeholder="Metformin, Lisinopril" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Conditions</label><input type="text" value={conditions} onChange={e => setConditions(e.target.value)} placeholder="Diabetes, Asthma" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Primary Physician</label><input type="text" value={physician} onChange={e => setPhysician(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Insurance</label><input type="text" value={insurance} onChange={e => setInsurance(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
          <div><div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-gray-700">Emergency Contacts</label><button onClick={() => setContacts([...contacts, { name: '', phone: '', relationship: '' }])} className="text-xs text-[#1B6B4A] font-medium"><Plus size={14} /></button></div>
            {contacts.map((c, i) => {
              const update = (field: string, val: string) => { const u = [...contacts]; u[i] = { ...u[i], [field]: val }; setContacts(u); };
              return (<div key={i} className="flex gap-2 mb-2">
                <input type="text" value={c.name} onChange={e => update('name', e.target.value)} placeholder="Name" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
                <input type="tel" value={c.phone} onChange={e => update('phone', e.target.value)} placeholder="Phone" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
                <button onClick={() => setContacts(contacts.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>);
            })}
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50">{saving ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Save'}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4"><div className="flex items-center justify-between mb-2"><h3 className="font-bold text-gray-900">{card.name}</h3><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">Offline ✓</span></div>{card.dob && <p className="text-sm text-gray-500">DOB: {card.dob}</p>}</div>
          {card.allergies.length > 0 && <div><p className="text-xs font-semibold text-red-500 uppercase mb-1">⚠️ Allergies</p><div className="flex flex-wrap gap-1.5">{card.allergies.map(a => <span key={a} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200">{a}</span>)}</div></div>}
          {card.medications.length > 0 && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">💊 Medications</p><div className="flex flex-wrap gap-1.5">{card.medications.map(m => <span key={m} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{m}</span>)}</div></div>}
          {card.conditions.length > 0 && <div><p className="text-xs font-semibold text-amber-600 uppercase mb-1">🏥 Conditions</p><div className="flex flex-wrap gap-1.5">{card.conditions.map(c => <span key={c} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">{c}</span>)}</div></div>}
          {card.emergencyContacts.filter(c => c.name).length > 0 && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">📞 Contacts</p>{card.emergencyContacts.filter(c => c.name).map((c, i) => <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 mb-1"><Phone size={14} className="text-gray-400" /><span className="text-sm text-gray-700">{c.name}</span><span className="text-xs text-gray-400">{c.phone}</span></div>)}</div>}
          {card.primaryPhysician && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">👨‍⚕️ Physician</p><p className="text-sm text-gray-700">{card.primaryPhysician}</p></div>}
          {card.insuranceInfo && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">📋 Insurance</p><p className="text-sm text-gray-700">{card.insuranceInfo}</p></div>}
          {card.lastSynced && <p className="text-xs text-gray-400 text-center">Last synced: {formatDate(card.lastSynced)}</p>}
          <button onClick={startEdit} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] flex items-center justify-center gap-2"><Edit3 size={16} />Edit Emergency Card</button>
        </div>
      )}
    </Modal>
  );
}

function UpdatesModal({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const updates = useLiveQuery(() => api.listUpdates(profileId), [profileId, open]) ?? [];
  return (
    <Modal open={open} onClose={onClose} title="Updates">
      {updates.length > 0 ? <div className="space-y-2">{updates.map(u => (
        <Card key={u.id} className={cn('flex items-center gap-3 py-3', !u.read && 'border-l-4 border-l-[#1B6B4A]')} onClick={() => api.markUpdateRead(u.id)}>
          {!u.read && <div className="w-2 h-2 rounded-full bg-[#1B6B4A] shrink-0" />}
          <div className="flex-1"><p className="text-sm text-gray-700">{u.message}</p><p className="text-xs text-gray-400">{formatDate(u.timestamp)}</p></div>
        </Card>
      ))}</div> : <EmptyState icon={<BellOff size={36} />} title="No updates" message="Important events will appear here." />}
      {updates.length > 0 && <button onClick={() => api.markAllUpdatesRead(profileId)} className="w-full mt-3 py-2 text-sm text-[#1B6B4A] font-medium">Mark all read</button>}
    </Modal>
  );
}

function SettingsModal({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const auditLog = useLiveQuery(() => api.getAuditLog(profileId), [profileId, open]) ?? [];
  return (
    <Modal open={open} onClose={onClose} title="Security & Privacy">
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-4"><p className="text-sm text-blue-800 font-medium mb-1">Demo Mode Security</p><p className="text-xs text-blue-700">All records encrypted with AES-256-GCM. Encryption keys auto-generated and stored locally. In production: biometric lock, device binding, and server-side key management would be enforced.</p></div>
        <div className="bg-gray-50 rounded-xl p-4"><div className="flex items-center gap-3 mb-2"><Shield size={20} className="text-[#1B6B4A]" /><p className="font-medium text-gray-800">Encryption</p></div><p className="text-sm text-gray-600">Records are encrypted at rest using WebCrypto AES-GCM. Device key derived and stored locally.</p></div>
        <div><h4 className="font-semibold text-gray-700 mb-2">Audit Log</h4>{auditLog.length > 0 ? <div className="space-y-1 max-h-40 overflow-y-auto">{auditLog.map((e, i) => <div key={i} className="flex items-center justify-between py-1"><span className="text-sm text-gray-600">{e.action.replace(/_/g, ' ')}</span><span className="text-xs text-gray-400">{formatDate(e.timestamp)}</span></div>)}</div> : <p className="text-sm text-gray-400">No events yet</p>}</div>
      </div>
    </Modal>
  );
}

function AddProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'self' | 'child' | 'parent' | 'other'>('self');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await api.createProfile({ name: name.trim(), type, dob: dob || undefined });
    setSaving(false); setName(''); setDob(''); setType('self'); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add Profile">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">{([['self','Self'],['child','Child'],['parent','Parent'],['other','Other']] as const).map(([t,l]) => (
          <button key={t} onClick={() => setType(t)} className={cn('py-3 rounded-xl text-sm font-medium border-2 transition-colors', type === t ? 'border-[#1B6B4A] bg-[#e6f4ea] text-[#1B6B4A]' : 'border-gray-100 bg-gray-50 text-gray-500')}>{l}</button>
        ))}</div>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Profile name" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" />
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" />
        <button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 transition-colors">{saving ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Create Profile'}</button>
      </div>
    </Modal>
  );
}
