// Modern theme components

function ModernHeroEmpty({ dragOver, onPickFiles, onPickFolder, unpackMode }) {
  return (
    <div className="hero-stack">
      <div className={`modern-drop-icon ${dragOver ? 'drag' : ''}`} style={{ marginTop: 32 }}>
        <div className="paper back" />
        <div className="paper front">
          <ImagePlaceholderIcon />
        </div>
        <div className="arrow">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none"
               stroke={dragOver ? '#ffffff' : 'rgba(156,163,176,0.85)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="18" y2="28" />
            <polyline points="10 22 18 30 26 22" />
          </svg>
        </div>
      </div>

      <div className="hero-headline" style={{ marginTop: 40 }}>
        {dragOver
          ? (unpackMode ? 'Release to import DDS files' : 'Release to import images')
          : (unpackMode ? 'Drop DDS files or folders' : 'Drop image files or folders')}
      </div>
      <div className="hero-body" style={dragOver ? { whiteSpace: 'nowrap', maxWidth: 'none' } : {}}>
        {dragOver
          ? (unpackMode ? 'Drop DDS files to begin unpacking' : 'Drop your images to begin packing')
          : (unpackMode
              ? "Drop Anno DDS texture files to unpack them back into individual PNG maps — Diffuse, Normal, Metalness, AO, Gloss and more."
              : "We'll auto-detect Diffuse, Normal, and Packed Metal+Roughness maps and convert them to game-ready DDS textures. PNG, JPG, TGA, BMP and TIFF all supported.")}
      </div>
      {!dragOver && (
        <div className="hero-buttons">
          <button className="btn-ghost" onClick={onPickFiles}>
            <FileIcon color="#9893FC" />
            {unpackMode ? 'Pick DDS Files' : 'Pick Files'}
          </button>
          <button className="btn-ghost" onClick={onPickFolder}>
            <FolderIcon color="#9893FC" />
            Pick Folder
          </button>
        </div>
      )}
    </div>
  );
}

function ModernQueueRow({ row, onShowLog, onRemove, unpackMode }) {
  const labelText =
    row.status === 'done' ? (unpackMode ? 'UNPACKED' : 'COMPLETED') :
    row.status === 'queued' ? 'WAITING IN QUEUE' :
    (row.label || row.status.toUpperCase());

  const done = new Set(row.maps_done || []);

  // ── Pack mode ──────────────────────────────────────────────────────────
  const packInputs = maybeInputChips(row.input_map_types);
  const packOutputs = row.output_map_types || ['diff', 'norm', 'metal'];

  // ── Unpack mode ────────────────────────────────────────────────────────
  const unpackInputs = row.input_dds_types || [];
  const unpackOutputs = row.output_png_types || [];

  // For packed maps (rm / orm) we return a list of icons so they render
  // with '+' between them, signalling the channels that were combined.
  const iconsFor = (chip) => {
    const t = chip.type;
    if (t === 'diff')   return [<ModernSunIcon size={26} color="#F2B65A" />];
    if (t === 'opacity')return [<ModernSunIcon size={26} color="#A8A0FF" />];
    if (t === 'norm')   return [<ModernWaveIcon size={26} />];
    if (t === 'rough')  return [<ModernCubeIcon size={26} color="#F2B65A" />];
    if (t === 'gloss')  return [<ModernCubeIcon size={26} color="#A8A0FF" />];
    if (t === 'metal')  return [<ModernCubeIcon size={26} color="#9CA3B0" />];
    if (t === 'ao')     return [<ModernSunIcon size={26} color="#6B7280" />];
    if (t === 'height') return [<ModernCubeIcon size={26} color="#5DD49A" />];
    if (t === 'rm')     return [
      <ModernCubeIcon size={26} color="#9CA3B0" />,
      <ModernCubeIcon size={26} color="#F2B65A" />,
    ];
    if (t === 'orm')    return [
      <ModernSunIcon size={26} color="#6B7280" />,
      <ModernCubeIcon size={26} color="#F2B65A" />,
      <ModernCubeIcon size={26} color="#9CA3B0" />,
    ];
    return [<ModernCubeIcon size={26} />];
  };

  return (
    <div className="queue-row" data-status={row.status} style={{ position: 'relative' }}>
      {/* Remove button — only when idle (not converting/encoding) */}
      {(row.status === 'queued' || row.status === 'done' || row.status === 'error') && onRemove && (
        <button
          onClick={() => onRemove(row.set_id)}
          title="Remove from queue"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 22, height: 22, padding: 0,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 5,
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11, lineHeight: '22px', textAlign: 'center',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.55)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.8)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        >✕</button>
      )}

      {/* Column 1: name + input chips */}
      <div>
        <div className="row-name">{row.name}</div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {unpackMode
            ? unpackInputs.map(mt => (
                <div key={mt} className="dds-chip" style={{ marginRight: 8, marginBottom: 4 }}>
                  <span className="dds-badge">DDS</span>
                  {DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`}
                </div>
              ))
            : packInputs.map((c, i) => {
                const nodes = iconsFor(c);
                return (
                  <span key={`${c.type}-${i}`} className="row-input-chip">
                    {nodes.map((n, j) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="chip-plus">+</span>}
                        {n}
                      </React.Fragment>
                    ))}
                    <span className="label">{c.label}</span>
                  </span>
                );
              })}
        </div>
      </div>

      {/* Column 2: output chips */}
      <div>
        <div className="row-output-label">{unpackMode ? 'Output PNG' : 'Output DDS'}</div>
        {unpackMode
          ? unpackOutputs.map(pt => (
              <div key={pt} className="dds-chip">
                <span className="png-badge">PNG</span>
                {PNG_OUTPUT_LABEL[pt] || `${pt.toUpperCase()}.PNG`}
                {(row.status === 'done' || done.has(pt)) && <span className="check" style={{color:'#5DD49A'}}>✓</span>}
              </div>
            ))
          : packOutputs.map(mt => (
              <div key={mt} className="dds-chip">
                <span className="dds-badge">DDS</span>
                {DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`}
                {(row.status === 'done' || done.has(mt)) && <span className="check" style={{color:'#5DD49A'}}>✓</span>}
              </div>
            ))}
      </div>

      {/* Column 3: status */}
      <div className="row-status" data-status={row.status}>
        <Donut pct={row.pct} status={row.status} theme="modern" />
        <div className="row-status-text">
          <div className="label">{labelText}</div>
          {row.status === 'done' && <div className="eta">100%</div>}
          {row.status === 'queued' && <div className="eta">{row.eta_text || `Position ${row.queue_position || ''}`}</div>}
          {(row.status === 'encoding' || row.status === 'packing' || row.status === 'writing' || row.status === 'reading') && (
            <>
              <div className="eta">{row.eta_text || `${Math.round(row.pct)}%`}</div>
              <div className="row-progress-bar" style={{ width: 240 }}>
                <div className="fill" style={{ width: `${row.pct}%` }} />
              </div>
            </>
          )}
          {row.status === 'error' && (
            <div className="eta" style={{color: 'var(--red)', cursor: 'pointer', textDecoration: 'underline'}}
                 onClick={() => onShowLog && onShowLog(row)}>
              See log ↗
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModernQueue({ rows, onClear, canClear, onAddFiles, onAddFolder, onShowLog, onRemove, unpackMode }) {
  const inProgress = rows.filter(r => r.status !== 'queued').length;
  const queueTitle = unpackMode ? 'Unpack Queue' : 'Conversion Queue';
  return (
    <div className="queue">
      <div className="queue-header" style={{ position: 'relative' }}>
        {canClear && (
          <div className="queue-actions left">
            <button className="queue-action-btn" onClick={onAddFiles} title="Add files">
              <FileIcon color="#9893FC" /> {unpackMode ? 'Add DDS' : 'Add Files'}
            </button>
            <button className="queue-action-btn" onClick={onAddFolder} title="Add folder">
              <FolderIcon color="#9893FC" /> Add Folder
            </button>
          </div>
        )}
        {queueTitle} <span className="count">{inProgress} of {rows.length}</span>
        {canClear && (
          <button className="queue-clear-btn" onClick={onClear} title="Clear queue">
            Clear ✕
          </button>
        )}
      </div>
      <div className="queue-list">
        {rows.map(r => <ModernQueueRow key={r.set_id} row={r} onShowLog={onShowLog} onRemove={onRemove} unpackMode={unpackMode} />)}
      </div>
    </div>
  );
}

window.ModernHeroEmpty = ModernHeroEmpty;
window.ModernQueue = ModernQueue;
