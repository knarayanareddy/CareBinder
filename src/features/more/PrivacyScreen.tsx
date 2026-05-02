import { Modal } from '../../designsystem';

export function PrivacyScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Privacy Policy">
      <div className="space-y-4 text-sm text-gray-700">
        <p className="text-xs text-gray-400">Last updated: 2025</p>

        <section>
          <h3 className="font-semibold text-gray-900 mb-1">What we collect</h3>
          <p>CareBinder stores health information you enter — medication schedules, health records, emergency card data, and care team relationships — locally on your device. This data never leaves your device except when you explicitly share it with care team members you invite.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-1">How we store it</h3>
          <p>Document files are encrypted with AES-256-GCM before being stored in your browser's local database. Encryption keys are generated on your device and never transmitted anywhere.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-1">What we do not do</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>We do not sell your health data</li>
            <li>We do not share data with third parties without your explicit consent</li>
            <li>We do not log medication names, diagnoses, or document contents to analytics</li>
            <li>We do not track your location</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-1">Notifications</h3>
          <p>Medication reminder notifications are scheduled locally on your device. We do not use a third-party push service for reminders.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-1">Your rights</h3>
          <p>You can export all your data at any time via <strong>More → Export Data</strong>. You can permanently delete all data via <strong>More → Settings → Wipe All Data</strong>.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-1">Contact</h3>
          <p>Privacy questions: <span className="text-[#1B6B4A] font-medium">privacy@carebinder.app</span></p>
        </section>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs text-amber-800 font-medium">Demonstration app notice</p>
          <p className="text-xs text-amber-700 mt-1">A production release would include a full legally-reviewed privacy policy compliant with CCPA, GDPR, and HIPAA where applicable.</p>
        </div>
      </div>
    </Modal>
  );
}
