// Shared icons, helpers, and queue data
const { useState, useEffect, useRef, useMemo } = React;

const QUEUE_SAMPLE = [
  { id: 1, name: 'forum_column_set',  inputs: 1, status: 'done',     pct: 100 },
  { id: 2, name: 'temple_roof_tiles', inputs: 2, status: 'encoding', pct: 65,  label: 'ENCODING LOD1', eta: '00:00:07' },
  { id: 3, name: 'marble_statue_a',   inputs: 1, status: 'packing',  pct: 32,  label: 'PACKING CHANNELS', eta: '00:00:11' },
  { id: 4, name: 'market_stall_cloth',inputs: 2, status: 'queued',   pct: 0,   label: 'WAITING IN QUEUE', queuePos: '4 of 4' },
];

// Modern theme inline SVG icons
function ModernSunIcon({ size = 24, color = '#F2B65A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" fill={color} fillOpacity="0.2" />
      <line x1="12" y1="2"  x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2"  y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.5"  y1="4.5"  x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19.5" y2="19.5" />
      <line x1="4.5"  y1="19.5" x2="6.7" y2="17.3" />
      <line x1="17.3" y1="6.7"  x2="19.5" y2="4.5" />
    </svg>
  );
}

function ModernWaveIcon({ size = 24, color = '#9893FC' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7 Q 6 2, 12 7 T 22 7" />
      <path d="M2 13 Q 6 8, 12 13 T 22 13" />
      <path d="M2 19 Q 6 14, 12 19 T 22 19" />
    </svg>
  );
}

function ModernCubeIcon({ size = 24, color = '#F2B65A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" fill={color} fillOpacity="0.12" />
      <path d="M12 2 L12 12 L3 7" />
      <path d="M12 12 L21 7" />
      <path d="M12 12 L12 22" />
    </svg>
  );
}

function FileIcon({ color }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2 H6 a2 2 0 0 0-2 2 v16 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2-2 V8 z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function FolderIcon({ color }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7 a2 2 0 0 1 2-2 h4 l2 2 h8 a2 2 0 0 1 2 2 v9 a2 2 0 0 1-2 2 H5 a2 2 0 0 1-2-2 z" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2">
      <rect x="6" y="10" width="48" height="36" rx="3" />
      <circle cx="18" cy="22" r="4" fill="rgba(255,255,255,0.4)" stroke="none" />
      <path d="M6 38 L20 26 L32 36 L42 28 L54 38" />
    </svg>
  );
}

function ParallelStackIcon({ color = 'currentColor' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth="1.5">
      <rect x="3"  y="3"  width="12" height="8" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="5"  y="7"  width="12" height="8" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="7"  y="11" width="12" height="8" rx="1.5" fill={color} fillOpacity="0.25" />
    </svg>
  );
}

// Donut progress component
function Donut({ pct, status, theme }) {
  const size = 84, r = 36, c = 2 * Math.PI * r;
  const trackColor = theme === 'anno' ? '#091422' : '#2A3340';
  const arcColor = theme === 'anno' ? '#5B3D8E' : '#6B5FFF';
  const greenColor = theme === 'anno' ? '#E6C57A' : '#5DD49A';

  if (status === 'queued') {
    const dots = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      dots.push(
        <span key={i} style={{ transform: `translate(${x}px, ${y}px) translate(-2px,-2px)` }} />
      );
    }
    return (
      <div className="donut" data-status="queued" style={{ width: size, height: size }}>
        <div className="dots">{dots}</div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="donut" data-status="done" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} stroke={greenColor} strokeWidth="5" fill="none" />
          <path d={`M ${size/2 - 12} ${size/2} l 9 9 l 18 -18`}
            stroke={greenColor} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  const dash = c * (pct / 100);
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={trackColor} strokeWidth="5" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={arcColor} strokeWidth="5" fill="none"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" />
      </svg>
      <div className="pct">{pct}%</div>
    </div>
  );
}

// Convert button spinner (animated dot-ring)
function ConvertSpinner() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(i);
  }, []);
  const dots = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = 12;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const idx = (i - tick + 12) % 12;
    const op = idx < 4 ? (1 - idx * 0.22) : 0.18;
    dots.push(
      <span key={i} className="dot"
        style={{ transform: `translate(${x}px, ${y}px) translate(-2.5px,-2.5px)`, opacity: op }} />
    );
  }
  return <span className="convert-spinner">{dots}</span>;
}

// Pulse dot for footer
function PulseDot() { return <span className="pulse-dot" />; }

// LOD chip — same label-below-box layout for both themes; colour & shape swap.
function LodChip({ n, on, locked, theme, onToggle }) {
  return (
    <div className={`lod-chip lod-chip-${theme}`} data-on={on} data-locked={locked || undefined}
         onClick={() => !locked && onToggle && onToggle()}>
      <div className="lod-box" />
      <div className="lod-label">LOD{n}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Image preview + full-screen inspector
//
// The whole app stage is rendered inside a CSS `transform: scale(...)`, which
// would shrink any popover/overlay placed inside it. So both the hover popover
// and the inspector are portalled to document.body and positioned in screen
// coordinates (chip.getBoundingClientRect() already returns post-transform
// screen pixels).

function previewBase() {
  return window.__PACKER_BASE || 'http://127.0.0.1:45291';
}

// Build a GET URL the webview can use directly as an <img src>.
// `n` is a cache-buster: set_id is reused after the queue is cleared, so the
// browser would otherwise serve the previous set's cached image at the same
// URL. App bumps window.__previewNonce whenever the queue empties.
function previewUrl(desc, maxdim) {
  const p = new URLSearchParams({
    mode: desc.mode, kind: desc.kind,
    set_id: String(desc.set_id), map_type: desc.map_type,
    lod: String(desc.lod != null ? desc.lod : -1),
    maxdim: String(maxdim || 0),
    n: String(window.__previewNonce || 0),
  });
  return `${previewBase()}/api/preview?${p.toString()}`;
}

// A wrapper that shows a hover popover (thumbnail + filename + type) and opens
// the full-screen inspector on click. `desc` = {mode, kind, set_id, map_type,
// lod, label}.
// Popover sizing — image box fits within MAXW×MAXH preserving the texture's
// real aspect ratio (~50% larger than the original 240×200 frame).
const POP_MAXW = 340, POP_MAXH = 300, POP_CAP = 52, POP_GAP = 12;

function popImgDims(meta) {
  if (meta && meta.width && meta.height) {
    const aspect = meta.width / meta.height;
    let w = POP_MAXW, h = w / aspect;
    if (h > POP_MAXH) { h = POP_MAXH; w = h * aspect; }
    return { w: Math.round(w), h: Math.round(h) };
  }
  const s = Math.min(POP_MAXW, POP_MAXH);   // square default until meta loads
  return { w: s, h: s };
}

function ChipPreview({ desc, children, className, style, as }) {
  const Tag = as || 'span';
  const [hover, setHover] = useState(false);
  const [box, setBox] = useState(null);        // {left, top, w, h}
  const [meta, setMeta] = useState(null);      // {name, type_label, width, height}
  const [failed, setFailed] = useState(false);
  const elRef = useRef(null);
  const timerRef = useRef(null);

  // Place the popover where there's the most room (below preferred), sized to
  // the image's aspect ratio.
  const place = (m) => {
    const el = elRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = popImgDims(m);
    const popH = d.h + POP_CAP;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    let top;
    if (spaceBelow >= popH + POP_GAP || spaceBelow >= spaceAbove) {
      top = r.bottom + POP_GAP;             // below the chip
    } else {
      top = r.top - POP_GAP - popH;         // above the chip
    }
    top = Math.max(8, Math.min(top, window.innerHeight - popH - 8));
    let left = r.left + r.width / 2 - d.w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - d.w - 8));
    setBox({ left, top, w: d.w, h: d.h });
  };

  const onEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFailed(false);
      setMeta(null);
      place(null);
      setHover(true);
      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.preview_meta({
          mode: desc.mode, kind: desc.kind, set_id: desc.set_id,
          map_type: desc.map_type, lod: desc.lod != null ? desc.lod : -1,
        }).then(m => { if (m && m.ok) { setMeta(m); place(m); } }).catch(() => {});
      }
    }, 130);
  };
  const onLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHover(false);
  };
  const onClick = (e) => {
    e.stopPropagation();
    if (window.__openInspector) window.__openInspector(desc);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <Tag
      ref={elRef}
      className={className}
      style={{ cursor: 'zoom-in', ...(style || {}) }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {children}
      {hover && box && !failed && ReactDOM.createPortal(
        <div className="preview-pop" style={{ left: box.left, top: box.top, width: box.w }}>
          <div className="preview-pop-img checker" style={{ height: box.h }}>
            <img src={previewUrl(desc, 512)} alt=""
                 onError={() => setFailed(true)} />
          </div>
          <div className="preview-pop-cap">
            <div className="preview-pop-name">{meta ? meta.name : (desc.label || '…')}</div>
            <div className="preview-pop-type">
              {(desc.label || '').toString()}
              {meta && meta.width ? `  ·  ${meta.width}×${meta.height}` : ''}
            </div>
          </div>
        </div>,
        document.body
      )}
    </Tag>
  );
}

// What each channel means for the Anno-packed DDS types (and the live pack
// output, which IS that DDS). Drives the semantic pill in the inspector.
const ANNO_DDS_SEM = {
  diff:   { all: 'Diffuse',        R: 'Albedo (R)', G: 'Albedo (G)', B: 'Albedo (B)', A: 'Opacity' },
  norm:   { all: 'Normal',         R: 'Normal X',   G: 'Normal Y (DX)', B: 'Normal Z', A: 'Glossiness' },
  metal:  { all: 'Metal (packed)', R: 'Metalness',  G: 'Metalness',  B: 'Metalness',  A: 'Ambient Occlusion' },
  height: { all: 'Height',         R: 'Displacement', G: 'Displacement', B: 'Displacement', A: '—' },
  mask:   { all: 'Mask',           R: 'Emission (R)', G: 'Emission (G)', B: 'Emission (B)', A: 'Night mask' },
  icon:   { all: 'Icon',           R: 'Red', G: 'Green', B: 'Blue', A: 'Mask' },
};

// Per-channel meaning for the *source* maps a user drops (pack inputs),
// including the packed ones (RM / ORM).
const SRC_SEM = {
  diff:     { all: 'Diffuse / Albedo', R: 'Albedo (R)', G: 'Albedo (G)', B: 'Albedo (B)', A: 'Opacity' },
  opacity:  { all: 'Opacity',          R: 'Opacity',    G: 'Opacity',    B: 'Opacity',    A: 'Opacity' },
  norm:     { all: 'Normal',           R: 'Normal X',   G: 'Normal Y',   B: 'Normal Z',   A: '—' },
  metal:    { all: 'Metalness',        R: 'Metalness',  G: 'Metalness',  B: 'Metalness',  A: '—' },
  ao:       { all: 'Ambient Occlusion',R: 'AO',         G: 'AO',         B: 'AO',         A: '—' },
  rough:    { all: 'Roughness',        R: 'Roughness',  G: 'Roughness',  B: 'Roughness',  A: '—' },
  gloss:    { all: 'Glossiness',       R: 'Glossiness', G: 'Glossiness', B: 'Glossiness', A: '—' },
  height:   { all: 'Height',           R: 'Displacement', G: 'Displacement', B: 'Displacement', A: '—' },
  emission: { all: 'Emission',         R: 'Emission (R)', G: 'Emission (G)', B: 'Emission (B)', A: '—' },
  rm:       { all: 'Packed R+M',       R: '(unused)',   G: 'Roughness',  B: 'Metalness',  A: '—' },
  orm:      { all: 'Packed O+R+M',     R: 'Ambient Occlusion', G: 'Roughness', B: 'Metalness', A: '—' },
  icon:     { all: 'Icon',             R: 'Red',        G: 'Green',      B: 'Blue',       A: 'Mask' },
};

// Return {all, R, G, B, A} semantic labels for the texture in `desc`.
function channelSemantics(desc) {
  const ddsLike =
    (desc.mode === 'unpack' && desc.kind === 'input') ||
    (desc.mode === 'pack' && desc.kind === 'output');
  if (ddsLike && ANNO_DDS_SEM[desc.map_type]) return ANNO_DDS_SEM[desc.map_type];
  if (desc.mode === 'pack' && desc.kind === 'input' && SRC_SEM[desc.map_type]) {
    return SRC_SEM[desc.map_type];
  }
  // Unpacked single-channel outputs / unknown: label applies to the whole image.
  return { all: desc.label || '', R: 'Red', G: 'Green', B: 'Blue', A: 'Alpha' };
}

// Full-screen inspector with pan/zoom + per-channel isolation. Controlled by
// App via window.__openInspector. The image is drawn to a <canvas> so R/G/B/A
// isolation happens client-side (instant, no extra fetch).
function ImageInspector({ items, start, onClose }) {
  const [idx, setIdx] = useState(start || 0);
  const desc = items[idx] || items[0];
  const [meta, setMeta] = useState(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [channel, setChannel] = useState('RGBA');
  const [base, setBase] = useState(null);     // {data:ImageData, w, h} | {img, w, h, tainted} | null
  const [canChannels, setCanChannels] = useState(true);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const sem = channelSemantics(desc);
  const go = (delta) => setIdx(i => (i + delta + items.length) % items.length);

  useEffect(() => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.preview_meta({
        mode: desc.mode, kind: desc.kind, set_id: desc.set_id,
        map_type: desc.map_type, lod: desc.lod != null ? desc.lod : -1,
      }).then(m => { if (m && m.ok) setMeta(m); }).catch(() => {});
    }
  }, [desc]);

  // Load the image and grab its pixels (crossOrigin so the canvas isn't tainted
  // — the server sends Access-Control-Allow-Origin: *).
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setBase(null); setChannel('RGBA');
    setScale(1); setTx(0); setTy(0);   // reframe each texture on navigation
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const oc = document.createElement('canvas');
      oc.width = img.naturalWidth; oc.height = img.naturalHeight;
      const octx = oc.getContext('2d');
      octx.drawImage(img, 0, 0);
      try {
        const data = octx.getImageData(0, 0, oc.width, oc.height);
        setBase({ data, w: oc.width, h: oc.height });
        setCanChannels(true);
      } catch (e) {
        setBase({ img, w: img.naturalWidth, h: img.naturalHeight, tainted: true });
        setCanChannels(false);
      }
      setLoading(false);
    };
    img.onerror = () => { if (!cancelled) setLoading(false); };
    img.src = previewUrl(desc, 1600);
    return () => { cancelled = true; };
  }, [desc]);

  // Draw the selected channel to the visible canvas.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !base) return;
    cv.width = base.w; cv.height = base.h;
    const ctx = cv.getContext('2d');
    if (base.tainted) { ctx.drawImage(base.img, 0, 0); return; }
    if (channel === 'RGBA') { ctx.putImageData(base.data, 0, 0); return; }
    const s = base.data.data;
    const out = ctx.createImageData(base.w, base.h);
    const d = out.data;
    if (channel === 'RGB') {
      // colour with alpha forced opaque — ignores opacity / packed-alpha
      for (let i = 0; i < s.length; i += 4) {
        d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = 255;
      }
    } else {
      const off = channel === 'R' ? 0 : channel === 'G' ? 1 : channel === 'B' ? 2 : 3;
      for (let i = 0; i < s.length; i += 4) {
        const v = s[i + off];
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }, [base, channel]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '0') { setScale(1); setTx(0); setTy(0); }
      else if (e.key === '+' || e.key === '=') setScale(s => Math.min(16, s * 1.25));
      else if (e.key === '-' || e.key === '_') setScale(s => Math.max(0.1, s / 1.25));
      else if (e.key === 'ArrowRight') { e.preventDefault(); setIdx(i => (i + 1) % items.length); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx(i => (i - 1 + items.length) % items.length); }
      else if (canChannels && 'rR'.includes(e.key)) setChannel('R');
      else if (canChannels && 'gG'.includes(e.key)) setChannel('G');
      else if (canChannels && 'bB'.includes(e.key)) setChannel('B');
      else if (canChannels && 'aA'.includes(e.key)) setChannel('A');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, canChannels, items.length]);

  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setScale(s => Math.max(0.1, Math.min(16, s * factor)));
  };
  const onDown = (e) => {
    drag.current = {
      x: e.clientX, y: e.clientY, tx, ty,
      moved: false,
      onImage: e.target && e.target.classList && e.target.classList.contains('inspector-img'),
    };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 3) {
      drag.current.moved = true;
    }
    setTx(drag.current.tx + (e.clientX - drag.current.x));
    setTy(drag.current.ty + (e.clientY - drag.current.y));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved && !d.onImage) onClose();
  };
  const reset = () => { setScale(1); setTx(0); setTy(0); };

  // RGBA names both parts when the alpha is meaningful (e.g. "Diffuse + Opacity",
  // "Metal (packed) + Ambient Occlusion"); RGB is just the colour content.
  const pill =
    channel === 'RGBA'
      ? (sem.A && sem.A !== '—' ? `${sem.all} + ${sem.A}` : (sem.all || 'RGBA'))
      : channel === 'RGB'
        ? (sem.all || 'RGB')
        : sem[channel];
  const CH = ['R', 'G', 'B', 'A', 'RGB', 'RGBA'];

  return ReactDOM.createPortal(
    <div className="inspector-scrim" onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <div className="inspector-bar">
        <div className="inspector-titles">
          <span className="inspector-name">{meta ? meta.name : (desc.label || 'Preview')}</span>
          <span className="inspector-sub">
            {pill && <span className="inspector-pill">{pill}</span>}
            {meta && meta.width ? <span className="inspector-dims">{meta.width}×{meta.height}</span> : null}
          </span>
        </div>
        <div className="inspector-tools">
          {items.length > 1 && (
            <>
              <button className="inspector-nav" onClick={() => go(-1)} title="Previous texture (←)">‹</button>
              <span className="inspector-count">{idx + 1} / {items.length}</span>
              <button className="inspector-nav" onClick={() => go(1)} title="Next texture (→)">›</button>
              <span className="inspector-divider" />
            </>
          )}
          <div className="channel-btns">
            {CH.map(c => (
              <button key={c}
                className={'channel-btn ch-' + c + (channel === c ? ' active' : '')}
                disabled={!canChannels && c !== 'RGBA'}
                title={
                  c === 'RGBA' ? 'Full colour + alpha (original)' :
                  c === 'RGB' ? 'Colour only — ignore alpha (diffuse / normal)' :
                  `Isolate ${c} channel — ${sem[c]}`
                }
                onClick={() => setChannel(c)}>{c}</button>
            ))}
          </div>
          <span className="inspector-divider" />
          <button onClick={() => setScale(s => Math.max(0.1, s / 1.25))} title="Zoom out (−)">−</button>
          <span className="inspector-zoom">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(16, s * 1.25))} title="Zoom in (+)">+</button>
          <button onClick={reset} title="Reset (0)">Fit</button>
          <button className="inspector-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>
      </div>
      <div className="inspector-stage checker"
           onWheel={onWheel} onMouseDown={onDown}
           style={{ cursor: 'grab' }}>
        {loading && <div className="inspector-loading">Loading…</div>}
        <canvas ref={canvasRef} className="inspector-img"
                style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                         visibility: base ? 'visible' : 'hidden' }} />
      </div>
    </div>,
    document.body
  );
}

window.previewBase = previewBase;
window.previewUrl = previewUrl;
window.ChipPreview = ChipPreview;
window.ImageInspector = ImageInspector;

window.QUEUE_SAMPLE = QUEUE_SAMPLE;
window.ModernSunIcon = ModernSunIcon;
window.ModernWaveIcon = ModernWaveIcon;
window.ModernCubeIcon = ModernCubeIcon;
window.FileIcon = FileIcon;
window.FolderIcon = FolderIcon;
window.ImagePlaceholderIcon = ImagePlaceholderIcon;
window.ParallelStackIcon = ParallelStackIcon;
window.Donut = Donut;
window.ConvertSpinner = ConvertSpinner;
window.PulseDot = PulseDot;
window.LodChip = LodChip;
