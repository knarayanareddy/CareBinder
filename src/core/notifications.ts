import { db } from './db';
import { getNextOccurrence } from './api';

// ── Preference helpers (persisted to localStorage) ──────────────────────────

export function getNotifPref(key: string): boolean {
  return localStorage.getItem(`cb_notif_${key}`) !== '0';
}

export function setNotifPref(key: string, val: boolean): void {
  localStorage.setItem(`cb_notif_${key}`, val ? '1' : '0');
}

// ── Scheduling ───────────────────────────────────────────────────────────────

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function clearAllReminders(): void {
  activeTimers.forEach(clearTimeout);
  activeTimers.clear();
}

export async function scheduleReminders(profileId: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!getNotifPref('doses')) return;

  clearAllReminders();

  const meds = await db.medications
    .where('profileId').equals(profileId)
    .filter(m => m.status === 'active' && !m.asNeeded)
    .toArray();

  const schedules = await db.medSchedules.toArray();

  for (const med of meds) {
    const sched = schedules.find(s => s.medicationId === med.id);
    if (!sched || !sched.times.length) continue;

    const next = getNextOccurrence(sched.times, sched.days);
    if (!next) continue;

    const delay = next.getTime() - Date.now();
    if (delay <= 0 || delay > 86_400_000) continue; // Only within next 24 h

    const timer = setTimeout(async () => {
      try {
        new Notification(`Time for ${med.displayName}`, {
          body: [med.strength, med.instructions].filter(Boolean).join(' — '),
          icon: '/pwa-192x192.png',
          tag: `carebinder-med-${med.id}`,
          requireInteraction: true,
        });
      } catch { /* Notification blocked at OS level */ }
      activeTimers.delete(med.id);
      // Reschedule so the next occurrence is queued
      await scheduleReminders(profileId);
    }, delay);

    activeTimers.set(med.id, timer);
  }
}

// Request permission then immediately schedule — returns whether permission granted
export async function requestAndSchedule(profileId: string): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'denied') return false;

  if (Notification.permission !== 'granted') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return false;
  }

  setNotifPref('doses', true);
  await scheduleReminders(profileId);
  return true;
}
