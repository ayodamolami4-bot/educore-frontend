import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { localError } from '../../../api/errors.js';

function readBytes(blob) {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function deliverPdf(blob, filename, active) {
  if (blob.type !== 'application/pdf' || blob.size === 0)
    throw localError('The school did not return a PDF. Try again.');
  if (!active()) return;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw localError('This device could not open the PDF sharing menu.');
  const contents = await readBytes(blob);
  if (!active()) return;
  const file = new File(Paths.cache, filename);
  try {
    file.create({ overwrite: true });
    await file.write(contents);
    if (active())
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } finally {
    if (file.exists) file.delete();
    blob.close?.();
  }
}
