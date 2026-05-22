// Modern theme components

function ModernHeroEmpty({ dragOver, onPickFiles, onPickFolder }) {
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
        {dragOver ? 'Release to import images' : 'Drop image files or folders'}
      </div>
      <div className="hero-body" style={dragOver ? { whiteSpace: 'nowrap', maxWidth: 'none' } : {}}>
        {dragOver
          ? 'Drop your images to begin packing'
          : "We'll auto-detect Diffuse, Normal, and Packed Metal+Roughness maps and convert them to game-ready DDS textures. PNG, JPG, TGA, BMP and TIFF all supported."}
      </div>
      {!dragOver && (
        <div className="hero-buttons">
          <button className="btn-ghost" onClick={onPickFiles}>
            <FileIcon color="#9893FC" />
            Pick Files
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

function ModernQueueRow({ row, onShowLog }) {
  const labelText =
    row.status === 'done' ? 'COMPLETED' :
    row.status === 'queued' ? 'WAITING IN QUEUE' :
    (row.label || row.status.toUpperCase());

  const inputs = maybeInputChips(row.input_map_types);
  const outputs = row.output_map_types || ['diff', 'norm', 'metal'];
  const done = new Set(row.maps_done || []);

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
      <ModernCubeIcon size={26} color="#9CA3B0" />,   // metal
      <ModernCubeIcon size={26} color="#F2B65A" />,   // roughness
    ];
    if (t === 'orm')    return [
      <ModernSunIcon size={26} color="#6B7280" />,    // AO
      <ModernCubeIcon size={26} color="#F2B65A" />,   // roughness
      <ModernCubeIcon size={26} color="#9CA3B0" />,   // metal
    ];
    return [<ModernCubeIcon size={26} />];
  };

  return (
    <div className="queue-row" data-status={row.status}>
      <div>
        <div className="row-name">{row.name}</div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {inputs.map((c, i) => {
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

      <div>
        <div className="row-output-label">Output DDS</div>
        {outputs.map(mt => (
          <div key={mt} className="dds-chip">
            <span className="dds-badge">DDS</span>
            {DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`}
            {(row.status === 'done' || done.has(mt)) && <span className="check" style={{color:'#5DD49A'}}>✓</span>}
          </div>
        ))}
      </div>

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

function ModernQueue({ rows, onClear, canClear, onAddFiles, onAddFolder, onShowLog }) {
  const inProgress = rows.filter(r => r.status !== 'queued').length;
  return (
    <div className="queue">
      <div className="queue-header" style={{ position: 'relative' }}>
        {canClear && (
          <div className="queue-actions left">
            <button className="queue-action-btn" onClick={onAddFiles} title="Add files">
              <FileIcon color="#9893FC" /> Add Files
            </button>
            <button className="queue-action-btn" onClick={onAddFolder} title="Add folder">
              <FolderIcon color="#9893FC" /> Add Folder
            </button>
          </div>
        )}
        Conversion Queue <span className="count">{inProgress} of {rows.length}</span>
        {canClear && (
          <button className="queue-clear-btn" onClick={onClear} title="Clear queue">
            Clear ✕
          </button>
        )}
      </div>
      <div className="queue-list">
        {rows.map(r => <ModernQueueRow key={r.set_id} row={r} onShowLog={onShowLog} />)}
      </div>
    </div>
  );
}

window.ModernHeroEmpty = ModernHeroEmpty;
window.ModernQueue = ModernQueue;
