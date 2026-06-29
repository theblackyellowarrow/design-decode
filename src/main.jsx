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
        <nav className="landing-nav">
          <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>dotai</a>
          <div className="nav-links">
            <a href="#tool" className="nav-link">Tool</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#enterprise" className="nav-link">Enterprise</a>
            <a href="#" className="nav-link nav-home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>↑ Home</a>
          </div>
        </nav>

        <div className="landing-hero">
          <div className="landing-grid" />
          <div className="landing-content">
            <p className="landing-eyebrow">dotai presents</p>
            <h1 className="landing-title">Design Dec<span className="landing-o">o</span>de</h1>
            <p className="landing-sub">A Critical Design Reading Environment</p>
            <p className="landing-desc">Design is rarely read from a single point of view. Every poster, interface, publication, object, exhibition, package, or spatial intervention carries formal decisions, cultural assumptions, production histories, patterns of interaction, and systems of meaning. Design Decode brings these perspectives together within a single environment for critical reading.</p>
            <p className="landing-desc">Built for designers, educators, researchers, students, curators, studios, and cultural practitioners.</p>
            <p className="landing-meta"><span className="landing-meta-highlight">5 free analyses</span> or add your OpenAI key for unlimited use</p>
            <button type="button" className="landing-cta" onClick={() => setShowLanding(false)}>Begin a Reading</button>
            <button type="button" className="landing-key-link" onClick={() => { setShowLanding(false); setShowKeyPrompt(true); }}>I have my own key</button>
          </div>
        </div>

        <section className="landing-about">
          <div className="landing-section">
            <h2>Built Around Critique</h2>
            <p>Design Decode grows from the culture of design studios, seminars, juries, and research rather than automated evaluation. It develops multiple readings of the same work instead of producing a single judgement. Every response separates what can be directly observed from what must be interpreted, and clearly indicates where conclusions extend into informed inference. Each reading can also generate a new set of critical questions, encouraging discussion, reflection, and further enquiry rather than closing interpretation. Design Decode is intended to support the practice of looking carefully.</p>
          </div>

          <div className="landing-section" id="tool">
            <h2>The Tool</h2>
            <p>Upload a design image and select up to three analytical lenses. Readings are generated independently for each lens, allowing different disciplinary perspectives to exist alongside one another rather than collapsing into a single summary. Choose between Standard and Expert reading modes depending on the depth of analysis required. Every session can be exported as Markdown, preserving observations, interpretations, critical questions, and contextual notes for teaching, research, documentation, or collaborative review.</p>
          </div>

          <div className="landing-section">
            <h2>Five Analytical Lenses</h2>
            <div className="lens-list">
              <div className="lens-item"><strong>Visual Form</strong><span>Composition, hierarchy, rhythm, typography, colour, Gestalt, proportion, and visual language.</span></div>
              <div className="lens-item"><strong>User Flow</strong><span>Navigation, affordance, information architecture, cognitive load, accessibility, and patterns of interaction.</span></div>
              <div className="lens-item"><strong>Symbol Logic</strong><span>Semiotics, visual rhetoric, metaphor, denotation, connotation, and cultural codes.</span></div>
              <div className="lens-item"><strong>Production Logic</strong><span>Materiality, manufacture, sustainability, labour, lifecycle, and the conditions through which objects come into being.</span></div>
              <div className="lens-item"><strong>Cultural Lens</strong><span>Identity, power, class, caste, gender, race, disability, sexuality, region, and the wider social structures reflected within design.</span></div>
            </div>
          </div>

          <div className="landing-section">
            <h2>Reading Modes</h2>
            <div className="mode-list">
              <div className="mode-item"><strong>Standard</strong><span>Focused, concise readings for studio discussions, classroom critique, and everyday design practice.</span></div>
              <div className="mode-item"><strong>Expert</strong><span>Extended readings with richer historical, theoretical, and disciplinary context for advanced teaching, research, and professional critique.</span></div>
            </div>
          </div>

          <div className="landing-section" id="about">
            <h2>About dotai</h2>
            <p className="about-tagline">The AI_Line_ment for India Starts Here.</p>
            <p>dotai is an independent design research and technology practice building context-first computational tools for India. We believe that software should grow from disciplines, communities, languages, archives, and ways of working rather than asking people to adapt themselves to generic systems. Every project begins with a question emerging from design, education, research, or cultural practice, then develops into software shaped by that context.</p>
            <p>Our work spans critical design, creative education, archival research, translation, publishing, knowledge systems, and experimental product development. From studio classrooms to museums, independent researchers to creative businesses, dotai develops tools that make specialised knowledge more accessible, more collaborative, and easier to work with.</p>
            <p>Design Decode is one part of a growing ecosystem that includes research environments, translation platforms, creative playgrounds, contextual assistants, and publishing tools designed for Indian practitioners and global conversations alike.</p>
            <p className="about-subhead">Explore dotai</p>
            <div className="about-links">
              <a href="https://dotai.org/" target="_blank" rel="noopener noreferrer">Website</a>
              <a href="https://www.linkedin.com/in/theblackyellowarrow/" target="_blank" rel="noopener noreferrer">Founder</a>
              <a href="https://www.linkedin.com/company/dotaitechnodrome" target="_blank" rel="noopener noreferrer">Follow dotai</a>
            </div>
            <p className="about-subhead">Founder</p>
            <p>Rahul Bhattacharya is a design educator, curator, researcher, and writer working at the intersection of design, technology, and cultural practice. His work explores how computational systems can be shaped through disciplinary knowledge, critical pedagogy, and local context.</p>
          </div>

          <div className="landing-section" id="enterprise">
            <h2>Enterprise</h2>
            <p>Design Decode can be adapted for universities, museums, research groups, studios, publishers, and cultural organisations. Custom deployments can include discipline-specific reading frameworks, institutional terminology, archive workflows, curriculum integration, branded environments, and bespoke analytical lenses. If your organisation is interested in developing a customised version, we would be pleased to begin a conversation.</p>
            <form className="enterprise-form" id="enterprise-form">
              <div className="form-row">
                <input name="name" placeholder="Your name" required className="form-input" />
                <input name="org" placeholder="Organisation" required className="form-input" />
              </div>
              <input name="email" type="email" placeholder="Email address" required className="form-input" />
              <textarea name="msg" placeholder="Tell us about your scale, use case, and customisation needs" required className="form-input" rows="3" />
              <button type="button" className="landing-cta" style={{padding: '10px 32px', fontSize: '0.85rem'}} onClick={() => {
                const form = document.getElementById('enterprise-form');
                if (!form.checkValidity()) { form.reportValidity(); return; }
                const fd = new FormData(form);
                const name = fd.get('name') || '';
                const org = fd.get('org') || '';
                const email = fd.get('email') || '';
                const msg = fd.get('msg') || '';
                const subject = encodeURIComponent(`Design Decode Enterprise - ${org || name}`);
                const body = encodeURIComponent(`Name: ${name}\nOrganisation: ${org}\nEmail: ${email}\n\n${msg}`);
                window.location.href = `mailto:theblackyellowarrow@gmail.com?subject=${subject}&body=${body}`;
              }}>Send request</button>
            </form>
          </div>

          <div className="landing-section" style={{textAlign: 'center', color: 'var(--grey)', fontSize: '0.78rem', paddingTop: '40px', borderTop: '1px solid var(--shadow)'}}>
            <p>Built by dotai.</p>
          </div>
        </section>
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
