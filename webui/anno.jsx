// Anno theme components

function AnnoChrome() {
  return null;
}

function AnnoHeroEmpty({ dragOver, onPickFiles, onPickFolder }) {
  return (
    <div className="hero-stack">
      <div className="hero-icon">
        <img src="assets/anno_hero_logo.png" alt="Anno A logo" />
      </div>
      <div className="hero-headline">
        {dragOver ? 'Release to Import Images' : 'Drop Image Files or Folders'}
      </div>
      <div className="hero-body" style={dragOver ? { whiteSpace: 'nowrap', maxWidth: 'none' } : {}}>
        {dragOver
          ? 'Drop your images to begin packing'
          : "We'll auto-detect Diffuse, Normal, and Packed Metal+Roughness maps and convert them to game-ready DDS textures. PNG, JPG, TGA, BMP and TIFF all supported."}
      </div>
      {!dragOver && (
        <div className="hero-buttons">
          <button className="btn-ghost" onClick={onPickFiles}>
            <FileIcon color="#C9A152" />
            Pick Files
          </button>
          <button className="btn-ghost" onClick={onPickFolder}>
            <FolderIcon color="#C9A152" />
            Pick Folder
          </button>
        </div>
      )}
    </div>
  );
}

const DDS_LABEL = {
  diff: 'DIFFUSE.DDS',
  norm: 'NORMAL.DDS',
  metal: 'METAL.DDS',
  height: 'HEIGHT.DDS',
};

/** Show every detected map as its own chip (up to 6). Each chip carries the
 *  exact map type detected so the user can see what was found. Used by both
 *  Anno and Modern queue rows. */
// Each chip carries a list of icon paths. Single-channel chips have one
// path; packed chips (rm / orm) render multiple icons with a '+' between
// them so the user can see at a glance which channels were combined.
const INPUT_CHIP_DEFS = {
  diff:    { kind: 'diffuse',  label: 'Diffuse',      icons: ['assets/icon_diffuse.png']   },
  opacity: { kind: 'diffuse',  label: 'Opacity',      icons: ['assets/icon_opacity.png']   },
  norm:    { kind: 'normal',   label: 'Normal',       icons: ['assets/icon_normal.png']    },
  metal:   { kind: 'packed',   label: 'Metal',        icons: ['assets/icon_metal.png']     },
  rough:   { kind: 'packed',   label: 'Roughness',    icons: ['assets/icon_roughness.png'] },
  // Glossiness = inverse of roughness — same icon, semantically equivalent.
  gloss:   { kind: 'packed',   label: 'Glossiness',   icons: ['assets/icon_roughness.png'] },
  ao:      { kind: 'packed',   label: 'AO',           icons: ['assets/icon_ao.png']        },
  height:  { kind: 'height',   label: 'Height',       icons: ['assets/icon_height.png']    },
  // Packed maps: composite icons showing the channels combined.
  rm:      { kind: 'packed',   label: 'Packed M+R',   icons: ['assets/icon_metal.png', 'assets/icon_roughness.png'] },
  orm:     { kind: 'packed',   label: 'Packed O+R+M', icons: ['assets/icon_ao.png', 'assets/icon_roughness.png', 'assets/icon_metal.png'] },
};

function maybeInputChips(inputs) {
  const out = [];
  for (const t of (inputs || [])) {
    const def = INPUT_CHIP_DEFS[t];
    if (def) out.push({ ...def, type: t });
  }
  return out.slice(0, 6);
}

function AnnoQueueRow({ row, onShowLog }) {
  const labelText =
    row.status === 'done' ? 'COMPLETED' :
    row.status === 'queued' ? 'WAITING IN QUEUE' :
    (row.label || row.status.toUpperCase());

  const inputs = maybeInputChips(row.input_map_types);
  const outputs = row.output_map_types || ['diff', 'norm', 'metal'];
  const done = new Set(row.maps_done || []);

  return (
    <div className="queue-row" data-status={row.status}>
      <div>
        <div className="row-name">{row.name}</div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {inputs.map((c, i) => (
            <span key={`${c.type}-${i}`} className="row-input-chip">
              {(c.icons || []).map((p, j) => (
                <React.Fragment key={j}>
                  {j > 0 && <span className="chip-plus">+</span>}
                  <img src={p} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                </React.Fragment>
              ))}
              <span className="label">{c.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="row-output-label">Output DDS</div>
        {outputs.map(mt => (
          <div key={mt} className="dds-chip">
            <span className="dds-badge">DDS</span>
            {DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`}
            {(row.status === 'done' || done.has(mt)) && <span className="check">✓</span>}
          </div>
        ))}
      </div>

      <div className="row-status" data-status={row.status}>
        <Donut pct={row.pct} status={row.status} theme="anno" />
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
            <div className="eta" style={{color: 'var(--red-error)', cursor: 'pointer', textDecoration: 'underline'}}
                 onClick={() => onShowLog && onShowLog(row)}>
              See log ↗
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnoQueue({ rows, onClear, canClear, onAddFiles, onAddFolder, onShowLog }) {
  const inProgress = rows.filter(r => r.status !== 'queued').length;
  return (
    <div className="queue">
      <div className="queue-header" style={{ textAlign: 'center', position: 'relative' }}>
        {canClear && (
          <div className="queue-actions left">
            <button className="queue-action-btn" onClick={onAddFiles} title="Add files">
              <FileIcon color="#E6C57A" /> Add Files
            </button>
            <button className="queue-action-btn" onClick={onAddFolder} title="Add folder">
              <FolderIcon color="#E6C57A" /> Add Folder
            </button>
          </div>
        )}
        Conversion Queue
        <span className="diamond">◆</span>
        <span className="count">{inProgress} of {rows.length}</span>
        {canClear && (
          <button className="queue-clear-btn" onClick={onClear} title="Clear queue">
            Clear ✕
          </button>
        )}
      </div>
      <div className="queue-list">
        {rows.map(r => <AnnoQueueRow key={r.set_id} row={r} onShowLog={onShowLog} />)}
      </div>
    </div>
  );
}

window.AnnoChrome = AnnoChrome;
window.AnnoHeroEmpty = AnnoHeroEmpty;
window.AnnoQueue = AnnoQueue;
window.maybeInputChips = maybeInputChips;
window.DDS_LABEL = DDS_LABEL;
