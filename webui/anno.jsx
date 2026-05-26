// Anno theme components

function AnnoChrome() {
  return null;
}

function AnnoHeroEmpty({ dragOver, onPickFiles, onPickFolder, unpackMode }) {
  return (
    <div className="hero-stack">
      <div className="hero-icon">
        <img src="assets/anno_hero_logo.png" alt="Anno A logo" />
      </div>
      <div className="hero-headline">
        {dragOver
          ? (unpackMode ? 'Release to Import DDS Files' : 'Release to Import Images')
          : (unpackMode ? 'Drop DDS Files or Folders' : 'Drop Image Files or Folders')}
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
            <FileIcon color="#C9A152" />
            {unpackMode ? 'Pick DDS Files' : 'Pick Files'}
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
  diff:   'DIFFUSE.DDS',
  norm:   'NORMAL.DDS',
  metal:  'METAL.DDS',
  height: 'HEIGHT.DDS',
  mask:   'MASK.DDS',
};

const PNG_OUTPUT_LABEL = {
  diffuse:    'DIFFUSE.PNG',
  opacity:    'OPACITY.PNG',
  normal:     'NORMAL.PNG',
  rough:      'ROUGHNESS.PNG',
  metal:      'METAL.PNG',
  ao:         'AO.PNG',
  height:     'HEIGHT.PNG',
  emission:   'EMISSION.PNG',
  mask_alpha: 'MASK_ALPHA.PNG',
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
  norm:    { kind: 'normal',   label: 'Normal',       icons: ['assets/icon_normals.png']    },
  metal:   { kind: 'packed',   label: 'Metal',        icons: ['assets/icon_metal.png']     },
  rough:   { kind: 'packed',   label: 'Roughness',    icons: ['assets/icon_roughness.png'] },
  // Glossiness = inverse of roughness — same icon, semantically equivalent.
  gloss:   { kind: 'packed',   label: 'Glossiness',   icons: ['assets/icon_roughness.png'] },
  ao:      { kind: 'packed',   label: 'AO',           icons: ['assets/icon_ao.png']        },
  height:  { kind: 'height',   label: 'Height',       icons: ['assets/icon_height.png']    },
  // Packed maps: composite icons showing the channels combined.
  rm:       { kind: 'packed',    label: 'Packed M+R',   icons: ['assets/icon_metal.png', 'assets/icon_roughness.png'] },
  orm:      { kind: 'packed',    label: 'Packed O+R+M', icons: ['assets/icon_ao.png', 'assets/icon_roughness.png', 'assets/icon_metal.png'] },
  emission: { kind: 'emission',  label: 'Emission',     icons: ['assets/icon_emission.png'] },
};

// Unpack-mode: icons showing what's packed INSIDE each Anno DDS type
const DDS_UNPACK_INPUT_DEFS = {
  diff:   { label: 'Diffuse',  icons: ['assets/icon_diffuse.png', 'assets/icon_opacity.png']      },
  norm:   { label: 'Normal',   icons: ['assets/icon_normals.png',  'assets/icon_roughness.png']    },
  metal:  { label: 'Metal',    icons: ['assets/icon_metal.png',   'assets/icon_ao.png']           },
  height: { label: 'Height',   icons: ['assets/icon_height.png']                                  },
  mask:   { label: 'Mask',     icons: ['assets/icon_emission.png']                               },
};

// Output DDS chips (pack mode) — multi-icon to show what's packed inside each file
const DDS_OUTPUT_ICONS = {
  diff:   ['assets/icon_diffuse.png', 'assets/icon_opacity.png'],
  norm:   ['assets/icon_normals.png',  'assets/icon_roughness.png'],
  metal:  ['assets/icon_metal.png',   'assets/icon_ao.png'],
  height: ['assets/icon_height.png'],
  mask:   ['assets/icon_emission.png'],
};

// Output PNG chips (unpack mode) — single icon per extracted channel
const PNG_OUTPUT_ICONS = {
  diffuse:    'assets/icon_diffuse.png',
  opacity:    'assets/icon_opacity.png',
  normal:     'assets/icon_normals.png',
  rough:      'assets/icon_roughness.png',
  metal:      'assets/icon_metal.png',
  ao:         'assets/icon_ao.png',
  height:     'assets/icon_height.png',
  emission:   'assets/icon_emission.png',
  mask_alpha: 'assets/icon_opacity.png',
};

/** Compute which icons to show on a pack-mode output DDS chip.
 *  Only shows the secondary channel (opacity / roughness / ao) when the
 *  corresponding input map was actually provided — avoids misleading the user. */
function getDdsOutputIcons(mt, inputTypes) {
  const inp = new Set(inputTypes || []);
  switch (mt) {
    case 'diff':
      return inp.has('opacity')
        ? ['assets/icon_diffuse.png', 'assets/icon_opacity.png']
        : ['assets/icon_diffuse.png'];
    case 'norm': {
      const hasRough = inp.has('rough') || inp.has('gloss') || inp.has('rm') || inp.has('orm');
      return hasRough
        ? ['assets/icon_normals.png', 'assets/icon_roughness.png']
        : ['assets/icon_normals.png'];
    }
    case 'metal': {
      const hasAo = inp.has('ao') || inp.has('orm');
      return hasAo
        ? ['assets/icon_metal.png', 'assets/icon_ao.png']
        : ['assets/icon_metal.png'];
    }
    case 'height': return ['assets/icon_height.png'];
    case 'mask':   return ['assets/icon_emission.png'];
    default:       return [];
  }
}

function maybeInputChips(inputs) {
  const out = [];
  for (const t of (inputs || [])) {
    const def = INPUT_CHIP_DEFS[t];
    if (def) out.push({ ...def, type: t });
  }
  return out.slice(0, 6);
}

function AnnoQueueRow({ row, onShowLog, onRemove, unpackMode }) {
  const labelText =
    row.status === 'done' ? (unpackMode ? 'UNPACKED' : 'COMPLETED') :
    row.status === 'queued' ? 'WAITING IN QUEUE' :
    (row.label || row.status.toUpperCase());

  const done = new Set(row.maps_done || []);

  // ── Pack mode: image inputs → DDS outputs ──────────────────────────────
  const packInputs = maybeInputChips(row.input_map_types);
  const packOutputs = row.output_map_types || ['diff', 'norm', 'metal'];

  // ── Unpack mode: DDS inputs → PNG outputs ──────────────────────────────
  const unpackInputs = row.input_dds_types || [];
  // When done, filter to only maps that were actually written (skips e.g.
  // fully-opaque opacity or trivially-uniform roughness channels).
  const unpackOutputs = row.status === 'done'
    ? (row.output_png_types || []).filter(pt => done.has(pt))
    : (row.output_png_types || []);

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
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 10 }}>
          {unpackMode
            ? unpackInputs.map(mt => {
                const def = DDS_UNPACK_INPUT_DEFS[mt] || { label: mt.toUpperCase(), icons: [] };
                return (
                  <span key={mt} className="row-input-chip">
                    {def.icons.map((p, j) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="chip-plus">+</span>}
                        <img src={p} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                      </React.Fragment>
                    ))}
                    <span className="label">{def.label}</span>
                  </span>
                );
              })
            : packInputs.map((c, i) => (
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

      {/* Column 2: output chips */}
      <div>
        <div className="row-output-label">{unpackMode ? 'Output PNG' : 'Output DDS'}</div>
        {unpackMode
          ? unpackOutputs.map(pt => {
              const icon = PNG_OUTPUT_ICONS[pt];
              return (
                <div key={pt} className="dds-chip">
                  {/* Fixed-width text col — "MASK_ALPHA.PNG" is the longest */}
                  <span style={{ width: 128, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {PNG_OUTPUT_LABEL[pt] || `${pt.toUpperCase()}.PNG`}
                  </span>
                  {/* Single icon col — always the same width so all chips align */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', width: 22, marginLeft: 16, flexShrink: 0 }}>
                    {icon && <img src={icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />}
                  </span>
                  {done.has(pt) && <span className="check">✓</span>}
                </div>
              );
            })
          : packOutputs.map(mt => {
              const icons = getDdsOutputIcons(mt, row.input_map_types);
              return (
                <div key={mt} className="dds-chip">
                  {/* Fixed-width text col — "DIFFUSE.DDS" is the longest */}
                  <span style={{ width: 100, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`}
                  </span>
                  {/* Two-column icon grid: [icon1 22px | + 12px | icon2 22px]
                      Empty cells always rendered so single-icon chips keep
                      the same column positions as two-icon chips. */}
                  <span style={{ display: 'inline-grid', gridTemplateColumns: '22px 12px 22px', alignItems: 'center', marginLeft: 16, flexShrink: 0 }}>
                    <img src={icons[0]} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                    <span style={{ textAlign: 'center', fontSize: 9, opacity: icons.length > 1 ? 0.5 : 0 }}>+</span>
                    {icons[1]
                      ? <img src={icons[1]} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                      : <span />}
                  </span>
                  {(row.status === 'done' || done.has(mt)) && <span className="check">✓</span>}
                </div>
              );
            })}
      </div>

      {/* Column 3: status */}
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

function AnnoQueue({ rows, onClear, canClear, onAddFiles, onAddFolder, onShowLog, onRemove, unpackMode }) {
  const inProgress = rows.filter(r => r.status !== 'queued').length;
  const queueTitle = unpackMode ? 'Unpack Queue' : 'Conversion Queue';
  return (
    <div className="queue">
      <div className="queue-header" style={{ textAlign: 'center', position: 'relative' }}>
        {canClear && (
          <div className="queue-actions left">
            <button className="queue-action-btn" onClick={onAddFiles} title="Add files">
              <FileIcon color="#E6C57A" /> {unpackMode ? 'Add DDS' : 'Add Files'}
            </button>
            <button className="queue-action-btn" onClick={onAddFolder} title="Add folder">
              <FolderIcon color="#E6C57A" /> Add Folder
            </button>
          </div>
        )}
        {queueTitle}
        <span className="diamond">◆</span>
        <span className="count">{inProgress} of {rows.length}</span>
        {canClear && (
          <button className="queue-clear-btn" onClick={onClear} title="Clear queue">
            Clear ✕
          </button>
        )}
      </div>
      <div className="queue-list">
        {rows.map(r => <AnnoQueueRow key={r.set_id} row={r} onShowLog={onShowLog} onRemove={onRemove} unpackMode={unpackMode} />)}
      </div>
    </div>
  );
}

window.AnnoChrome = AnnoChrome;
window.AnnoHeroEmpty = AnnoHeroEmpty;
window.AnnoQueue = AnnoQueue;
window.maybeInputChips = maybeInputChips;
window.DDS_LABEL = DDS_LABEL;
window.PNG_OUTPUT_LABEL = PNG_OUTPUT_LABEL;
