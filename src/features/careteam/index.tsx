import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '../../utils/cn';
import { api } from '../../core/api';
import type { CareTeamMember, Invite } from '../../core/api';
import { useAppCtx } from '../../app/AppShell';
import { Card, EmptyState, RoleChip, Modal } from '../../designsystem';
import { Users, UserPlus, Shield, Mail, Phone, Check, Loader2, Trash2, AlertTriangle } from 'lucide-react';

export function CareTeamTab() {
  const { activeProfileId } = useAppCtx();
  const [showInvite, setShowInvite] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const members = useLiveQuery(async () => api.listMembers(activeProfileId!), [activeProfileId]) ?? [];
  const invites = useLiveQuery(async () => api.listInvites(activeProfileId!), [activeProfileId]) ?? [];
  const selectedMember = selectedId ? members.find(m => m.id === selectedId) ?? null : null;

  if (!activeProfileId) return <EmptyState icon={<Users size={48} />} title="No profile" message="Select a profile first." />;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Care Team</h2>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 px-3 py-2 bg-[#1B6B4A] text-white rounded-xl text-sm font-medium hover:bg-[#175f42]"><UserPlus size={16} />Invite</button>
      </div>

      {invites.filter(i => i.status === 'pending').length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending Invites</h3>
          <div className="space-y-2">{invites.filter(i => i.status === 'pending').map(inv => (
            <Card key={inv.id} className="flex items-center gap-3 border-l-4 border-l-amber-300">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center"><Mail size={18} className="text-amber-700" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{inv.email ?? inv.phone ?? 'Invite'}</p><p className="text-xs text-gray-400">Pending</p></div>
              <RoleChip role={inv.role} />
            </Card>
          ))}</div>
        </div>
      )}

      {members.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Members</h3>
          <div className="space-y-2">{members.map(m => (
            <Card key={m.id} onClick={() => setSelectedId(m.id)} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e6f4ea] flex items-center justify-center text-[#1B6B4A] font-semibold shrink-0">{m.name[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="font-medium text-gray-800">{m.name}</p><p className="text-xs text-gray-400">{m.email ?? m.phone ?? ''}</p></div>
              <RoleChip role={m.role} />
            </Card>
          ))}</div>
        </div>
      ) : <EmptyState icon={<Users size={48} />} title="No team yet" message="Invite caregivers to help manage care." cta="Invite" onCta={() => setShowInvite(true)} />}

      {members.length > 0 && (
        <Card className="bg-[#e6f4ea] border-[#1B6B4A]/10">
          <div className="flex items-center gap-2 mb-2"><Shield size={18} className="text-[#1B6B4A]" /><h4 className="font-semibold text-[#1B6B4A]">Sharing Overview</h4></div>
          <p className="text-sm text-[#1B6B4A]">{members.length} member{members.length > 1 ? 's' : ''} have access.</p>
        </Card>
      )}

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} profileId={activeProfileId} />
      <MemberDetailModal member={selectedMember} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function InviteModal({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Invite['role']>('contributor');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email && !phone) return;
    setSending(true);
    await api.createInvite(profileId, { email: method === 'email' ? email : undefined, phone: method === 'phone' ? phone : undefined, role });
    setSending(false); setEmail(''); setPhone(''); setRole('contributor'); onClose();
  };

  const roles: { role: Invite['role']; label: string; desc: string }[] = [
    { role: 'viewer', label: 'Viewer', desc: 'Read-only access' },
    { role: 'contributor', label: 'Contributor', desc: 'Can add records, mark doses' },
    { role: 'manager', label: 'Manager', desc: 'Can edit schedules, manage team' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Invite Caregiver">
      <div className="space-y-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setMethod('email')} className={cn('flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors', method === 'email' ? 'bg-white shadow' : 'text-gray-500')}><Mail size={16} />Email</button>
          <button onClick={() => setMethod('phone')} className={cn('flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors', method === 'phone' ? 'bg-white shadow' : 'text-gray-500')}><Phone size={16} />Phone</button>
        </div>
        {method === 'email' ? <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="caregiver@example.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" />
          : <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" />}
        <div><p className="text-sm font-medium text-gray-700 mb-2">Permission Level</p><div className="space-y-2">{roles.map(r => (
          <button key={r.role} onClick={() => setRole(r.role)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors', role === r.role ? 'border-[#1B6B4A] bg-[#e6f4ea]' : 'border-gray-100 hover:border-gray-200')}>
            <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center', role === r.role ? 'border-[#1B6B4A] bg-[#1B6B4A]' : 'border-gray-300')}>{role === r.role && <Check size={12} className="text-white" />}</div>
            <div><p className="font-medium text-gray-800">{r.label}</p><p className="text-xs text-gray-500">{r.desc}</p></div>
          </button>
        ))}</div></div>
            <button onClick={handleSend} disabled={sending || (!email && !phone)} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50">{sending ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Send Invite'}</button>
            <button onClick={async () => {
              const shareText = `Join my care team on CareBinder! I've invited you as ${role}.`;
              if (navigator.share) {
                try { await navigator.share({ title: 'CareBinder Invite', text: shareText }); } catch {}
              } else {
                try { await navigator.clipboard.writeText(shareText); alert('Invite link copied to clipboard!'); } catch {}
              }
            }} className="w-full py-2 text-sm text-[#1B6B4A] font-medium">Or share invite link</button>
      </div>
    </Modal>
  );
}

function MemberDetailModal({ member, onClose }: { member: CareTeamMember | null; onClose: () => void }) {
  const [showRemove, setShowRemove] = useState(false);
  if (!member) return null;
  const perms = { 'View Records': member.role !== 'viewer' || member.role === 'viewer', 'Add Records': ['owner','manager','contributor'].includes(member.role), 'View Meds': true, 'Log Doses': ['owner','manager','contributor'].includes(member.role), 'Edit Schedules': ['owner','manager'].includes(member.role), 'View Emergency Card': true };

  return (
    <Modal open={!!member} onClose={onClose} title="Team Member">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-[#e6f4ea] flex items-center justify-center text-[#1B6B4A] font-bold text-lg">{member.name[0]?.toUpperCase()}</div><div><h3 className="font-bold text-gray-900">{member.name}</h3><p className="text-sm text-gray-500">{member.email ?? member.phone ?? ''}</p></div></div>
        <div className="flex items-center justify-between"><span className="font-semibold text-gray-700">Role</span><RoleChip role={member.role} /></div>
        <div><h4 className="font-semibold text-gray-700 mb-2">Permissions</h4><div className="space-y-2">{Object.entries(perms).map(([k, v]) => <div key={k} className="flex items-center justify-between py-1.5"><span className="text-sm text-gray-600">{k}</span><span className={cn('text-sm font-medium', v ? 'text-emerald-700' : 'text-gray-400')}>{v ? '✓ Allowed' : '✗ Not allowed'}</span></div>)}</div></div>
        {member.role !== 'owner' && (!showRemove ? <button onClick={() => setShowRemove(true)} className="w-full py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2"><Trash2 size={16} />Remove</button>
          : <div className="bg-red-50 rounded-xl p-4 animate-fade-in"><div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-red-700" /><p className="font-medium text-red-700">Remove {member.name}?</p></div><div className="flex gap-2"><button onClick={() => setShowRemove(false)} className="flex-1 py-2 bg-white rounded-xl text-sm font-medium">Cancel</button><button onClick={async () => { await api.removeMember(member.id); onClose(); }} className="flex-1 py-2 bg-red-700 text-white rounded-xl text-sm font-medium">Remove</button></div></div>
        )}
      </div>
    </Modal>
  );
}
