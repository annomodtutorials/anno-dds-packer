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
