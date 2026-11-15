import React, { useState, useRef, useCallback } from 'react';
import { AnalysisResult } from './types';
import './styles.css';

// ─── Utility ────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const getAlignmentLabel = (score: number): string => {
  if (score >= 80) return 'Strong Match';
  if (score >= 60) return 'Moderate Match';
  if (score >= 40) return 'Potential Match';
  return 'Low Match';
};

const formatEvidenceCategory = (cat?: string): string => {
  switch (cat) {
    case 'work_experience':       return 'Work Experience';
    case 'projects':              return 'Projects';
    case 'education_certification': return 'Education & Certifications';
    case 'skills_list':           return 'Skills Inventory';
    default:                      return 'Document Text';
  }
};

const VALID_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const validateFile = (file: File, maxMB: number): string | null => {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!VALID_EXTENSIONS.includes(ext)) return `Unsupported format: ${ext}`;
  if (file.size > maxMB * 1024 * 1024) return `Exceeds ${maxMB} MB limit`;
  return null;
};

// ─── App ─────────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  // ── Persistent inputs (survive NEXT) ──────────────────────────────────────
  const [jdFile, setJdFile]   = useState<File | null>(null);
  const [jdText, setJdText]   = useState<string>('');
  const [method, setMethod]   = useState<string>('auto');

  // ── Per-candidate inputs ───────────────────────────────────────────────────
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [jdDragOver, setJdDragOver]         = useState(false);
  const [resumeDragOver, setResumeDragOver] = useState(false);
  const [showTerminal, setShowTerminal]     = useState(false);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  // ── Analysis ───────────────────────────────────────────────────────────────
  const [loading, setLoading]             = useState(false);
  const [stageText, setStageText]         = useState('');
  const [stageProgress, setStageProgress] = useState(0);
  const [result, setResult]               = useState<AnalysisResult | null>(null);
  const [copyFeedback, setCopyFeedback]   = useState(false);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef     = useRef<HTMLInputElement>(null);

  // JD interaction: single click/file picker, double click/tap -> terminal
  const jdClickCount = useRef(0);
  const jdClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jdTouchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jdLastTouchTime = useRef(0);

  const openJdTerminal = () => {
    setShowTerminal(true);
  };

  const handleJdImageClick = () => {
    jdClickCount.current += 1;
    if (jdClickTimer.current) clearTimeout(jdClickTimer.current);

    jdClickTimer.current = setTimeout(() => {
      const count = jdClickCount.current;
      jdClickCount.current = 0;
      jdClickTimer.current = null;

      if (count >= 2) {
        openJdTerminal();
      } else {
        jdInputRef.current?.click();
      }
    }, 260);
  };

  const handleJdTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    const delta = now - jdLastTouchTime.current;
    jdLastTouchTime.current = now;

    if (delta < 280) {
      e.preventDefault();
      if (jdTouchTimer.current) clearTimeout(jdTouchTimer.current);
      jdTouchTimer.current = null;
      openJdTerminal();
      return;
    }

    if (jdTouchTimer.current) clearTimeout(jdTouchTimer.current);
    jdTouchTimer.current = setTimeout(() => {
      jdInputRef.current?.click();
      jdTouchTimer.current = null;
    }, 260);
  };

  const handleJdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      jdInputRef.current?.click();
    }
    if (e.key === 'F2') {
      e.preventDefault();
      openJdTerminal();
    }
  };

  const handleJdDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setJdDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const err = validateFile(file, 10);
    if (err) { setError(err); return; }
    setJdFile(file);
    setJdText('');
    setError(null);
  }, []);

  const handleJdFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, 10);
    if (err) { setError(err); return; }
    setJdFile(file);
    setJdText('');
    setError(null);
    e.target.value = '';
  };

  // ── Resume image ──────────────────────────────────────────────────────────

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setResumeDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const err = validateFile(file, 25);
    if (err) { setError(err); return; }
    setResumeFile(file);
    setError(null);
  }, []);

  const handleResumeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, 25);
    if (err) { setError(err); return; }
    setResumeFile(file);
    setError(null);
    e.target.value = '';
  };

  const handleResumeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resumeInputRef.current?.click();
    }
  };

  // ── Centre / Analyse ──────────────────────────────────────────────────────

  const hasJd = jdFile !== null || jdText.trim().length > 0;

  const handleCentreClick = () => {
    if (!resumeFile || !hasJd) {
      setError('Upload both resume and job description first.');
      return;
    }
    setShowMethodPicker(true);
  };

  const handleCentreKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCentreClick();
    }
  };

  // ── Run analysis ──────────────────────────────────────────────────────────

  const handleAnalyse = async (chosenMethod: string) => {
    setMethod(chosenMethod);
    setShowMethodPicker(false);

    if (!resumeFile) { setError('Resume is required.'); return; }
    if (!hasJd)      { setError('Job description is required.'); return; }

    setError(null);
    setLoading(true);
    setResult(null);

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => { setStageText('Uploading...'); setStageProgress(20); }, 0));
    timers.push(setTimeout(() => { setStageText('Reading....'); setStageProgress(45); }, 600));
    timers.push(setTimeout(() => { setStageText('Getting concerned with what I am reading.....'); setStageProgress(75); }, 1500));

    const fd = new FormData();
    fd.append('resume_file', resumeFile);
    if (jdFile) fd.append('jd_file', jdFile);
    else        fd.append('jd_text', jdText);
    fd.append('preferred_method', chosenMethod);

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      timers.forEach(clearTimeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Server error (${res.status})`);
      }
      setStageText('Finally....');
      setStageProgress(100);
      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setStageText('');
      setStageProgress(0);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleDownloadPdf = async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error('PDF generation failed.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `TalentLens_Report_${result.request_id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) { alert(e.message); }
  };

  const handleExportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `TalentLens_${result.request_id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleCopySummary = () => {
    if (!result) return;
    const matched = result.matched_skills
      .map(m => m.is_related
        ? `${m.skill} (via ${m.candidate_related_skill}, ${(m.transferable_credit || 0.5) * 100}%)`
        : m.skill)
      .join(', ') || 'None';
    const missing = result.missing_required_skills.join(', ') || 'None';
    const extra   = result.additional_skills.join(', ') || 'None';
    const text =
      `Candidate Match Summary\n` +
      `Candidate File: ${result.resume_filename}\n` +
      `Job Description: ${result.jd_filename}\n` +
      `Overall Match: ${result.overall_score}% (${getAlignmentLabel(result.overall_score)})\n` +
      `Active Method: ${result.analysis_method}\n` +
      `Required Skills Found: ${result.required_skills_matched}/${result.required_skills_total} (${result.skill_match_percentage}%)\n` +
      `Matched Skills: ${matched}\n` +
      `Missing Required Skills: ${missing}\n` +
      `Additional Skills: ${extra}`;
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  // NEXT — keep JD + method, clear only resume + result
  const handleNext = () => {
    setResumeFile(null);
    setResult(null);
    setError(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="stage">

      {/* ── Background rug ── */}
      <div className="bg-rug" />

      {/* ── Hidden file inputs ── */}
      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleResumeFileInput}
      />
      <input
        ref={jdInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleJdFileInput}
      />

      {/* ══════════════════════════════════════════════════════════════════
          INPUT STATE
      ══════════════════════════════════════════════════════════════════ */}
      {!result && (
        <>
          {/* ── 4.png — JD statue (top-left) ── */}
          <div
            className={`asset-zone asset-jd${jdDragOver ? ' drag-over' : ''}${jdFile ? ' has-file' : ''}`}
            onClick={handleJdImageClick}
            onDoubleClick={(e) => { e.preventDefault(); openJdTerminal(); }}
            onTouchEnd={handleJdTouchEnd}
            onKeyDown={handleJdKeyDown}
            onDragOver={e => { e.preventDefault(); setJdDragOver(true); }}
            onDragLeave={() => setJdDragOver(false)}
            onDrop={handleJdDrop}
            role="button"
            tabIndex={0}
            aria-label="Job description — click to browse, double-click or double-tap to type, F2 to type"
          >
            <img src="/color/4.png" alt="Description" className="asset-img" draggable={false} />
            {jdFile && (
              <div className="asset-badge">
                <span className="asset-badge-name">{jdFile.name}</span>
                <span className="asset-badge-size">{formatFileSize(jdFile.size)}</span>
              </div>
            )}
            {jdText && !jdFile && (
              <div className="asset-badge asset-badge-text">
                <span className="asset-badge-name">JD typed ({jdText.length} chars)</span>
              </div>
            )}
          </div>

          {/* ── 2.png — Resume pomegranate (top-right) ── */}
          <div
            className={`asset-zone asset-resume${resumeDragOver ? ' drag-over' : ''}${resumeFile ? ' has-file' : ''}`}
            onClick={() => resumeInputRef.current?.click()}
            onKeyDown={handleResumeKeyDown}
            onDragOver={e => { e.preventDefault(); setResumeDragOver(true); }}
            onDragLeave={() => setResumeDragOver(false)}
            onDrop={handleResumeDrop}
            role="button"
            tabIndex={0}
            aria-label="Resume — click or drag to upload"
          >
            <img src="/color/2.png" alt="Resume" className="asset-img" draggable={false} />
            {resumeFile && (
              <div className="asset-badge">
                <span className="asset-badge-name">{resumeFile.name}</span>
                <span className="asset-badge-size">{formatFileSize(resumeFile.size)}</span>
              </div>
            )}
          </div>

          {/* ── 3.png — Centre hands (triggers analysis) ── */}
          <div
            className={`asset-zone asset-centre${resumeFile && hasJd ? ' ready' : ''}`}
            onClick={handleCentreClick}
            onKeyDown={handleCentreKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Analyse — click after uploading both documents"
          >
            <img src="/color/3.png" alt="Analyse" className="asset-img asset-centre-img" draggable={false} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LOADING OVERLAY
      ══════════════════════════════════════════════════════════════════ */}
      {loading && (
        <div className="loading-overlay">
          <p className="loading-stage">{stageText}</p>
          <div className="loading-track">
            <div className="loading-fill" style={{ width: `${stageProgress}%` }} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ERROR BANNER
      ══════════════════════════════════════════════════════════════════ */}
      {error && !result && (
        <div className="error-banner" role="alert">
          {error}
          <button className="error-close" onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          METHOD PICKER — 6.png floating popup
      ══════════════════════════════════════════════════════════════════ */}
      {showMethodPicker && (
        <div className="picker-backdrop" onClick={() => setShowMethodPicker(false)}>
          <div className="picker-popup" onClick={e => e.stopPropagation()}>
            <img src="/color/6.png" alt="Choose method" className="picker-bg" draggable={false} />
            <button className="picker-btn picker-hybrid"  onClick={() => handleAnalyse('auto')}>hybrid</button>
            <button className="picker-btn picker-sbert"   onClick={() => handleAnalyse('semantic')}>S-BERT</button>
            <button className="picker-btn picker-classic" onClick={() => handleAnalyse('classical')}>Classic</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TERMINAL — 5.png full MS-Paint frame, beige area = textarea
      ══════════════════════════════════════════════════════════════════ */}
      {showTerminal && (
        <div className="terminal-backdrop" onClick={() => setShowTerminal(false)}>
          <div className="terminal-frame" onClick={e => e.stopPropagation()}>
            <img src="/color/5.png" alt="" className="terminal-chrome" draggable={false} aria-hidden />
            <textarea
              className="terminal-textarea"
              placeholder="In the beginning, the Universe was created. This has made a lot of people very angry and been widely regarded as a bad move."
              value={jdText}
              onChange={e => { setJdText(e.target.value); setJdFile(null); }}
              spellCheck={false}
              autoFocus
            />
            <div className="terminal-actions">
              <button className="terminal-ok"     onClick={() => setShowTerminal(false)}>OK</button>
              <button className="terminal-cancel" onClick={() => { setJdText(''); setShowTerminal(false); }}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RESULTS — scrollable text layer over frozen background
          Entire layer is pointer-events:none except the action buttons.
      ══════════════════════════════════════════════════════════════════ */}
      {result && (
        <div className="results-scroll-layer">
          <div className="results-inner">

            {/* Export / Next row — pointer-events:auto */}
            <div className="results-actions">
              <button className="r-btn" onClick={handleDownloadPdf}>PDF</button>
              <button className="r-btn" onClick={handleExportJson}>JSON</button>
              <button className="r-btn" onClick={handleCopySummary}>{copyFeedback ? 'Copied!' : 'Copy'}</button>
              <button className="r-btn r-btn-next" onClick={handleNext}>NEXT →</button>
            </div>

            {/* Score hero */}
            <div className="r-hero">
              <div
                className="r-score-ring"
                role="img"
                aria-label={`Overall match ${result.overall_score.toFixed(1)} percent`}
                style={{ background: `conic-gradient(#fff ${Math.min(100, result.overall_score)}%, rgba(255,255,255,0.15) 0)` }}
              >
                <div className="r-score-center">
                  <span className="r-score-num">{result.overall_score.toFixed(1)}%</span>
                  <span className="r-score-label">overall match</span>
                </div>
              </div>
              <div className="r-hero-meta">
                <p className="r-method">{result.analysis_method}</p>
                <p className="r-align">{getAlignmentLabel(result.overall_score)}</p>
                <p className="r-files">{result.resume_filename} vs. {result.jd_filename}</p>
              </div>
            </div>

            {/* Stat row */}
            <div className="r-stat-row">
              <div className="r-stat">
                <span className="r-stat-label">Required skills</span>
                <span className="r-stat-val">
                  {result.required_skills_matched} / {result.required_skills_total} ({result.skill_match_percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="r-stat">
                <span className="r-stat-label">Keyword similarity</span>
                <span className="r-stat-val">{(result.lexical_similarity * 100).toFixed(1)}%</span>
              </div>
              <div className="r-stat">
                <span className="r-stat-label">Contextual similarity</span>
                <span className="r-stat-val">
                  {result.semantic_similarity !== null
                    ? `${(result.semantic_similarity * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Score breakdown — static (not interactive) */}
            <div className="r-section">
              <p className="r-section-title">Score Breakdown</p>
              <table className="r-table">
                <thead>
                  <tr><th>Component</th><th>Weight</th><th>Raw</th><th>Pts</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Skill Coverage</td>
                    <td>{(result.score_breakdown.weights_used.skill_match * 100).toFixed(0)}%</td>
                    <td>{result.skill_match_percentage.toFixed(1)}%</td>
                    <td>{result.score_breakdown.skill_contribution.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>TF-IDF Lexical</td>
                    <td>{(result.score_breakdown.weights_used.text_baseline * 100).toFixed(0)}%</td>
                    <td>{(result.lexical_similarity * 100).toFixed(1)}%</td>
                    <td>{result.score_breakdown.baseline_text_contribution.toFixed(1)}</td>
                  </tr>
                  {result.semantic_similarity !== null && (
                    <tr>
                      <td>Sentence-BERT</td>
                      <td>{(result.score_breakdown.weights_used.semantic_match * 100).toFixed(0)}%</td>
                      <td>{(result.semantic_similarity * 100).toFixed(1)}%</td>
                      <td>{result.score_breakdown.semantic_text_contribution.toFixed(1)}</td>
                    </tr>
                  )}
                  {(result.score_breakdown.preferred_skill_bonus ?? 0) > 0 && (
                    <tr>
                      <td>Preferred Bonus</td>
                      <td>—</td>
                      <td>{result.coverage_metrics?.preferred_skills_matched_count ?? 0} preferred</td>
                      <td>+{result.score_breakdown.preferred_skill_bonus!.toFixed(1)}</td>
                    </tr>
                  )}
                  <tr className="r-table-total">
                    <td colSpan={3}>Total</td>
                    <td>{result.overall_score.toFixed(1)} / 100</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Matched skills */}
            <div className="r-section">
              <p className="r-section-title">Skills Found ({result.matched_skills.length})</p>
              {result.matched_skills.length > 0 ? (
                <table className="r-table r-skills-table">
                  <thead>
                    <tr><th>Skill / Match Type</th><th>Evidence</th></tr>
                  </thead>
                  <tbody>
                    {result.matched_skills.map((m, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`r-pill ${m.is_related ? 'r-pill-related' : 'r-pill-matched'}`}>
                            {m.skill}
                          </span>
                          <span className="r-match-type">
                            {m.match_type === 'Exact match'       && 'Exact'}
                            {m.match_type === 'Recognized alias'  && `Alias: "${m.surface_form_detected}"`}
                            {m.is_related                         && `Related — ${m.candidate_related_skill} (${((m.transferable_credit || 0.5) * 100).toFixed(0)}%)`}
                          </span>
                        </td>
                        <td>
                          {m.evidence_category && (
                            <span className="r-ev-cat">{formatEvidenceCategory(m.evidence_category)}</span>
                          )}
                          {m.evidence?.[0]
                            ? <span className="r-ev-quote">"{m.evidence[0]}"</span>
                            : <span className="r-ev-none">Identified via technical match</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="r-empty">No overlapping required skills detected.</p>
              )}
            </div>

            {/* Missing skills */}
            <div className="r-section">
              <p className="r-section-title">Skills Not Found ({result.missing_required_skills.length})</p>
              <div className="r-pill-grid">
                {result.missing_required_skills.length > 0
                  ? result.missing_required_skills.map((s, i) => (
                      <span key={i} className="r-pill r-pill-missing">{s}</span>
                    ))
                  : <span className="r-ok">✓ All required skills evidenced.</span>}
              </div>
            </div>

            {/* Preferred skills */}
            {((result.matched_preferred?.length ?? 0) > 0 ||
              (result.missing_preferred_skills?.length ?? 0) > 0) && (
              <div className="r-section">
                <p className="r-section-title">Preferred Qualifications</p>
                {(result.matched_preferred?.length ?? 0) > 0 && (
                  <div className="r-pill-grid" style={{ marginBottom: 8 }}>
                    {result.matched_preferred!.map((p, i) => (
                      <span key={i} className="r-pill r-pill-preferred">{p.skill}</span>
                    ))}
                  </div>
                )}
                {(result.missing_preferred_skills?.length ?? 0) > 0 && (
                  <div className="r-pill-grid">
                    {result.missing_preferred_skills!.map((s, i) => (
                      <span key={i} className="r-pill r-pill-additional">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Additional skills */}
            {result.additional_skills.length > 0 && (
              <div className="r-section">
                <p className="r-section-title">Other Skills Detected ({result.additional_skills.length})</p>
                <div className="r-pill-grid">
                  {result.additional_skills.map((s, i) => (
                    <span key={i} className="r-pill r-pill-additional">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Background */}
            {(result.experience_findings.length > 0 ||
              result.education_findings.length > 0 ||
              result.certifications_findings.length > 0) && (
              <div className="r-section">
                <p className="r-section-title">Extracted Background</p>
                {result.experience_findings.length > 0 && (
                  <p className="r-bg-line"><b>Experience:</b> {result.experience_findings.join(', ')}</p>
                )}
                {result.education_findings.length > 0 && (
                  <p className="r-bg-line"><b>Education:</b> {result.education_findings.join(', ')}</p>
                )}
                {result.certifications_findings.length > 0 && (
                  <p className="r-bg-line"><b>Certifications:</b> {result.certifications_findings.join(', ')}</p>
                )}
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="r-section r-warnings">
                <p className="r-section-title">Quality Notes</p>
                <ul>
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <p className="r-disclaimer">
              This report is generated algorithmically for recruiter decision support only.
              It does not constitute a hiring decision.
            </p>

          </div>
        </div>
      )}

    </div>
  );
};
