import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '../../utils/cn';
import { api, formatDate } from '../../core/api';
import type { HealthRecord } from '../../core/api';
import { useAppCtx } from '../../app/AppShell';
import { useToast } from '../../core/toast';
import { Card, EmptyState, RecordStatusChip, Modal } from '../../designsystem';
import { FolderOpen, Plus, Search, Filter, FileText, Upload, ChevronRight, Trash2, Pin, PinOff, Download, Loader2, Check } from 'lucide-react';

const DOC_TYPES = ['Lab Result','Prescription','Visit Summary','Imaging Report','Referral','Insurance Card','Vaccination Record', 'Immunization', 'Other'];

export function RecordsTab() {
  const { activeProfileId } = useAppCtx();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const records = useLiveQuery(async () => api.listRecords(activeProfileId!, { docType: filterType ?? undefined, query: search || undefined }), [activeProfileId, filterType, search]) ?? [];
  const selectedRecord = useLiveQuery(async () => selectedId ? api.getRecord(selectedId) : undefined, [selectedId]);

  if (!activeProfileId) return <EmptyState icon={<FolderOpen size={48} />} title="No profile" message="Select a profile first." />;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex gap-2">
        <div className="flex-1 relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none text-sm" /></div>
        <button onClick={() => setShowFilters(!showFilters)} className={cn('p-2.5 rounded-xl border', showFilters ? 'bg-[#e6f4ea] border-[#1B6B4A]/30 text-[#1B6B4A]' : 'border-gray-200 text-gray-500')}><Filter size={18} /></button>
        <button onClick={() => setShowUpload(true)} className="p-2.5 rounded-xl bg-[#1B6B4A] text-white hover:bg-[#175f42]"><Plus size={18} /></button>
      </div>
      {showFilters && <div className="flex gap-2 flex-wrap animate-fade-in"><button onClick={() => setFilterType(null)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium', !filterType ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600')}>All</button>{DOC_TYPES.slice(0, 5).map(t => <button key={t} onClick={() => setFilterType(filterType === t ? null : t)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium', filterType === t ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600')}>{t}</button>)}</div>}
      {records.length > 0 ? <div className="space-y-3">{records.map(r => <RecordCard key={r.id} record={r} onOpen={() => setSelectedId(r.id)} />)}</div>
        : search || filterType ? <EmptyState icon={<Search size={36} />} title="No matches" message="Adjust your search or filters." />
        : <EmptyState icon={<FolderOpen size={48} />} title="No records" message="Upload health records to keep them organized." cta="Upload" onCta={() => setShowUpload(true)} />}
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} profileId={activeProfileId} />
      <RecordDetailModal record={selectedRecord ?? null} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RecordCard({ record, onOpen }: { record: HealthRecord; onOpen: () => void }) {
  return (
    <Card onClick={onOpen}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><FileText size={20} className="text-blue-700" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-800 truncate">{record.title}</p>{record.offlinePinned && <Pin size={12} className="text-[#1B6B4A]" />}</div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2"><span>{record.docType}</span>{record.date && <><span>·</span><span>{record.date}</span></>}{record.provider && <><span>·</span><span>{record.provider}</span></>}</div>
          <div className="flex items-center gap-2"><RecordStatusChip status={record.status} />{record.tags.slice(0, 2).map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{t}</span>)}</div>
        </div>
        <ChevronRight size={18} className="text-gray-300 shrink-0" />
      </div>
      {record.status === 'uploading' && record.uploadProgress != null && (
        <div className="mt-3 pt-3 border-t border-gray-100"><div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-[#1B6B4A] h-1.5 rounded-full transition-all" style={{ width: `${record.uploadProgress}%` }} /></div><p className="text-xs text-gray-400 mt-1">Uploading... {record.uploadProgress}%</p></div>
      )}
    </Card>
  );
}

function UploadModal({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const [mode, setMode] = useState<'chooser' | 'form' | 'fhir'>('chooser');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [provider, setProvider] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { blobKey } = await api.createUploadUrl();
      await api.createRecord(profileId, { title: title.trim(), docType, provider: provider || undefined, date, tags: tags.split(',').map(t => t.trim()).filter(Boolean), blobKey }, file ?? undefined);
      toast('Upload started — extracting metadata', 'success');
      setTitle(''); setDocType(DOC_TYPES[0]); setProvider(''); setDate(new Date().toISOString().split('T')[0]); setTags(''); setFile(null); setMode('chooser'); onClose();
    } catch (e: any) {
      toast(e?.message || 'Upload failed', 'error');
    }
    setSaving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setTitle(f.name.split('.')[0] || 'New Document');
      setMode('form');
    }
  };

  return (
    <Modal open={open} onClose={() => { setMode('chooser'); onClose(); }} title="Upload Record">
      {mode === 'chooser' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-2">How would you like to add this record?</p>
          <button onClick={() => { inputRef.current?.setAttribute('capture', 'environment'); inputRef.current?.setAttribute('accept', 'image/*'); inputRef.current?.click(); }} className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"><span className="text-2xl">📷</span><span className="font-medium text-gray-800">Scan with camera</span></button>
          <button onClick={() => { inputRef.current?.removeAttribute('capture'); inputRef.current?.setAttribute('accept', 'application/pdf'); inputRef.current?.click(); }} className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"><span className="text-2xl">📄</span><span className="font-medium text-gray-800">Import PDF</span></button>
          <button onClick={() => { inputRef.current?.removeAttribute('capture'); inputRef.current?.setAttribute('accept', 'image/*,.pdf,application/pdf'); inputRef.current?.click(); }} className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"><span className="text-2xl">📁</span><span className="font-medium text-gray-800">Import from Files</span></button>
          <button onClick={() => setMode('form')} className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"><span className="text-2xl">✍️</span><span className="font-medium text-gray-800">Manual Entry</span></button>
          <div className="py-2"><div className="h-px bg-gray-100" /></div>
          <button onClick={() => setMode('fhir')} className="w-full p-4 bg-blue-50 rounded-xl text-left hover:bg-blue-100 flex items-center gap-3 transition-colors text-blue-700"><span className="text-2xl">🏥</span><span className="font-medium">Connect to Hospital (FHIR)</span></button>
          <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
        </div>
      ) : mode === 'fhir' ? (
        <FhirImportFlow
          profileId={profileId}
          onDone={() => { setMode('chooser'); onClose(); }}
          onCancel={() => setMode('chooser')}
        />
      ) : (
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Blood Test" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={docType} onChange={e => setDocType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none">{DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Provider</label><input type="text" value={provider} onChange={e => setProvider(e.target.value)} placeholder="Doctor" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none" /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label><input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="cholesterol, annual" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" /></div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
          <input ref={inputRef} type="file" accept="image/*,.pdf,application/pdf" capture="environment" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
          <button onClick={() => inputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#1B6B4A]/30 transition-colors">
            {file ? <p className="text-sm text-[#1B6B4A] font-medium">{file.name}</p> : <><Upload size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-sm text-gray-500">Tap to select file</p><p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG</p></>}
          </button>
        </div>
        <button onClick={handleUpload} disabled={saving || !title.trim()} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50">{saving ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Upload Record'}</button>
      </div>
      )}
    </Modal>
  );
}

// ── FHIR IMPORT ────────────────────────────────────────────────

const FHIR_PROVIDERS = [
  {
    id: 'epic',
    name: 'Epic / MyChart',
    records: [
      { title: 'Annual Wellness Visit — Summary', docType: 'Visit Summary', provider: 'Dr. Sarah Chen', date: '2024-01-15', tags: ['annual', 'wellness'] },
      { title: 'Complete Blood Count (CBC)', docType: 'Lab Result', provider: 'City Medical Lab', date: '2024-01-15', tags: ['blood', 'cbc', 'lab'] },
    ],
    medications: [
      { displayName: 'Metformin', strength: '500mg', instructions: 'Take twice daily with meals', times: ['08:00', '20:00'], days: [0,1,2,3,4,5,6] },
    ],
  },
  {
    id: 'cerner',
    name: 'Cerner / HealtheLife',
    records: [
      { title: 'Chest X-Ray — PA & Lateral', docType: 'Imaging Report', provider: 'Radiology Associates', date: '2024-03-22', tags: ['xray', 'chest', 'imaging'] },
      { title: 'Lisinopril 10mg — Prescription', docType: 'Prescription', provider: 'Dr. James Wilson', date: '2024-03-22', tags: ['prescription', 'hypertension'] },
    ],
    medications: [
      { displayName: 'Lisinopril', strength: '10mg', instructions: 'Take once daily in the morning', times: ['09:00'], days: [0,1,2,3,4,5,6] },
    ],
  },
  {
    id: 'athena',
    name: 'AthenaHealth',
    records: [
      { title: 'Influenza Vaccine — 2024–25 Season', docType: 'Vaccination Record', provider: 'Community Health Clinic', date: '2024-10-05', tags: ['vaccine', 'flu', 'immunization'] },
      { title: 'Fasting Blood Glucose Panel', docType: 'Lab Result', provider: 'Quest Diagnostics', date: '2024-10-05', tags: ['glucose', 'diabetes', 'lab'] },
    ],
    medications: [],
  },
  {
    id: 'kaiser',
    name: 'Kaiser Permanente',
    records: [
      { title: 'Cardiology Referral — Dr. Patel', docType: 'Referral', provider: 'Dr. Monica Patel', date: '2024-02-10', tags: ['referral', 'cardiology'] },
      { title: 'Echocardiogram Report', docType: 'Imaging Report', provider: 'Kaiser Cardiology Center', date: '2024-02-28', tags: ['echo', 'heart', 'imaging'] },
    ],
    medications: [
      { displayName: 'Atorvastatin', strength: '20mg', instructions: 'Take once at bedtime for cholesterol', times: ['21:00'], days: [0,1,2,3,4,5,6] },
    ],
  },
] as const;

type FhirStep = 'select' | 'authorizing' | 'preview' | 'importing' | 'done';

function FhirImportFlow({ profileId, onDone, onCancel }: { profileId: string; onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState<FhirStep>('select');
  const [selectedProvider, setSelectedProvider] = useState<typeof FHIR_PROVIDERS[number] | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [selectedMeds, setSelectedMeds] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState({ recordCount: 0, medCount: 0 });

  const startAuth = (provider: typeof FHIR_PROVIDERS[number]) => {
    setSelectedProvider(provider);
    setSelectedRecords(new Set(provider.records.map((_, i) => i)));
    setSelectedMeds(new Set(provider.medications.map((_, i) => i)));
    setStep('authorizing');
    setTimeout(() => setStep('preview'), 2000);
  };

  const handleImport = async () => {
    if (!selectedProvider) return;
    setStep('importing');
    const recordsToImport = selectedProvider.records.filter((_, i) => selectedRecords.has(i));
    const medsToImport = selectedProvider.medications.filter((_, i) => selectedMeds.has(i));
    const result = await api.fhirImport(profileId, [...recordsToImport], [...medsToImport]);
    setImportResult(result);
    setStep('done');
  };

  const toggleRecord = (i: number) => {
    const next = new Set(selectedRecords);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelectedRecords(next);
  };

  const toggleMed = (i: number) => {
    const next = new Set(selectedMeds);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelectedMeds(next);
  };

  if (step === 'select') return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Select your healthcare provider to securely import records via SMART on FHIR.</p>
      <div className="space-y-2">
        {FHIR_PROVIDERS.map(p => (
          <button key={p.id} onClick={() => startAuth(p)} className="w-full p-4 border border-gray-200 rounded-xl text-left hover:border-[#1B6B4A] hover:bg-gray-50 flex items-center justify-between transition-colors">
            <div>
              <span className="font-medium text-gray-800">{p.name}</span>
              <p className="text-xs text-gray-400 mt-0.5">{p.records.length} records · {p.medications.length} medication{p.medications.length !== 1 ? 's' : ''} available</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
    </div>
  );

  if (step === 'authorizing') return (
    <div className="py-10 text-center space-y-4">
      <Loader2 size={40} className="animate-spin text-[#1B6B4A] mx-auto" />
      <div>
        <p className="font-semibold text-gray-800">Connecting to {selectedProvider?.name}</p>
        <p className="text-sm text-gray-500 mt-1">Authorizing via SMART on FHIR…</p>
      </div>
    </div>
  );

  if (step === 'preview' && selectedProvider) {
    const totalSelected = selectedRecords.size + selectedMeds.size;
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
          <Check size={16} className="text-emerald-700 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">Connected to {selectedProvider.name}</p>
        </div>

        {selectedProvider.records.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Documents ({selectedProvider.records.length})</p>
            <div className="space-y-2">
              {selectedProvider.records.map((r, i) => (
                <label key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input type="checkbox" checked={selectedRecords.has(i)} onChange={() => toggleRecord(i)} className="mt-0.5 accent-[#1B6B4A]" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.docType} · {r.provider} · {r.date}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedProvider.medications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Medications ({selectedProvider.medications.length})</p>
            <div className="space-y-2">
              {selectedProvider.medications.map((m, i) => (
                <label key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input type="checkbox" checked={selectedMeds.has(i)} onChange={() => toggleMed(i)} className="mt-0.5 accent-[#1B6B4A]" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.displayName} {m.strength}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.instructions}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
          <button
            onClick={handleImport}
            disabled={totalSelected === 0}
            className="flex-1 py-2.5 bg-[#1B6B4A] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            Import {totalSelected} item{totalSelected !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'importing') return (
    <div className="py-10 text-center space-y-4">
      <Loader2 size={40} className="animate-spin text-[#1B6B4A] mx-auto" />
      <div>
        <p className="font-semibold text-gray-800">Importing records…</p>
        <p className="text-sm text-gray-500 mt-1">Encrypting and storing your health data</p>
      </div>
    </div>
  );

  if (step === 'done') {
    const { recordCount, medCount } = importResult;
    const parts: string[] = [];
    if (recordCount > 0) parts.push(`${recordCount} record${recordCount > 1 ? 's' : ''}`);
    if (medCount > 0) parts.push(`${medCount} medication${medCount > 1 ? 's' : ''}`);
    return (
      <div className="py-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <Check size={32} className="text-emerald-700" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">Import Complete!</p>
          <p className="text-sm text-gray-500 mt-1">{parts.join(' and ')} added to your profile.</p>
        </div>
        <button onClick={onDone} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] transition-colors">Done</button>
      </div>
    );
  }

  return null;
}

function RecordDetailModal({ record, onClose }: { record: HealthRecord | null; onClose: () => void }) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  if (!record) return null;

  const handleView = async () => {
    try { const url = await api.createDownloadUrl(record.id); setViewUrl(url); } catch { alert('Unable to open document'); }
  };

  return (
    <Modal open={!!record} onClose={() => { setViewUrl(null); onClose(); }} title="Record Detail" wide={!!viewUrl}>
      {viewUrl ? (
        <div className="space-y-3">
          <button onClick={() => setViewUrl(null)} className="text-sm text-[#1B6B4A] font-medium">← Back to details</button>
          {viewUrl.includes('image') ? <img src={viewUrl} alt="Document" className="w-full rounded-xl" /> :
            <iframe src={viewUrl} className="w-full h-[60vh] rounded-xl border" title="Document viewer" />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center"><FileText size={24} className="text-blue-700" /></div><div><h3 className="font-bold text-gray-900">{record.title}</h3><RecordStatusChip status={record.status} /></div></div>
          <div className="space-y-3">
            <Row label="Type" value={record.docType} />
            {record.provider && <Row label="Provider" value={record.provider} />}
            {record.date && <Row label="Date" value={record.date} />}
            <Row label="Added" value={formatDate(record.createdAt)} />
            <Row label="Pinned" value={record.offlinePinned ? 'Yes' : 'No'} />
          </div>
          {record.tags.length > 0 && <div><p className="text-xs font-medium text-gray-400 uppercase mb-2">Tags</p><div className="flex gap-1.5 flex-wrap">{record.tags.map(t => <span key={t} className="px-2.5 py-1 bg-[#e6f4ea] text-[#1B6B4A] rounded-full text-xs font-medium">{t}</span>)}</div></div>}
          <div className="flex gap-2">
            <button onClick={() => api.patchRecord(record.id, { offlinePinned: !record.offlinePinned })} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700">{record.offlinePinned ? <><PinOff size={16} />Unpin</> : <><Pin size={16} />Pin Offline</>}</button>
            {record.blobKey && <button onClick={handleView} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 rounded-xl text-sm font-medium text-blue-700"><Download size={16} />View</button>}
            <button onClick={async () => { await api.deleteRecord(record.id); onClose(); }} className="py-2.5 px-4 bg-red-50 rounded-xl text-sm font-medium text-red-700"><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-400 uppercase">{label}</span><span className="text-sm text-gray-700">{value}</span></div>; }
