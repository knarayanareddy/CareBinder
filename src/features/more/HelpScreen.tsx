import { Modal } from '../../designsystem';

const faqs = [
  { q: 'How do I add a medication?', a: 'Go to the Meds tab and tap the "+" button. Fill in the name, strength, and schedule times.' },
  { q: 'How do I record a dose?', a: 'On the Today tab, tap Taken/Snooze/Skip on the Next Dose card, or open a medication and log from there.' },
  { q: 'How do I upload a health record?', a: 'Go to Records tab, tap "+", fill in the details and select a file (PDF or image). It will be encrypted and stored locally.' },
  { q: 'Can I share access with family?', a: 'Yes! Go to Care Team tab, tap Invite, and send an invite by email or phone. Choose Viewer, Contributor, or Manager role.' },
  { q: 'Does the Emergency Card work offline?', a: 'Yes. Once you\'ve viewed the Emergency Card, it\'s cached locally and accessible without internet.' },
  { q: 'Is my data secure?', a: 'All records are encrypted with AES-256-GCM before storage. Encryption keys are stored locally on your device.' },
  { q: 'How do I export my data?', a: 'Go to More → Export Data to download your profiles, medications, and records as a JSON file.' },
  { q: 'Who can see my health data?', a: 'Only you and the care team members you invite. You control their permission level at any time.' },
];

export function HelpScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Help & FAQ">
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-gray-100 pb-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">{faq.q}</h4>
            <p className="text-sm text-gray-500">{faq.a}</p>
          </div>
        ))}
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-800 font-medium">Need more help?</p>
          <p className="text-xs text-blue-600 mt-1">Contact support@carebinder.app</p>
        </div>
      </div>
    </Modal>
  );
}
