import { useState, useRef } from 'react';
import { extractNamesFromImage } from '../lib/ocr';

interface Props {
  onConfirm: (names: string[]) => void;
  onCancel?: () => void;
  onSkip?: () => void;
  existingPlayers?: { id: string; first_name: string }[];
}

export default function SportadminImport({ onConfirm, onCancel, onSkip }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [editedNames, setEditedNames] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected).slice(0, 2);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  };

  const process = async () => {
    setStep('processing');
    setError('');
    try {
      const allNames: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const found = await extractNamesFromImage(files[i], pct => {
          setProgress(Math.round((i / files.length) * 100 + pct / files.length));
        });
        allNames.push(...found);
      }
      const unique = [...new Set(allNames)];
      if (unique.length === 0) {
        setError('Inga namn hittades. Prova med en tydligare skärmdump eller lägg till manuellt.');
        setStep('upload');
        return;
      }
      setNames(unique);
      setEditedNames(unique);
      setStep('review');
    } catch {
      setError('Något gick fel vid tolkning av bilden.');
      setStep('upload');
    }
  };

  const toggleName = (name: string) => {
    setEditedNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addManual = () => {
    const name = window.prompt('Skriv spelarens fulla namn:');
    if (name?.trim()) setEditedNames(prev => [...prev, name.trim()]);
  };

  return (
    <div style={modalBackdrop} onClick={onCancel}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>

        {step === 'upload' && (
          <>
            <h3 style={title}>📸 Importera från Sportadmin</h3>
            <p style={subtitle}>Ta en skärmdump på anmälningslistan i Sportadmin-appen och ladda upp den här. Du kan ladda upp 1–2 bilder.</p>

            <div
              style={{
                border: '2px dashed #dadce0', borderRadius: 8, padding: '32px 16px',
                textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                background: files.length ? '#f8f9fa' : '#fff',
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)} />
              {files.length === 0 ? (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                  <div style={{ color: '#1a73e8', fontWeight: 500, fontSize: 15 }}>Välj bild(er)</div>
                  <div style={{ color: '#5f6368', fontSize: 13, marginTop: 4 }}>eller dra och släpp hit</div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {previews.map((src, i) => (
                    <img key={i} src={src} style={{ height: 120, borderRadius: 6, objectFit: 'cover' }} />
                  ))}
                </div>
              )}
            </div>

            {error && <p style={{ color: '#E53935', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {onSkip && <button style={textBtn} onClick={onSkip}>Hoppa över</button>}
              <button style={textBtn} onClick={() => onCancel?.()}>Avbryt</button>
              <button style={{ ...containedBtn, opacity: files.length ? 1 : 0.5 }}
                disabled={!files.length} onClick={process}>
                Läs av bilder
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
            <div style={{ fontWeight: 500, color: '#202124', marginBottom: 12 }}>Läser av bilderna...</div>
            <div style={{ background: '#f1f3f4', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#1a73e8', transition: 'width 0.3s', borderRadius: 4 }} />
            </div>
            <div style={{ color: '#5f6368', fontSize: 13, marginTop: 8 }}>{progress}%</div>
          </div>
        )}

        {step === 'review' && (
          <>
            <h3 style={title}>✅ Hittade spelare</h3>
            <p style={subtitle}>Avmarkera felaktiga namn och lägg till dem som saknas.</p>

            <div style={{ border: '1px solid #dadce0', borderRadius: 6, maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
              {names.map((name, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                  borderTop: i > 0 ? '1px solid #f1f3f4' : 'none', cursor: 'pointer',
                  background: editedNames.includes(name) ? '#e8f0fe' : 'transparent',
                }}>
                  <input type="checkbox" checked={editedNames.includes(name)} onChange={() => toggleName(name)} />
                  <span style={{ fontSize: 14, color: '#202124' }}>{name}</span>
                </label>
              ))}
            </div>

            <button style={{ ...textBtn, color: '#1a73e8', marginBottom: 16 }} onClick={addManual}>
              + Lägg till manuellt
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#5f6368' }}>{editedNames.length} spelare valda</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={textBtn} onClick={() => setStep('upload')}>← Tillbaka</button>
                <button style={{ ...containedBtn, opacity: editedNames.length ? 1 : 0.5 }}
                  disabled={!editedNames.length} onClick={() => onConfirm(editedNames)}>
                  Använd dessa
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 };
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 8, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 38px rgba(0,0,0,0.14)' };
const title: React.CSSProperties = { margin: '0 0 8px', fontWeight: 500, fontSize: 18, color: '#202124' };
const subtitle: React.CSSProperties = { margin: '0 0 20px', fontSize: 14, color: '#5f6368', lineHeight: 1.5 };
const containedBtn: React.CSSProperties = { background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: 'pointer', fontWeight: 500, fontSize: 14 };
const textBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', fontWeight: 500, fontSize: 14, padding: '8px 12px' };
