import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { analysisMethods } from './lib/analysisMethods.js';
import { compressImage } from './lib/imageCompression.js';
import { exportSingleLens, exportFullSession } from './lib/markdownExport.js';
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
  const [showLanding, setShowLanding] = useState(true);
  const [image, setImage] = useState(null);
  const [context, setContext] = useState('');
  const [mode, setMode] = useState('standard');
  const [selected, setSelected] = useState(['visual_formal_composition']);
  const MAX_LENSES = 3;
  const [results, setResults] = useState({});
  const [status, setStatus] = useState({});
  const [questions, setQuestions] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState({});
  const [error, setError] = useState('');
  const [usageCount, setUsageCount] = useState(() => Number(localStorage.getItem('dd_usage') || 0));
  const [userKey, setUserKey] = useState(() => localStorage.getItem('dd_key') || '');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [keyInput, setKeyInput] = useState('');
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
    setSelected((current) => {
      if (current.includes(key)) return current.filter((k) => k !== key);
      if (current.length >= MAX_LENSES) return current;
      return [...current, key];
    });
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
    setSelected(['visual_formal_composition']);
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
    if (!userKey && usageCount >= 5) {
      setShowKeyPrompt(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError('');
    setResults({});
    setQuestions({});
    setQuestionsLoading({});
    setStatus(Object.fromEntries(selected.map((key) => [key, 'loading'])));

    await Promise.allSettled(selected.map(async (methodKey) => {
      try {
        const response = await fetch('/api/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ methodKey, imageBase64: image.base64, mimeType: image.mimeType, context, mode, apiKey: userKey || undefined })
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

    if (!userKey) {
      const next = Math.min(usageCount + 1, 99);
      setUsageCount(next);
      localStorage.setItem('dd_usage', String(next));
    }
  }

  async function fetchCriticalQuestions(methodKey) {
    if (!userKey && usageCount >= 5) {
      setShowKeyPrompt(true);
      return;
    }
    setQuestionsLoading((c) => ({ ...c, [methodKey]: true }));
    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodKey: 'suggest_critical_questions', imageBase64: image.base64, mimeType: image.mimeType, context, mode, apiKey: userKey || undefined })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to load questions.');
      setQuestions((c) => ({ ...c, [methodKey]: payload.result }));
    } catch {
      setQuestions((c) => ({ ...c, [methodKey]: 'Could not generate questions.' }));
    }
    setQuestionsLoading((c) => ({ ...c, [methodKey]: false }));
  }

  function saveKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    localStorage.setItem('dd_key', trimmed);
    setUserKey(trimmed);
    setShowKeyPrompt(false);
    setKeyInput('');
    setError('');
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
  }

  if (showLanding) {
    return (
      <main className="landing">
        <div className="landing-grid" />
        <div className="landing-content">
          <p className="landing-eyebrow">dotai presents</p>
          <h1 className="landing-title">Design Dec<span className="landing-o">o</span>de</h1>
          <p className="landing-sub">A critical image analysis tool that reads design through formal, UX, semiotic, production, and cultural lenses.</p>
          <p className="landing-desc">Upload any design image. Choose a lens. Get a sharp, evidence-grounded reading — not generic praise, not AI slop. Built for designers who think.</p>
          <p className="landing-meta">5 free analyses • or add your OpenAI key for unlimited use</p>
          <button type="button" className="landing-cta" onClick={() => setShowLanding(false)}>Start Now</button>
          <button type="button" className="landing-key-link" onClick={() => { setShowLanding(false); setShowKeyPrompt(true); }}>I have my own key</button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      {showKeyPrompt ? (
        <div className="key-overlay" onClick={(e) => e.target === e.currentTarget && setShowKeyPrompt(false)}>
          <div className="key-modal">
            <p className="key-modal-title">Enter your OpenAI API key</p>
            <p className="key-modal-desc">You have used your 5 free analyses. To continue, add your own OpenAI API key. It is sent only to the server for this session and never stored by us.</p>
            <input
              type="password"
              className="key-input"
              placeholder="sk-proj-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveKey()}
            />
            <div className="key-actions">
              <button type="button" className="primary" onClick={saveKey}>Save &amp; continue</button>
              <button type="button" className="secondary" onClick={() => setShowKeyPrompt(false)}>Cancel</button>
            </div>
            <p className="key-meta">Your key is held in browser storage only. It travels to the server with each request and is not logged or retained.</p>
          </div>
        </div>
      ) : null}
      <header className="hero">
        <button type="button" className="home-btn" onClick={() => setShowLanding(true)} aria-label="Home">← dotai</button>
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

          <div className="usage-info">
            <div className="usage-status">
              {userKey ? (
                <span className="usage-key">Your key is active</span>
              ) : (
                <span className="usage-count">{5 - usageCount} free analysis runs remaining</span>
              )}
            </div>
            {!userKey ? (
              <button type="button" className="usage-add-key" onClick={() => setShowKeyPrompt(true)}>+ Add your OpenAI key</button>
            ) : (
              <button type="button" className="usage-add-key" onClick={() => { localStorage.removeItem('dd_key'); setUserKey(''); setUsageCount(0); localStorage.setItem('dd_usage', '0'); }}>Remove key</button>
            )}
          </div>

          <div className="method-grid" aria-label="Decode lenses">
            <p className="lens-hint">Choose up to {MAX_LENSES} lenses</p>
            {analysisMethods.map((method) => {
              const isSelected = selected.includes(method.key);
              const isMaxed = selected.length >= MAX_LENSES && !isSelected;
              return (
                <label
                  key={method.key}
                  className={isSelected ? 'method selected' : isMaxed ? 'method method-disabled' : 'method'}
                >
                  <input
                    type="checkbox"
                    value={method.key}
                    checked={isSelected}
                    disabled={isMaxed}
                    onChange={() => toggleMethod(method.key)}
                    className="method-checkbox"
                  />
                  <span className="method-label">{method.name}</span>
                  {method.inferential ? <small> inference-heavy</small> : null}
                </label>
              );
            })}
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
        {Object.values(status).some((s) => s === 'done') ? (
          <div className="results-toolbar">
            <button type="button" className="secondary" onClick={() => exportFullSession({
              results, methods: analysisMethods, imageName: image?.name, context, selected
            })}>Export session .md</button>
          </div>
        ) : null}
        {selected.map((key) => {
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
                      <span>Explore critical questions for this lens?</span>
                      <button type="button" className="copy" onClick={() => fetchCriticalQuestions(key)}>Ask</button>
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
        })}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
