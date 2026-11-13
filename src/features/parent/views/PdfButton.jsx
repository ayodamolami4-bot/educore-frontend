import React, { useRef, useState } from 'react';
import { Button, Notice } from '../../../components/Controls.jsx';
import { useServices } from '../../../core/ServicesContext.jsx';
import { errorMessage } from '../../../api/errors.js';
import { deliverPdf } from './paymentDocuments.js';

export function PdfButton({ title, filename, getDocument }) {
  const { config, session } = useServices();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    if (pending.current) return;
    const scope = session.getSnapshot().scopeVersion;
    const active = () => scope === session.getSnapshot().scopeVersion;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const pdf = await getDocument();
      await deliverPdf(pdf, filename, active);
    } catch (failure) {
      if (active()) setError(errorMessage(failure));
    } finally {
      pending.current = false;
      if (active()) setBusy(false);
    }
  }
  if (config.demo) return null;
  return (
    <>
      <Button
        title={title}
        variant="secondary"
        icon="download-outline"
        loading={busy}
        onPress={() => void open()}
      />
      <Notice text={error} tone="error" />
    </>
  );
}
