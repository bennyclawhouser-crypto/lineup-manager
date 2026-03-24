import { useState } from 'react';
import html2canvas from 'html2canvas';

interface Props {
  targetId: string;   // id of element to screenshot
  filename?: string;
}

export default function ExportButton({ targetId, filename = 'uppställning' }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#f8f9fa',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      title="Exportera som bild"
      style={{
        background: 'none', border: '1px solid #dadce0', borderRadius: 20,
        padding: '5px 14px', cursor: 'pointer', fontSize: 13,
        color: '#5f6368', fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: exporting ? 0.6 : 1,
      }}
    >
      {exporting ? '⏳' : '📷'} {exporting ? 'Exporterar...' : 'Spara bild'}
    </button>
  );
}
