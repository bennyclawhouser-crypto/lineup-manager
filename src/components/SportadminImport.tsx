import { useState, useRef } from 'react';
import { extractNamesFromImage } from '../lib/ocr';

interface Props {
  existingPlayers: { id: string; first_name: string; last_name_initial: string; full_name: string }[];
  onConfirm: (selectedIds: string[], newNames: string[]) => void;
  onSkip: () => void;
}

export default function SportadminImport({ existingPlayers, onConfirm, onSkip }: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedNames, setDetectedNames] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNew, setSelectedNew] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 2);
    setImages(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  };

  const scan = async () => {
    setScanning(true);
    setProgress(0);
    const allNames: string[] = [];
    for (const file of images) {
      const names = await extractNamesFromImage(file, p => setProgress(p));
      allNames.push(...names);
    }
    setDetectedNames([...new Set(allNames)]);

    // Auto-match against existing players
    const matched: string[] = [];
    for (const name of allNames) {
      const parts = name.trim().split(' ');
      const first = parts[0]?.toLowerCase();
      const lastInit = parts[parts.length - 1]?.[0]?.toLowerCase();
      const match = existingPlayers.find(p =>
        p.first_name.toLowerCase() === first ||
        (p.first_name.toLowerCase() === first && p.last_name_initial.toLowerCase().replace('.', '') === lastInit)
      );
      if (match && !matched.includes(match.id)) matched.push(match.id);
    }
    setSelectedIds(matched);
    setSelectedNew(allNames.filter(name => {
      const parts = name.trim().split(' ');
      const first = parts[0]?.toLowerCase();
      return !existingPlayers.some(p => p.first_name.toLowerCase() === first);
    }));
    setScanning(false);
    setStep('review');
  };

  const toggleExisting = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleNew = (name: string) =>
    setSelectedNew(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);

  if (step === 'upload') return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📸</div>
      <h3 style={{ fontWeight: 500, fontSize: 17, color: '#202124', marginBottom: 6 }}>Importera från Sportadmin</h3>
      <p style={{ fontSize: 14, color: '#5f6368', marginBottom: 20, lineHeight: 1.5 }}>
        Ta en skärmdump av närvaro-/anmälningslistan i Sportadmin och ladda upp den här.<br />
        Du kan ladda upp 1–2 bilder.
      </p>

      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)} />

      {previews.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed #dadce0', borderRadius: 8, padding: '32px 20px',
            cursor: 'pointer', marginBottom: 16, background: '#fafafa',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div style={{ color: '#1a73e8', fontWeight: 500 }}>Välj bild(er)</div>
          <div style={{ color: '#9aa0a6', fontSize: 13, marginTop: 4 }}>eller dra och släpp hit</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {previews.map((src, i) => (
            <img key={i} src={src} alt="" style={{ height: 120, borderRadius: 6, border: '1px solid #dadce0', objectFit: 'cover' }} />
          ))}
          <div onClick={() => inputRef.current?.click()} style={{ width: 80, height: 120, border: '2px dashed #dadce0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9aa0a6', fontSize: 24 }}>+</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button style={textBtn} onClick={onSkip}>Hoppa över</button>
        {previews.length > 0 && (
          <button style={primaryBtn} onClick={scan} disabled={scanning}>
            {scanning ? `Skannar... ${progress}%` : 'Skanna bilder'}
          </button>
        )}
      </div>
    </div>
  );

  // Review step
  return (
    <div>
      <h3 style={{ fontWeight: 500, fontSize: 17, color: '#202124', marginBottom: 4 }}>Granska spellista</h3>
      <p style={{ fontSize: 13, color: '#5f6368', marginBottom: 16 }}>
        {selectedIds.length + selectedNew.length} spelare hittades. Justera om något är fel.
      </p>

      {/* Existing matched */}
      {existingPlayers.length > 0 && (
        <>
          <div style={sectionLabel}>Spelare i truppen</div>
          {existingPlayers.map(p => (
            <label key={p.id} style={checkRow(selectedIds.includes(p.id))}>
              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleExisting(p.id)} />
              <span>{p.first_name} {p.last_name_initial}</span>
            </label>
          ))}
        </>
      )}

      {/* New names from OCR not in roster */}
      {detectedNames.filter(n => !existingPlayers.some(p => p.first_name.toLowerCase() === n.split(' ')[0].toLowerCase())).length > 0 && (
        <>
          <div style={{ ...sectionLabel, marginTop: 12 }}>Nya namn från bilden</div>
          <p style={{ fontSize: 12, color: '#5f6368', marginBottom: 6 }}>Dessa läggs till som nya spelare i truppen.</p>
          {detectedNames
            .filter(n => !existingPlayers.some(p => p.first_name.toLowerCase() === n.split(' ')[0].toLowerCase()))
            .map(name => (
              <label key={name} style={checkRow(selectedNew.includes(name))}>
                <input type="checkbox" checked={selectedNew.includes(name)} onChange={() => toggleNew(name)} />
                <span>{name}</span>
              </label>
            ))}
        </>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button style={textBtn} onClick={() => setStep('upload')}>← Tillbaka</button>
        <button style={primaryBtn} onClick={() => onConfirm(selectedIds, selectedNew)}>
          Bekräfta ({selectedIds.length + selectedNew.length} spelare)
        </button>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4,
  padding: '8px 20px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
};
const textBtn: React.CSSProperties = {
  background: 'none', color: '#5f6368', border: 'none',
  padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
};
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase',
  letterSpacing: '0.8px', marginBottom: 6,
};
const checkRow = (checked: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
  borderRadius: 4, cursor: 'pointer', marginBottom: 2,
  background: checked ? '#e8f0fe' : 'transparent',
  fontSize: 14, color: '#202124',
});
