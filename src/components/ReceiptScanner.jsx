import { useEffect, useRef, useState } from 'react';
import { Camera, Check, CircleHelp, CloudUpload, FileImage, RefreshCw, ShieldCheck, Sparkles, Upload, X, Zap } from 'lucide-react';
import { CATEGORIES } from '../utils/format.js';
import { validateImage } from '../services/expenseService.js';
import { EMPTY_EXPENSE } from '../utils/expenseDefaults.js';

export function ScanPage({ onSave, toast, currency }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({ ...EMPTY_EXPENSE, source: 'receipt_scan' });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(nextFile) {
    if (!nextFile) return;
    try { validateImage(nextFile); setFile(nextFile); setForm({ ...EMPTY_EXPENSE, source: 'receipt_scan' }); setHasScanned(false); setScanError(''); }
    catch (error) { toast(error.message, 'error'); }
  }
  async function processReceipt() {
    if (!file) return;
    setScanning(true); setScanError(''); setProgress(0);
    try {
      const { scanReceipt } = await import('../services/receiptOCR.js');
      const result = await scanReceipt(file, setProgress);
      setForm((current) => ({ ...current, ...result.values, notes: current.notes, source: 'receipt_scan' }));
      setHasScanned(true);
      if (!result.values.total_amount) setScanError('We couldn’t confidently find the final total. Please check the receipt and enter it below.');
      else toast('Receipt read. Review the details before saving.');
    } catch (error) {
      setHasScanned(true);
      setScanError(`We couldn't read this receipt clearly. ${error.message || 'Please upload a clearer image or enter the details manually.'}`);
    } finally { setScanning(false); }
  }
  async function saveScanned(event) {
    event.preventDefault();
    if (!form.store_name.trim()) return setScanError('Enter a store or business name.');
    if (!form.total_amount || Number(form.total_amount) <= 0) return setScanError('Enter the final total amount.');
    try { await onSave({ ...form, total_amount: Number(form.total_amount), subtotal: form.subtotal === '' ? null : Number(form.subtotal), tax: form.tax === '' ? null : Number(form.tax), discount: form.discount === '' ? null : Number(form.discount) }, file); }
    catch { /* The parent displays the database error. */ }
  }
  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  return <div className="scan-page">
    <div className="scan-intro"><span className="scan-intro-icon"><Sparkles size={18} /></span><div><b>Smart receipt scanner</b><p>We’ll read the receipt on your device. You’ll always review the details before anything is saved.</p></div><span className="ocr-badge"><Zap size={13} /> OCR READY</span></div>
    {!file ? <div className={`upload-card ${dragging ? 'dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); }}>
      <div className="upload-illustration"><CloudUpload size={27} /></div><h2>Drop your receipt here</h2><p>Choose an image from your device or take a photo</p><div className="upload-actions"><button className="button button-primary" onClick={() => inputRef.current?.click()}><Upload size={16} /> Choose image</button><button className="button button-outline" onClick={() => setCameraOpen(true)}><Camera size={16} /> Use camera</button></div><span className="upload-formats">JPG or PNG · Max 10 MB · Your receipt stays private</span><input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png" onChange={(e) => selectFile(e.target.files?.[0])} /></div> : <div className="scan-workspace">
      <div className="receipt-preview panel">
        <div className="panel-heading">
          <div><h3>Receipt preview</h3><p>Check that the image is clear and readable</p></div>
          <button className="text-button" onClick={() => { setFile(null); setHasScanned(false); setScanError(''); }}>Remove <X size={14} /></button>
        </div>
        <div className={`preview-image ${scanning ? 'is-scanning' : ''}`}>
          <img src={preview} alt="Uploaded receipt preview" />
          {scanning && <div className="scan-overlay"><div className="scan-laser" /><div className="scan-overlay-text"><span className="loader" /> Reading your receipt… {progress}%</div></div>}
        </div>
        <div className="file-meta"><FileImage size={16} /><span>{file.name}</span><small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small></div>
        <button className="button button-primary process-button" onClick={processReceipt} disabled={scanning}>
          {hasScanned ? <RefreshCw size={15} /> : <Sparkles size={16} />}
          {hasScanned ? 'Rescan receipt' : 'Read receipt details'}
        </button>
        {scanning && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}
      </div>
      <form className="panel review-panel" onSubmit={saveScanned}><div className="panel-heading"><div><span className="eyebrow">STEP 2 · REVIEW & SAVE</span><h3>Check the details</h3><p>OCR suggestions can be changed before saving.</p></div><span className="review-badge"><ShieldCheck size={14} /> YOU’RE IN CONTROL</span></div>{scanError && <div className="inline-alert"><CircleHelp size={16} /><span>{scanError} You can still enter the details manually.</span></div>}
        <div className="form-grid scanner-fields"><label className="span-two">Store name<input value={form.store_name} onChange={(e) => setField('store_name', e.target.value)} placeholder="Store or business name" /></label><label>Receipt date<input type="date" value={form.expense_date} onChange={(e) => setField('expense_date', e.target.value)} /></label><label>Receipt time<input type="time" value={form.expense_time || ''} onChange={(e) => setField('expense_time', e.target.value)} /></label><label>Subtotal<input type="number" min="0" step="0.01" value={form.subtotal ?? ''} onChange={(e) => setField('subtotal', e.target.value)} placeholder="0.00" /></label><label>Tax<input type="number" min="0" step="0.01" value={form.tax ?? ''} onChange={(e) => setField('tax', e.target.value)} placeholder="0.00" /></label><label>Discount<input type="number" min="0" step="0.01" value={form.discount ?? ''} onChange={(e) => setField('discount', e.target.value)} placeholder="0.00" /></label><label>Category<select value={form.category} onChange={(e) => setField('category', e.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="span-two total-highlight"><span>Total amount ({currency}) <small>Most important</small></span><div><span>{currency}</span><input required type="number" min="0.01" step="0.01" value={form.total_amount} onChange={(e) => setField('total_amount', e.target.value)} placeholder="0.00" /></div></label><label className="span-two">Payment method<input value={form.payment_method} onChange={(e) => setField('payment_method', e.target.value)} placeholder="Cash, card, GCash…" /></label><label className="span-two">Notes<textarea rows="2" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Optional notes" /></label></div><div className="scanner-actions"><button type="button" className="button button-outline" onClick={() => { setFile(null); setHasScanned(false); }}>Scan again</button><button type="submit" className="button button-primary" disabled={!hasScanned || scanning}><Check size={16} /> Confirm & save</button></div></form>
    </div>}
    <div className="privacy-note"><ShieldCheck size={16} /><span><b>Your receipt is yours.</b> OCR runs on your device; the image and expense are saved to your private Supabase account only after you confirm.</span></div>
    {cameraOpen && <CameraCapture onCapture={(captured) => { selectFile(captured); setCameraOpen(false); }} onClose={() => setCameraOpen(false)} />}
  </div>;
}

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera capture.');
      return () => { alive = false; };
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => { if (alive) { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; } else stream.getTracks().forEach((track) => track.stop()); })
      .catch((cameraError) => { if (alive) setError(`Camera access failed: ${cameraError.message}`); });
    return () => { alive = false; streamRef.current?.getTracks().forEach((track) => track.stop()); };
  }, []);
  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return setError('The camera is not ready yet.');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return setError('Could not capture an image. Please try again.');
      onCapture(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }
  return <div className="modal-backdrop camera-backdrop"><section className="camera-modal" role="dialog" aria-modal="true"><div className="camera-heading"><b>Capture a receipt</b><button className="icon-button" onClick={onClose} aria-label="Close camera"><X size={20} /></button></div>{error ? <div className="camera-error"><Camera size={24} /><p>{error}</p><small>Allow camera permission in your browser, or upload an image instead.</small></div> : <video ref={videoRef} autoPlay playsInline muted />}{error && <button className="button button-outline" onClick={onClose}>Close</button>}{!error && <div className="camera-actions"><span>Keep the receipt in focus and within the frame.</span><button className="camera-shutter" onClick={capture} aria-label="Take photo"><span /></button></div>}</section></div>;
}
