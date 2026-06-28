import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { analysisMethods } from './lib/analysisMethods.js';
import { compressImage } from './lib/imageCompression.js';
import { exportSingleLens } from './lib/markdownExport.js';
import './styles.css';

function ResultText({ text }) {
  return <div className="result-text">{text}</div>;
}

const lensBadge = {
  visual_formal_composition: 'vf',
  interaction_ux_behaviour: 'ux',
  semiotic_messaging_layer: 'sem',
  production_logic: 'prod',
  cultural_political_meaning: 'cult'
};

function App() {
  const [image, setImage] = useState(null);
  const [context, setContext] = useState('');
  const [mode, setMode] = useState('standard');
  const [selected, setSelected] = useState('visual_formal_composition');
  const [results, setResults] = useState({});
  const [status, setStatus] = useState({});
  const [questions, setQuestions] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState({});
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

  function selectMethod(key) {
    setSelected(key);
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
    setQuestions({});
    setQuestionsLoading({});
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelected('visual_formal_composition');
  }

  async function runAnalysis() {
    if (!image) {
      setError('Upload an image before running a decode.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError('');
    setResults({});
    setStatus({ [selected]: 'loading' });

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ methodKey: selected, imageBase64: image.base64, mimeType: image.mimeType, context, mode })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Request failed with HTTP ${response.status}`);
      setResults({ [selected]: payload.result });
      setStatus({ [selected]: 'done' });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setResults({ [selected]: err.message || 'Analysis failed.' });
      setStatus({ [selected]: 'error' });
    }
  }

  async function fetchCriticalQuestions() {
    setQuestionsLoading({ [selected]: true });
    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodKey: 'suggest_critical_questions', imageBase64: image.base64, mimeType: image.mimeType, context, mode })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to load questions.');
      setQuestions({ [selected]: payload.result });
    } catch {
      setQuestions({ [selected]: 'Could not generate questions.' });
    }
    setQuestionsLoading({ [selected]: false });
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">dotai presents</p>
        <h1>Design Decode</h1>
        <p>Image analysis tool for designers</p>
      </header>

      <section className="panel grid">
        <div className="controls">
          <div className="mode-selector" aria-label="Pedagogy mode">
            <span>Mode</span>
            <div className="mode-options">
              {['standard', 'expert'].map((m) => (
                <button
                  type="button"
                  key={m}
                  className={mode === m ? 'mode-btn selected' : 'mode-btn'}
                  onClick={() => setMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="method-grid" aria-label="Decode lenses">
            {analysisMethods.map((method) => (
              <label
                key={method.key}
                className={selected === method.key ? 'method selected' : 'method'}
              >
                <input
                  type="radio"
                  name="lens"
                  value={method.key}
                  checked={selected === method.key}
                  onChange={() => selectMethod(method.key)}
                  className="method-radio"
                />
                <span className="method-label">{method.name}</span>
                {method.inferential ? <small> inference-heavy</small> : null}
              </label>
            ))}
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button type="button" className="primary" onClick={runAnalysis}>Run selected decode</button>
            <button type="button" className="secondary" onClick={clearAll}>Clear</button>
            <button type="button" className="secondary" onClick={() => abortRef.current?.abort()}>Cancel</button>
          </div>
        </div>

        <div className={image ? 'preview' : 'preview preview-empty'} onClick={() => !image && fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="preview-input" />
          {image ? <img src={image.preview} alt={`Uploaded design: ${image.name}`} /> : <div className="placeholder">Upload an image to begin.</div>}
        </div>
      </section>

      <section className="results">
        {(() => {
          const key = selected;
          const method = analysisMethods.find((item) => item.key === key);
          const state = status[key];
          const text = results[key];
          return (
            <article className="result-card" key={key} data-lens={key}>
              <div className="result-head">
                <h2>{method?.name || key}</h2>
                <div className="result-head-right">
                  {state === 'loading' ? <span className="spinner">analysing</span> : null}
                  {state === 'error' ? <span className="failed">failed</span> : null}
                  <span className={`lens-badge ${lensBadge[key] || ''}`}>{method?.name || key}</span>
                </div>
              </div>
              {method?.inferential ? <p className="note">This lens can exceed visible evidence. Treat unsupported claims as inference.</p> : null}
              {text ? <ResultText text={text} /> : <p className="empty">Run the decode to generate this reading.</p>}
              {text ? (
                <div className="result-actions">
                  <button type="button" className="copy" onClick={() => copyText(text)}>Copy text</button>
                  <button type="button" className="copy" onClick={() => exportSingleLens({
                    methodName: method?.name || key, text, imageName: image?.name, context, inferential: method?.inferential
                  })}>Export .md</button>
                </div>
              ) : null}
              {state === 'done' && text ? (
                <div className="questions-section">
                  {!questions[key] && !questionsLoading[key] ? (
                    <div className="questions-prompt">
                      <span>Want to explore critical questions for this lens?</span>
                      <button type="button" className="copy" onClick={fetchCriticalQuestions}>Ask</button>
                    </div>
                  ) : null}
                  {questionsLoading[key] ? (
                    <div className="questions-loading"><span className="spinner">generating questions</span></div>
                  ) : null}
                  {questions[key] ? (
                    <div className="questions-result">
                      <p className="questions-label">Critical Questions</p>
                      <div className="result-text">{questions[key]}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })()}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
