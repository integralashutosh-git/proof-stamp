import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'proof-stamp-records'
const Icon = ({ name, size = 18 }) => {
  const paths = {
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [section, setSection] = useState('Prove')
  const [inputMode, setInputMode] = useState('Text')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [verifyText, setVerifyText] = useState('')
  const [verifyFile, setVerifyFile] = useState(null)
  const [verifyId, setVerifyId] = useState('')
  const [records, setRecords] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } })
  const [result, setResult] = useState(null)
  const [verifyResult, setVerifyResult] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(records)), [records])

  async function digestOf(input) {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : await input.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  }

  async function createProof() {
    const source = inputMode === 'Text' ? text : file
    if (!source || (inputMode === 'Text' && !text.trim())) return
    const hash = await digestOf(source)
    const record = { id: crypto.randomUUID(), name: inputMode === 'Text' ? 'Text proof' : file.name, kind: inputMode, contentType: inputMode === 'File' ? (file.type || 'application/octet-stream') : 'text/plain', hash, createdAt: new Date().toISOString(), size: inputMode === 'Text' ? new Blob([text]).size : file.size }
    setRecords((prev) => [record, ...prev])
    setResult(record)
  }

  async function verifyProof() {
    const record = records.find((item) => item.id.toLowerCase() === verifyId.trim().toLowerCase())
    const source = record?.kind === 'File' ? verifyFile : verifyText
    if (!source || (typeof source === 'string' && !source.trim()) || !verifyId.trim()) return
    const hash = await digestOf(source)
    const calculatedSize = typeof source === 'string' ? new TextEncoder().encode(source).length : source.size
    const verifiedAt = new Date().toISOString()
    const status = record ? (hash === record.hash ? 'valid' : 'invalid') : 'missing'
    if (record) {
      setRecords((prev) => prev.map((item) => item.id === record.id ? { ...item, lastVerifiedAt: verifiedAt, lastVerificationStatus: status } : item))
    }
    setVerifyResult({ status, expectedHash: record?.hash ?? null, calculatedHash: hash, expectedSize: record?.size ?? null, calculatedSize, recordName: record?.name, recordKind: record?.kind, createdAt: record?.createdAt ?? null, verifiedAt })
  }

  function openProofForVerification(record) {
    setVerifyId(record.id)
    setVerifyText('')
    setVerifyFile(null)
    setVerifyResult(null)
    setSection('Verify')
  }

  function deleteProof(id) {
    setRecords((prev) => prev.filter((record) => record.id !== id))
    if (result?.id === id) setResult(null)
  }

  function copyHash(hash) { navigator.clipboard?.writeText(hash); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }
  const verificationRecord = records.find((item) => item.id.toLowerCase() === verifyId.trim().toLowerCase())
  const nav = [{ name: 'Prove', icon: 'shield' }, { name: 'Verify', icon: 'check' }, { name: 'Proof history', icon: 'clock' }]

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={() => setSection('Prove')}><span className="brand-mark"><Icon name="shield" size={21}/></span><span>proof<span className="brand-light">stamp</span></span></a>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {nav.map(({ name, icon }) => <button key={name} className={`nav-item ${section === name ? 'active' : ''}`} onClick={() => { setSection(name); setResult(null); setVerifyResult(null) }}><Icon name={icon}/><span>{name}</span>{name === 'Proof history' && records.length > 0 && <span className="nav-count">{records.length}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="privacy-icon"><Icon name="lock" size={16}/></div><div><strong>Your proofs stay yours</strong><p>Everything is processed in your browser and stored on this device.</p></div><div className="local-tag"><i/> LOCAL &amp; PRIVATE</div></div>
      <div className="sidebar-foot"><span className="avatar">P</span><span><b>Personal workspace</b><small>Free plan</small></span><span className="dots">···</span></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{section}</b></div><button className="help-link" onClick={() => setSection('Prove')}><span className="help-dot">?</span> How it works</button><button className="mobile-brand"><Icon name="shield"/> proof<span>stamp</span></button></header>
      {section === 'Prove' && <>
        <section className="welcome-row"><div><div className="eyebrow"><Icon name="lock" size={14}/> SIMPLE, SECURE, YOURS</div><h1>Create a proof.</h1><p className="intro">Generate a SHA-256 fingerprint for text or a file. Proofs stay on this device.</p></div></section>
        <section className="workspace-grid">
          <div className="card create-card"><div className="card-heading"><div className="step-icon"><Icon name="shield" size={18}/></div><div><h2>Create a proof</h2><p>Choose what you’d like to protect.</p></div><span className="step-label">01 <span>/ 02</span></span></div>
            <div className="tabs"><button className={inputMode === 'Text' ? 'selected' : ''} onClick={() => {setInputMode('Text');setResult(null)}}><span className="tab-symbol">T</span> Text</button><button className={inputMode === 'File' ? 'selected' : ''} onClick={() => {setInputMode('File');setResult(null)}}><Icon name="file" size={16}/> A file</button></div>
            {inputMode === 'Text' ? <div className="text-wrap"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste the text you want to prove…" aria-label="Text to prove"/><span className="char-count">{text.length} characters</span></div> : <div className="file-picker-area"><label className={`drop-zone ${file ? 'has-file' : ''}`}><input type="file" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null) }}/><span className="upload-icon"><Icon name={file ? 'file' : 'upload'} size={19}/></span><b>{file ? file.name : 'Choose a file'}</b><small>{file ? `${(file.size / 1024).toFixed(1)} KB ? ready to hash` : 'Select any file type from your device'}</small></label><p className="file-local-note"><Icon name="lock" size={13}/> The file stays on your device. It is never uploaded; only its name, size, type, hash, ID and timestamp are saved locally.</p></div>}
            <div className="card-actions"><span className="secure-note"><Icon name="lock" size={13}/> Private by design</span><button className="primary-button" onClick={createProof} disabled={inputMode === 'Text' ? !text.trim() : !file}>Create proof <Icon name="arrow" size={15}/></button></div>
            {result && <div className="result-box"><div className="result-title"><span className="success-badge"><Icon name="check" size={14}/></span><div><b>Your proof is ready</b><small>SHA-256 fingerprint · saved in your history</small></div></div><div className={`proof-details ${result.kind === 'File' ? 'file-proof' : ''}`}>{result.kind === 'File' && <div><span>FILE DETAILS</span><code>{result.name} ? {result.size.toLocaleString()} bytes ? {result.contentType}</code></div>}<div><span>PROOF ID</span><code>{result.id}</code></div><div><span>CREATED</span><time dateTime={result.createdAt}>{new Date(result.createdAt).toLocaleString()}</time></div></div><div className="hash-row"><code>{result.hash}</code><button onClick={() => copyHash(result.hash)}><Icon name="copy" size={15}/>{copied ? 'Copied' : 'Copy'}</button></div></div>}
          </div>
          <div className="right-column"><div className="how-card"><div className="how-top"><div className="how-icon"><Icon name="shield" size={17}/></div><span>THE SHORT VERSION</span></div><h3>A fingerprint that<br/>can’t be faked.</h3><p>SHA-256 turns your content into a unique string. Change even one character and the fingerprint changes completely.</p><div className="mini-hash"><span>YOUR CONTENT</span><i/><code>8f3a…c291</code></div></div><div className="trust-card"><span className="trust-icon"><Icon name="lock" size={17}/></span><div><b>Private by design</b><p>Your content never leaves this browser. No uploads, no accounts, no tracking.</p></div><Icon name="arrow" size={15}/></div></div>
        </section>
        <section className="bottom-strip"><div className="strip-icon"><Icon name="check" size={16}/></div><div><b>Have a proof already?</b><span>Check that content still matches its original fingerprint.</span></div><button onClick={() => {setSection('Verify');setResult(null)}}>Verify a proof <Icon name="arrow" size={15}/></button></section>
      </>}
      {section === 'Verify' && <section className="page-section"><div className="eyebrow"><Icon name="check" size={14}/> CHECK A FINGERPRINT</div><h1>Verify a proof.</h1><p className="intro">Enter a proof ID and provide its original text or file. We’ll compare a fresh SHA-256 hash with your saved proof.</p><div className="card verify-card"><div className="card-heading"><div className="step-icon"><Icon name="check" size={18}/></div><div><h2>Check your content</h2><p>Your proof ID looks like the ID shown when you created the proof.</p></div></div><label className="field-label">PROOF ID<input className="digest-input" value={verifyId} onChange={e=>{setVerifyId(e.target.value);setVerifyText('');setVerifyFile(null);setVerifyResult(null)}} placeholder="Paste the proof ID"/></label>{verificationRecord?.kind === 'File' ? <label className="field-label">ORIGINAL FILE<input className="verify-file-input" type="file" onChange={e=>{setVerifyFile(e.target.files?.[0] || null);setVerifyResult(null)}}/><small className="verify-file-note">{verifyFile ? `${verifyFile.name} | ${verifyFile.size.toLocaleString()} bytes selected` : 'Choose the original file. It is read and hashed on this device only.'}</small></label> : <label className="field-label">ORIGINAL TEXT<textarea className="verify-text" value={verifyText} onChange={e=>{setVerifyText(e.target.value);setVerifyResult(null)}} placeholder="Paste the text you want to verify"/><small className="verify-file-note">Spaces and line breaks are included in the fingerprint.</small></label>}<button className="primary-button" disabled={!verifyId.trim() || (verificationRecord?.kind === 'File' ? !verifyFile : !verifyText.trim())} onClick={verifyProof}>Verify content <Icon name="arrow" size={15}/></button>{verifyResult && <div className={`verify-result ${verifyResult.status}`}><span className="success-badge"><Icon name={verifyResult.status === 'valid' ? 'check' : 'shield'} size={14}/></span><div className="verify-result-content"><b>{verifyResult.status === 'valid' ? 'Verified — content is unchanged' : verifyResult.status === 'invalid' ? 'Modified — content does not match' : 'Proof ID not found'}</b><small>{verifyResult.status === 'valid' ? `The content matches the saved proof “${verifyResult.recordName}”.` : verifyResult.status === 'invalid' ? 'The calculated fingerprint differs from the saved proof.' : 'No proof with this ID exists in local history on this device.'}</small><div className="hash-comparison"><div><span>EXPECTED HASH</span><code>{verifyResult.expectedHash || 'Unavailable — proof not found'}</code></div><div><span>CALCULATED HASH</span><code>{verifyResult.calculatedHash}</code></div></div><div className="size-comparison"><span>CONTENT SIZE</span><code>Expected: {verifyResult.expectedSize === null ? 'unknown' : `${verifyResult.expectedSize.toLocaleString()} bytes`}</code><code>Checked: {verifyResult.calculatedSize.toLocaleString()} bytes</code></div><div className="lifecycle-panel"><div className="lifecycle-heading"><Icon name="clock" size={15}/><b>Verification details</b></div><div className="lifecycle-step"><span className="lifecycle-dot created"/><div><b>Created and saved</b><time>{verifyResult.createdAt ? new Date(verifyResult.createdAt).toLocaleString() : 'Proof unavailable'}</time></div></div><div className="lifecycle-step"><span className={`lifecycle-dot ${verifyResult.status === 'valid' ? 'verified' : 'checked'}`}/><div><b>{verifyResult.status === 'valid' ? 'Verified' : 'Verification checked'}</b><time dateTime={verifyResult.verifiedAt}>{new Date(verifyResult.verifiedAt).toLocaleString()}</time></div><span className={`lifecycle-status ${verifyResult.status}`}>{verifyResult.status === 'valid' ? 'MATCH' : verifyResult.status === 'invalid' ? 'MODIFIED' : 'NOT FOUND'}</span></div></div></div></div>}</div></section>}
      {section === 'Proof history' && <section className="page-section"><div className="eyebrow"><Icon name="clock" size={14}/> YOUR LOCAL ARCHIVE</div><h1>Proof history.</h1><p className="intro">Proofs you’ve created on this device, ready whenever you need them.</p><div className="card history-card"><div className="history-heading"><div><h2>Saved proofs</h2><p>{records.length} {records.length === 1 ? 'proof' : 'proofs'} stored on this device</p></div><span className="local-tag"><i/> LOCAL ONLY</span></div>{records.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="file" size={23}/></span><b>No proofs yet</b><p>Create a proof to see it here. Your records stay on this device.</p><button className="primary-button" onClick={() => setSection('Prove')}>Create your first proof <Icon name="arrow" size={15}/></button></div> : <div className="history-list">{records.map(item=><article className="history-item" key={item.id}><span className="file-badge"><Icon name={item.kind === 'Text' ? 'shield' : 'file'} size={17}/></span><div className="history-meta"><b>{item.name}</b><small>{new Date(item.createdAt).toLocaleString()} | {item.kind}{item.kind === 'File' ? ` | ${item.contentType || 'file'} | ${item.size.toLocaleString()} bytes` : ''}</small>{item.lastVerifiedAt && <small>Last checked: {new Date(item.lastVerifiedAt).toLocaleString()} | {item.lastVerificationStatus === 'valid' ? 'Verified' : 'Modified'}</small>}<code title={item.id}>ID: {item.id}</code><code className="short-hash" title={item.hash}>SHA-256: {item.hash.slice(0, 12)}...{item.hash.slice(-8)}</code></div><div className="history-actions"><button className="copy-button" onClick={()=>openProofForVerification(item)}><Icon name="check" size={15}/>Verify</button><button className="delete-button" onClick={()=>deleteProof(item.id)} aria-label={`Delete proof ${item.id}`} title="Delete proof"><Icon name="trash" size={15}/>Delete</button></div></article>)}</div>}</div></section>}
      <footer className="main-footer"><span>© 2025 Proof Stamp</span><span><Icon name="lock" size={12}/> Built for privacy <i/> Powered by Web Crypto</span></footer>
    </main>
  </div>
}

export default App
