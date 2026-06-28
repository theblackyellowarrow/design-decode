import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { analysisMethods } from './lib/analysisMethods.js';
import { compressImage } from './lib/imageCompression.js';
import './styles.css';

function ResultText({ text }) {
  return <pre className="result-text">{text}</pre>;
}

function App() {
  const [image, setImage] = useState(null);
  const [context, setContext] = useState('');
  const [selected, setSelected] = useState(['visual_formal_composition']);
  const [results, setResults] = useState({});
  const [status, setStatus] = useState({});
  const [error, setError] = useState('');
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Upload an image file: JPG, PNG, GIF, or WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError('This image is larger than 6 MB. Compress it before testing.');
      event.target.value = '';
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    let compressed;
    try {
      compressed = await compressImage(file);
    } catch {
      setError('Could not read or compress the image. Try a different file.');
      event.target.value = '';
      return;
    }
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setImage({ base64: compressed.base64, mimeType: compressed.mimeType, name: file.name, preview });
    setResults({});
    setStatus({});
  }

  function toggleMethod(key) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function clearAll() {
    abortRef.current?.abort();
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setImage(null);
    setContext('');
    setResults({});
    setStatus({});
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function runAnalysis() {
    if (!image) {
      setError('Upload an image before running a decode.');
      return;
    }
    if (!selected.length) {
      setError('Select at least one decode lens.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError('');
    setResults({});
    setStatus(Object.fromEntries(selected.map((key) => [key, 'loading'])));

    await Promise.allSettled(selected.map(async (methodKey) => {
      try {
        const response = await fetch('/api/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ methodKey, imageBase64: image.base64, mimeType: image.mimeType, context })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Request failed with HTTP ${response.status}`);
        setResults((current) => ({ ...current, [methodKey]: payload.result }));
        setStatus((current) => ({ ...current, [methodKey]: 'done' }));
      } catch (err) {
        if (err.name === 'AbortError') return;
        setResults((current) => ({ ...current, [methodKey]: err.message || 'Analysis failed.' }));
        setStatus((current) => ({ ...current, [methodKey]: 'error' }));
      }
    }));
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">critical image reading prototype</p>
        <h1>Design Decode</h1>
        <p>Upload a design image. Read it through formal, experiential, semiotic, production, and cultural lenses.</p>
      </header>

      <section className="panel grid">
        <div className="controls">
          <label className="field">
            <span>Upload design work</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} />
          </label>

          <label className="field">
            <span>Context, optional</span>
            <textarea value={context} onChange={(event) => setContext(event.target.value)} maxLength="1200" placeholder="Brief, audience, medium, site, assignment, or intended use." />
          </label>

          <div className="method-grid" aria-label="Decode lenses">
            {analysisMethods.map((method) => (
              <button
                type="button"
                key={method.key}
                className={selected.includes(method.key) ? 'method selected' : 'method'}
                onClick={() => toggleMethod(method.key)}
              >
                {method.name}
                {method.inferential ? <small> inference-heavy</small> : null}
              </button>
            ))}
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button type="button" className="primary" onClick={runAnalysis}>Run selected decode</button>
            <button type="button" className="secondary" onClick={clearAll}>Clear</button>
            <button type="button" className="secondary" onClick={() => abortRef.current?.abort()}>Cancel</button>
          </div>
        </div>

        <div className="preview">
          {image ? <img src={image.preview} alt={`Uploaded design: ${image.name}`} /> : <div className="placeholder">Upload an image to begin.</div>}
        </div>
      </section>

      <section className="results">
        {selected.map((key) => {
          const method = analysisMethods.find((item) => item.key === key);
          const state = status[key];
          const text = results[key];
          return (
            <article className="result-card" key={key}>
              <div className="result-head">
                <h2>{method?.name || key}</h2>
                {state === 'loading' ? <span className="spinner">analysing</span> : null}
                {state === 'error' ? <span className="failed">failed</span> : null}
              </div>
              {method?.inferential ? <p className="note">This lens can exceed visible evidence. Treat unsupported claims as inference.</p> : null}
              {text ? <ResultText text={text} /> : <p className="empty">Run the decode to generate this reading.</p>}
              {text ? <button type="button" className="copy" onClick={() => copyText(text)}>Copy text</button> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
