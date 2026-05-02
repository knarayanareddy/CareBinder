import { db, type TaskRow, type AppointmentRow } from './db';
import { encryptBlob, decryptBlob } from './crypto';
import type {
  Profile, Medication, MedSchedule, DoseEvent, HealthRecord,
  Job, CareTeamMember, Invite, EmergencyCard, UpdateItem, Permissions, Problem,
} from './schemas';
import type { ConfirmationResult } from 'firebase/auth';
import {
  RecaptchaVerifier, signInWithPhoneNumber, sendSignInLinkToEmail,
  isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut,
} from 'firebase/auth';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from './firebase';
import { syncSubDoc, syncProfileDoc, deleteSubDoc, registerProfileForUser } from './firestoreSync';
export type {
  Profile, Medication, MedSchedule, DoseEvent, HealthRecord,
  Job, CareTeamMember, Invite, EmergencyCard, UpdateItem, Permissions, Problem,
};

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function now(): string { return new Date().toISOString(); }

export function todayStr(): string { return new Date().toISOString().split('T')[0]; }

export function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return iso; }
}

export function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return iso; }
}

const PHI_FIELDS = new Set(['displayName','name','provider','allergies','medications','conditions','email','phone','emergencyContacts','instructions']);
export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) r[k] = PHI_FIELDS.has(k) ? '[REDACTED]' : v;
  return r;
}

// ═══════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════

const ROLE_PERMS: Record<string, Permissions> = {
  owner:       { canViewRecords:true, canAddRecords:true, canViewMeds:true, canLogDoses:true, canEditSchedules:true, canViewAppointments:true, canEditAppointments:true, canViewEmergencyCard:true },
  manager:     { canViewRecords:true, canAddRecords:true, canViewMeds:true, canLogDoses:true, canEditSchedules:true, canViewAppointments:true, canEditAppointments:true, canViewEmergencyCard:true },
  contributor: { canViewRecords:true, canAddRecords:true, canViewMeds:true, canLogDoses:true, canEditSchedules:false, canViewAppointments:true, canEditAppointments:false, canViewEmergencyCard:true },
  viewer:      { canViewRecords:true, canAddRecords:false, canViewMeds:true, canLogDoses:false, canEditSchedules:false, canViewAppointments:true, canEditAppointments:false, canViewEmergencyCard:true },
};

export function getPermissions(role: string): Permissions { return ROLE_PERMS[role] ?? ROLE_PERMS.viewer; }
export function canDo(role: string, action: keyof Permissions): boolean { return getPermissions(role)[action]; }

export function getCurrentUserRole(profileId: string): Promise<string> {
  if (!profileId) return Promise.resolve('owner');
  return db.careTeamMembers.where('profileId').equals(profileId).first().then(m => m?.role ?? 'owner');
}

export async function requirePermission(profileId: string, action: keyof Permissions): Promise<void> {
  if (!profileId) throw new ApiError(400, '/errors/no-profile', 'No active profile');
  const role = await getCurrentUserRole(profileId);
  if (!canDo(role, action)) throw new ApiError(403, '/errors/forbidden', 'Insufficient permissions', `Role ${role} cannot ${action}`);
}

// ═══════════════════════════════════════════════
// ERROR
// ═══════════════════════════════════════════════

export class ApiError extends Error {
  constructor(public status: number, public type: string, public title: string, public detail?: string) { super(title); }
  toProblem(): Problem { return { type: this.type, title: this.title, status: this.status, detail: this.detail }; }
}

// ═══════════════════════════════════════════════
// SCHEDULE COMPUTATION
// ═══════════════════════════════════════════════

export function getNextOccurrence(times: string[], days: number[]): Date | null {
  if (!times.length) return null;
  const nowDate = new Date();
  const todayDay = nowDate.getDay();
  const sorted = [...times].sort();
  const daySet = days.length > 0 ? new Set(days) : new Set([0,1,2,3,4,5,6]);

  // Check remaining times today
  if (daySet.has(todayDay)) {
    for (const t of sorted) {
      const [h, m] = t.split(':').map(Number);
      const cand = new Date(nowDate); cand.setHours(h, m, 0, 0);
      if (cand > nowDate) return cand;
    }
  }
  // Check next 7 days
  for (let d = 1; d <= 7; d++) {
    const checkDay = (todayDay + d) % 7;
    if (daySet.has(checkDay)) {
      const [h, m] = sorted[0].split(':').map(Number);
      const cand = new Date(nowDate); cand.setDate(cand.getDate() + d); cand.setHours(h, m, 0, 0);
      return cand;
    }
  }
  return null;
}

export function computeAdherence(events: DoseEvent[], days: number): { taken: number; total: number; rate: number } {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const inRange = events.filter(e => new Date(e.takenAt) >= cutoff);
  const taken = inRange.filter(e => e.action === 'taken').length;
  const total = inRange.length;
  return { taken, total, rate: total > 0 ? Math.round((taken / total) * 100) / 100 : 1 };
}

// ═══════════════════════════════════════════════
// JOB RUNNER
// ═══════════════════════════════════════════════

let jobTimer: ReturnType<typeof setInterval> | null = null;

function jobResult(job: Job): Record<string, unknown> {
  if (job.type === 'extraction_doc') return { suggested_type:'Lab Result', suggested_provider:'City Medical Center', suggested_document_date: todayStr() };
  if (job.type === 'extraction_med_label') return { suggested_med_name:'Medication', suggested_strength:'500mg', suggested_instructions:'Take once daily' };
  if (job.type === 'reminder_reconcile') return { next_occurrences_count: 7, devices_targeted: 1 };
  return {};
}

async function tickJobs() {
  try {
    const queued = await db.jobs.where('status').equals('QUEUED').toArray();
    for (const j of queued) await db.jobs.update(j.id, { status: 'RUNNING', progressPct: 10, updatedAt: now() });

    const running = await db.jobs.where('status').equals('RUNNING').toArray();
    for (const j of running) {
      const elapsed = Date.now() - new Date(j.updatedAt).getTime();
      if (elapsed >= 4000) {
        const result = jobResult(j);
        await db.jobs.update(j.id, { status: 'SUCCEEDED', progressPct: 100, result: JSON.stringify(result), updatedAt: now() });
        if (j.type.startsWith('extraction') && j.recordId) await db.records.update(j.recordId, { status: 'ready' }).catch(() => {});
        await db.updates.add({ id: uid(), profileId: j.profileId, type: 'extraction_complete', message: j.type === 'extraction_doc' ? 'Document extraction complete' : j.type === 'extraction_med_label' ? 'Medication label processed' : 'Reminders reconciled', timestamp: now(), read: false });
      } else {
        await db.jobs.update(j.id, { progressPct: Math.min(90, 10 + Math.round((elapsed / 4000) * 80)), updatedAt: j.updatedAt });
      }
    }
  } catch {
    // Silently ignore DB errors during job tick — non-critical background process
  }
}

export function startJobRunner() { if (!jobTimer) { jobTimer = setInterval(tickJobs, 2000); tickJobs(); } }
export function stopJobRunner() { if (jobTimer) { clearInterval(jobTimer); jobTimer = null; } }

// ═══════════════════════════════════════════════
// LOCAL API
// ═══════════════════════════════════════════════

class LocalApi {
  private _userId: string | null = null;
  private _activeProfileId: string | null = null;
  get userId() { return this._userId; }
  get activeProfileId() { return this._activeProfileId; }
  setActiveProfile(id: string) { this._activeProfileId = id; }
  restoreActiveProfile() { /* no-op: profile ID managed by React state */ }

  // ── AUTH ──────────────────────────────
  private _confirmationResult: ConfirmationResult | null = null;

  async startPhoneAuth(phone: string): Promise<void> {
    if ((window as any).__cbRecaptcha) {
      try { (window as any).__cbRecaptcha.clear(); } catch {}
    }
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    (window as any).__cbRecaptcha = verifier;
    this._confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
  }

  async startEmailAuth(email: string): Promise<void> {
    await sendSignInLinkToEmail(auth, email, {
      url: 'https://carebinder-f27df.web.app',
      handleCodeInApp: true,
    });
    localStorage.setItem('cb_email_for_link', email);
  }

  async verifyPhoneOtp(code: string): Promise<string> {
    if (!this._confirmationResult) throw new ApiError(400, '/errors/no-auth', 'No pending verification');
    const { user } = await this._confirmationResult.confirm(code);
    this._confirmationResult = null;
    this._userId = user.uid;
    await this._ensureLocalUser(user.uid);
    return user.uid;
  }

  async completeEmailLinkAuth(): Promise<string | null> {
    if (!isSignInWithEmailLink(auth, window.location.href)) return null;
    const email = localStorage.getItem('cb_email_for_link') ?? '';
    if (!email) return null;
    const { user } = await signInWithEmailLink(auth, email, window.location.href);
    localStorage.removeItem('cb_email_for_link');
    window.history.replaceState({}, document.title, window.location.pathname);
    this._userId = user.uid;
    await this._ensureLocalUser(user.uid);
    return user.uid;
  }

  private async _ensureLocalUser(uid: string): Promise<void> {
    const existing = await db.users.toCollection().first();
    if (!existing) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      await db.users.add({ id: uid, authMethod: 'phone', authValue: '', salt: Array.from(salt).join(','), createdAt: now() });
    }
  }

  async restoreSession(): Promise<string | null> {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, async (user) => {
        unsub();
        if (user) {
          this._userId = user.uid;
          await this._ensureLocalUser(user.uid);
          this.restoreActiveProfile();
          resolve(user.uid);
        } else {
          resolve(null);
        }
      });
    });
  }

  async logout(): Promise<void> {
    this._userId = null;
    this._activeProfileId = null;
    await signOut(auth);
    try { localStorage.removeItem('cb_dk'); } catch {}
    try { sessionStorage.clear(); } catch {}
  }

  async wipeAllData(): Promise<void> {
    this._userId = null;
    this._activeProfileId = null;
    await signOut(auth).catch(() => {});
    try { await db.delete(); } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  }

  // ── PROFILES ──────────────────────────
  async listProfiles(): Promise<Profile[]> { return db.profiles.toArray(); }

  async createProfile(data: { name: string; type: Profile['type']; dob?: string }): Promise<Profile> {
    const colors = ['#1B6B4A','#2563EB','#7C3AED','#DC2626','#D97706','#059669'];
    const profile: Profile = { id: uid(), name: data.name, type: data.type, dob: data.dob, avatarColor: colors[Math.floor(Math.random() * colors.length)], createdAt: now() };
    await db.profiles.add(profile);
    syncProfileDoc(profile.id, { ...profile, ownerId: this._userId ?? '' });
    if (this._userId) registerProfileForUser(this._userId, profile.id);
    await db.emergencyCards.add({ id: uid(), profileId: profile.id, name: profile.name, dob: profile.dob, allergies: [], medications: [], conditions: [], emergencyContacts: [], offlineAvailable: true, lastSynced: now() });
    await db.careTeamMembers.add({ id: uid(), profileId: profile.id, name: 'You', role: 'owner', invitedAt: now(), acceptedAt: now() });
    if (!this._activeProfileId) this.setActiveProfile(profile.id);
    return profile;
  }

  async getTodayBundle(profileId: string) {
    if (!profileId) return { nextDoses: [], recentUpdates: [], activeMeds: [], events: [], tasks: [], appointments: [] };
    const meds = await db.medications.where('profileId').equals(profileId).toArray();
    const activeMeds = meds.filter(m => m.status === 'active');
    const schedules = await db.medSchedules.toArray();
    const events = await db.doseEvents.where('profileId').equals(profileId).toArray();
    const tasks = await db.tasks.where('profileId').equals(profileId).toArray();
    const appointments = await db.appointments.where('profileId').equals(profileId).toArray();
    const recentUpdates = await db.updates.where('profileId').equals(profileId).reverse().sortBy('timestamp');
    const nextDoses = activeMeds.map(med => {
      const sched = schedules.find(s => s.medicationId === med.id);
      if (!sched || !sched.times.length) return null;
      const next = getNextOccurrence(sched.times, sched.days);
      return { medication: med, schedule: sched, nextOccurrence: next };
    }).filter(Boolean).sort((a, b) => (a!.nextOccurrence?.getTime() ?? Infinity) - (b!.nextOccurrence?.getTime() ?? Infinity));
    return { nextDoses, recentUpdates: recentUpdates.slice(0, 5), activeMeds, events, tasks, appointments };
  }

  // ── MEDICATIONS ───────────────────────
  async listMedications(profileId: string): Promise<Medication[]> { return profileId ? db.medications.where('profileId').equals(profileId).toArray() : []; }
  async getMedSchedule(medId: string): Promise<MedSchedule | undefined> { return db.medSchedules.where('medicationId').equals(medId).first(); }

  async patchMedSchedule(medId: string, times: string[], days: number[], profileId?: string): Promise<MedSchedule> {
    const existing = await db.medSchedules.where('medicationId').equals(medId).first();
    if (existing) {
      await db.medSchedules.update(existing.id, { times, days });
      const updated = (await db.medSchedules.get(existing.id))!;
      if (profileId) syncSubDoc(profileId, 'medSchedules', existing.id, updated as any);
      return updated;
    }
    const schedule: MedSchedule = { id: uid(), medicationId: medId, times, days };
    await db.medSchedules.add(schedule);
    if (profileId) syncSubDoc(profileId, 'medSchedules', schedule.id, schedule as any);
    return schedule;
  }

  async createMedication(profileId: string, data: { displayName: string; strength: string; instructions: string; asNeeded: boolean; times: string[]; days: number[] }): Promise<{ medication: Medication; schedule: MedSchedule }> {
    await requirePermission(profileId, 'canEditSchedules');
    const med: Medication = { id: uid(), profileId, displayName: data.displayName, strength: data.strength, instructions: data.instructions || 'Take as directed', status: 'active', asNeeded: data.asNeeded, createdAt: now() };
    await db.medications.add(med);
    syncSubDoc(profileId, 'medications', med.id, med as any);
    const schedule: MedSchedule = { id: uid(), medicationId: med.id, times: data.times, days: data.days };
    await db.medSchedules.add(schedule);
    syncSubDoc(profileId, 'medSchedules', schedule.id, schedule as any);
    await db.auditEvents.add({ id: uid(), profileId, action: 'medication_created', details: {}, timestamp: now() });
    return { medication: med, schedule };
  }

  async patchMedication(medId: string, updates: Partial<Medication>): Promise<Medication> {
    await db.medications.update(medId, updates);
    const med = await db.medications.get(medId);
    if (!med) throw new ApiError(404, '/errors/not-found', 'Medication not found');
    return med;
  }

  async deleteMedication(medId: string): Promise<void> {
    await db.medSchedules.where('medicationId').equals(medId).delete();
    await db.doseEvents.where('medicationId').equals(medId).delete();
    await db.medications.delete(medId);
  }

  // ── DOSE EVENTS ───────────────────────
  async createDoseEvent(data: { medicationId: string; profileId: string; scheduledTime: string; action: DoseEvent['action']; snoozeMinutes?: number; skipReason?: string }): Promise<DoseEvent> {
    await requirePermission(data.profileId, 'canLogDoses');
    const event: DoseEvent = { id: uid(), ...data, takenAt: now(), synced: navigator.onLine };
    await db.doseEvents.add(event);
    syncSubDoc(data.profileId, 'doseEvents', event.id, event as any);
    return event;
  }

  async listDoseEvents(profileId: string, from?: string, to?: string): Promise<DoseEvent[]> {
    if (!profileId) return [];
    const events = await db.doseEvents.where('profileId').equals(profileId).toArray();
    return events.filter(e => (!from || e.takenAt >= from) && (!to || e.takenAt <= to)).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  }

  // ── RECORDS ───────────────────────────
  async createUploadUrl(): Promise<{ blobKey: string; uploadUrl: string; expiresAt: string }> {
    const blobKey = uid();
    return { blobKey, uploadUrl: `blob:local/${blobKey}`, expiresAt: new Date(Date.now() + 3600000).toISOString() };
  }

  async createRecord(profileId: string, data: { title: string; docType: string; provider?: string; date?: string; tags?: string[]; blobKey?: string }, file?: File): Promise<HealthRecord> {
    await requirePermission(profileId, 'canAddRecords');
    const blobKey = data.blobKey ?? uid();
    const record: HealthRecord = { id: uid(), profileId, title: data.title, docType: data.docType, provider: data.provider, date: data.date, tags: data.tags ?? [], status: 'uploading', uploadProgress: 0, offlinePinned: false, blobKey, createdAt: now() };
    await db.records.add(record);
    syncSubDoc(profileId, 'records', record.id, record as any);
    if (file) {
      const ab = await file.arrayBuffer();
      const { iv, ciphertext } = await encryptBlob(ab);
      await db.recordBlobs.add({ id: blobKey, recordId: record.id, encryptedData: ciphertext, iv, mimeType: file.type, pageCount: 1 });
      this._uploadToStorage(record.id, profileId, blobKey, ciphertext, iv, file.type);
    } else {
      // No file — simulate upload for extraction demo
      this.simulateUpload(record.id, profileId);
    }
    return record;
  }

  private simulateUpload(recordId: string, profileId: string) {
    let p = 0;
    const iv = setInterval(async () => {
      p += 20 + Math.random() * 15;
      if (p >= 100) { p = 100; clearInterval(iv); await db.records.update(recordId, { uploadProgress: 100, status: 'extracting' }); await this.createExtractionJob(profileId, recordId); }
      else await db.records.update(recordId, { uploadProgress: Math.round(p) });
    }, 400);
  }

  private async _uploadToStorage(recordId: string, profileId: string, blobKey: string, ciphertext: ArrayBuffer, iv: Uint8Array, mimeType: string): Promise<void> {
    try {
      const storageRef = ref(storage, `records/${this._userId}/${blobKey}`);
      const blob = new Blob([ciphertext], { type: 'application/octet-stream' });
      const task = uploadBytesResumable(storageRef, blob, {
        customMetadata: { iv: Array.from(iv).join(','), mimeType },
      });
      task.on('state_changed',
        (snap) => {
          const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          db.records.update(recordId, { uploadProgress: progress });
        },
        async () => { await db.records.update(recordId, { status: 'failed' }); },
        async () => {
          await db.records.update(recordId, { status: 'extracting', uploadProgress: 100 });
          await this.createExtractionJob(profileId, recordId);
        }
      );
    } catch {
      await db.records.update(recordId, { status: 'failed' });
    }
  }

  async listRecords(profileId: string, filters?: { docType?: string; query?: string }): Promise<HealthRecord[]> {
    if (!profileId) return [];
    let records = await db.records.where('profileId').equals(profileId).toArray();
    if (filters?.docType) records = records.filter(r => r.docType === filters.docType);
    if (filters?.query) { const q = filters.query.toLowerCase(); records = records.filter(r => r.title.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q))); }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRecord(recordId: string): Promise<HealthRecord> { const r = await db.records.get(recordId); if (!r) throw new ApiError(404, '/errors/not-found', 'Record not found'); return r; }

  async patchRecord(recordId: string, updates: Partial<HealthRecord>): Promise<HealthRecord> {
    await db.records.update(recordId, updates);
    const r = await db.records.get(recordId);
    if (!r) throw new ApiError(404, '/errors/not-found', 'Record not found');
    syncSubDoc(r.profileId, 'records', recordId, r as any);
    return r;
  }

  async deleteRecord(recordId: string): Promise<void> {
    const record = await db.records.get(recordId);
    if (record) deleteSubDoc(record.profileId, 'records', recordId);
    await db.recordBlobs.where('recordId').equals(recordId).delete();
    await db.records.delete(recordId);
  }

  async fhirImport(
    profileId: string,
    records: { title: string; docType: string; provider: string; date: string; tags: string[] }[],
    medications: { displayName: string; strength: string; instructions: string; times: string[]; days: number[] }[],
  ): Promise<{ recordCount: number; medCount: number }> {
    if (records.length > 0) await requirePermission(profileId, 'canAddRecords');
    if (medications.length > 0) await requirePermission(profileId, 'canEditSchedules');

    for (const r of records) {
      const rec: HealthRecord = { id: uid(), profileId, title: r.title, docType: r.docType, provider: r.provider, date: r.date, tags: r.tags, status: 'extracting', uploadProgress: 100, offlinePinned: false, createdAt: now() };
      await db.records.add(rec);
      await this.createExtractionJob(profileId, rec.id);
    }

    for (const m of medications) {
      const med: Medication = { id: uid(), profileId, displayName: m.displayName, strength: m.strength, instructions: m.instructions, status: 'active', asNeeded: false, createdAt: now() };
      await db.medications.add(med);
      await db.medSchedules.add({ id: uid(), medicationId: med.id, times: m.times, days: m.days });
      await db.auditEvents.add({ id: uid(), profileId, action: 'medication_created', details: {}, timestamp: now() });
    }

    if (records.length + medications.length > 0) {
      const parts: string[] = [];
      if (records.length > 0) parts.push(`${records.length} record${records.length > 1 ? 's' : ''}`);
      if (medications.length > 0) parts.push(`${medications.length} medication${medications.length > 1 ? 's' : ''}`);
      await db.updates.add({ id: uid(), profileId, type: 'extraction_complete', message: `FHIR import complete: added ${parts.join(' and ')}`, timestamp: now(), read: false });
    }

    return { recordCount: records.length, medCount: medications.length };
  }

  async createDownloadUrl(recordId: string): Promise<string> {
    const blob = await db.recordBlobs.where('recordId').equals(recordId).first();
    if (!blob) throw new ApiError(404, '/errors/no-blob', 'No document data');
    const decrypted = await decryptBlob(blob.iv, blob.encryptedData);
    return URL.createObjectURL(new Blob([decrypted], { type: blob.mimeType }));
  }

  // ── JOBS ──────────────────────────────
  async createExtractionJob(profileId: string, recordId: string, type: Job['type'] = 'extraction_doc'): Promise<Job> {
    const job: Job = { id: uid(), type, status: 'QUEUED', profileId, recordId, payload: JSON.stringify({ recordId }), progressPct: 0, createdAt: now(), updatedAt: now() };
    await db.jobs.add(job);
    return job;
  }
  async getJob(jobId: string): Promise<Job> { const j = await db.jobs.get(jobId); if (!j) throw new ApiError(404, '/errors/not-found', 'Job not found'); return j; }

  // ── CARE TEAM ─────────────────────────
  async listMembers(profileId: string): Promise<CareTeamMember[]> { return profileId ? db.careTeamMembers.where('profileId').equals(profileId).toArray() : []; }
  async listInvites(profileId: string): Promise<Invite[]> { return profileId ? db.careTeamInvites.where('profileId').equals(profileId).toArray() : []; }

  async createInvite(profileId: string, data: { email?: string; phone?: string; role: Invite['role'] }): Promise<Invite> {
    const invite: Invite = { id: uid(), profileId, email: data.email, phone: data.phone, role: data.role, token: uid(), status: 'pending', createdAt: now() };
    await db.careTeamInvites.add(invite);
    syncSubDoc(profileId, 'invites', invite.id, invite as any);
    await db.auditEvents.add({ id: uid(), profileId, action: 'invite_sent', details: { role: data.role }, timestamp: now() });
    return invite;
  }

  async acceptInvite(token: string, name: string): Promise<CareTeamMember> {
    const invite = await db.careTeamInvites.where('token').equals(token).first();
    if (!invite || invite.status !== 'pending') throw new ApiError(400, '/errors/invalid-invite', 'Invalid or expired invite');
    const member: CareTeamMember = { id: uid(), profileId: invite.profileId, name, email: invite.email, phone: invite.phone, role: invite.role, invitedAt: invite.createdAt, acceptedAt: now() };
    await db.careTeamMembers.add(member);
    await db.careTeamInvites.update(invite.id, { status: 'accepted' });
    await db.updates.add({ id: uid(), profileId: invite.profileId, type: 'invite_accepted', message: `New ${invite.role} joined the team`, timestamp: now(), read: false });
    return member;
  }

  async patchMember(memberId: string, updates: Partial<CareTeamMember>): Promise<CareTeamMember> {
    await db.careTeamMembers.update(memberId, updates);
    const m = await db.careTeamMembers.get(memberId); if (!m) throw new ApiError(404, '/errors/not-found', 'Member not found'); return m;
  }

  async removeMember(memberId: string): Promise<void> {
    const member = await db.careTeamMembers.get(memberId);
    if (member) deleteSubDoc(member.profileId, 'careTeamMembers', memberId);
    await db.careTeamMembers.delete(memberId);
  }

  // ── EMERGENCY CARD ────────────────────
  async getEmergencyCard(profileId: string): Promise<EmergencyCard> {
    if (!profileId) throw new ApiError(404, '/errors/no-profile', 'No active profile');
    const c = await db.emergencyCards.where('profileId').equals(profileId).first();
    if (!c) throw new ApiError(404, '/errors/not-found', 'Emergency card not found');
    return c;
  }

  async patchEmergencyCard(profileId: string, updates: Partial<EmergencyCard>): Promise<EmergencyCard> {
    const card = await db.emergencyCards.where('profileId').equals(profileId).first();
    if (!card) throw new ApiError(404, '/errors/not-found', 'Emergency card not found');
    await db.emergencyCards.update(card.id, { ...updates, lastSynced: now(), offlineAvailable: true });
    await db.auditEvents.add({ id: uid(), profileId, action: 'emergency_card_updated', details: {}, timestamp: now() });
    const updated = (await db.emergencyCards.get(card.id))!;
    syncSubDoc(profileId, 'emergencyCards', card.id, updated as any);
    return updated;
  }

  // ── UPDATES ───────────────────────────
  async listUpdates(profileId: string): Promise<UpdateItem[]> { return profileId ? db.updates.where('profileId').equals(profileId).reverse().sortBy('timestamp') : []; }
  async markUpdateRead(updateId: string): Promise<void> { await db.updates.update(updateId, { read: true }); }
  async markAllUpdatesRead(profileId: string): Promise<void> { const all = await db.updates.where('profileId').equals(profileId).toArray(); for (const u of all) await db.updates.update(u.id, { read: true }); }

  // ── TASKS ─────────────────────────────
  async listTasks(profileId: string): Promise<TaskRow[]> { return profileId ? db.tasks.where('profileId').equals(profileId).toArray() : []; }
  async createTask(profileId: string, title: string, type: TaskRow['type'] = 'other'): Promise<TaskRow> {
    const t: TaskRow = { id: uid(), profileId, title, type, completed: false, createdAt: now() };
    await db.tasks.add(t);
    syncSubDoc(profileId, 'tasks', t.id, t as any);
    return t;
  }
  async toggleTask(taskId: string): Promise<void> {
    const t = await db.tasks.get(taskId);
    if (t) {
      await db.tasks.update(taskId, { completed: !t.completed });
      const updated = await db.tasks.get(taskId);
      if (updated) syncSubDoc(updated.profileId, 'tasks', taskId, updated as any);
    }
  }

  // ── APPOINTMENTS ──────────────────────
  async listAppointments(profileId: string): Promise<AppointmentRow[]> { return profileId ? db.appointments.where('profileId').equals(profileId).toArray() : []; }
  async createAppointment(profileId: string, data: { date: string; time: string; provider?: string; purpose: string; questions?: string[]; notes?: string }): Promise<AppointmentRow> {
    const a: AppointmentRow = { id: uid(), profileId, date: data.date, time: data.time, provider: data.provider, purpose: data.purpose, questions: data.questions, notes: data.notes, createdAt: now() };
    await db.appointments.add(a);
    syncSubDoc(a.profileId, 'appointments', a.id, a as any);
    return a;
  }
  async getAppointment(appointmentId: string): Promise<AppointmentRow> {
    const a = await db.appointments.get(appointmentId);
    if (!a) throw new ApiError(404, '/errors/not-found', 'Appointment not found');
    return a;
  }
  async patchAppointment(appointmentId: string, updates: Partial<AppointmentRow>): Promise<AppointmentRow> {
    await db.appointments.update(appointmentId, updates);
    const a = await db.appointments.get(appointmentId);
    if (!a) throw new ApiError(404, '/errors/not-found', 'Appointment not found');
    syncSubDoc(a.profileId, 'appointments', appointmentId, a as any);
    return a;
  }

  // ── REMINDERS ─────────────────────────
  async enqueueReminderReconcile(profileId: string, reason: string): Promise<Job> {
    const job: Job = { id: uid(), type: 'reminder_reconcile', status: 'QUEUED', profileId, payload: JSON.stringify({ reason }), progressPct: 0, createdAt: now(), updatedAt: now() };
    await db.jobs.add(job); return job;
  }

  // ── AUDIT ─────────────────────────────
  async getAuditLog(profileId: string): Promise<{ action: string; timestamp: string }[]> {
    if (!profileId) return [];
    return db.auditEvents.where('profileId').equals(profileId).reverse().sortBy('timestamp');
  }
}

export const api = new LocalApi();
