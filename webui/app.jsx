// Top-level app — pywebview edition.
// Bridges to Python via `window.pywebview.api`; receives push events via
// the globals window.__updateProgress / __onFilesDropped / __onBatchDone /
// __onDragEnter / __onDragLeave that the Python side calls through
// window.evaluate_js().

const LOD0_SIZE_OPTIONS = ['As input', '4096', '2048', '1024', '512', '256'];

function HelpDialog({ onClose, unpackMode }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="help-dialog" onClick={e => e.stopPropagation()}>
        <div className="help-title-row">
          <div className="help-title">{unpackMode ? 'Help — Unpack Mode' : 'Help & Channel Reference'}</div>
          <button className="help-close" onClick={onClose}>✕</button>
        </div>
        <div className="help-body">
          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>What this tool does</h3></div>
            {unpackMode ? (
              <p>Anno DDS Unpacker reads Anno-format DDS texture files and splits each one back into individual, properly-decoded PNG maps — Diffuse, Opacity, Normal, Roughness, Metal, AO, Height, and Emission. Normal maps are automatically converted from Anno's DirectX convention (Y-down) to the OpenGL convention (Y-up) that Blender and Maya use. Drop in <span className="code">_diff</span>, <span className="code">_norm</span>, <span className="code">_metal</span>, <span className="code">_height</span>, and <span className="code">_mask</span> DDS files and get clean, channel-correct PNGs ready for your 3D workflow.</p>
            ) : (
              <p>Anno DDS Packer converts standard PBR texture exports — from Blender, Substance, or any AI 3D generator — into the BC7-encoded DDS textures the Anno modding pipeline expects. It auto-detects which file is which, repacks channels into Anno's convention, generates the LOD chain, and writes the <span className="code">.dds</span> files you can drop straight into your mod folder. The <strong>Unpack</strong> mode does the reverse: it reads Anno DDS files and splits them back into individual PNG maps.</p>
            )}
          </section>

          {unpackMode && (
            <section className="help-section">
              <div className="help-section-title"><span className="strip" /><h3>Why not just use the RDA extractor?</h3></div>
              <p>The RDA extractor (the popular GitHub tool for pulling assets out of Anno game files) exports DDS textures as PNG — but it does a raw decode with no channel awareness. That means:</p>
              <ul style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.7 }}>
                <li>The <strong>Diffuse DDS</strong> contains Opacity in its alpha channel. The RDA extractor bakes this alpha straight into the PNG — you get a transparent PNG, not an Albedo texture. Trying to use it in Blender gives you a partially transparent material.</li>
                <li>The <strong>Normal DDS</strong> alpha contains Glossiness data. When baked into the PNG it corrupts the appearance of the normal in any standard viewer.</li>
                <li>The <strong>Metal DDS</strong> alpha contains AO. Same problem — the AO gets baked into what looks like a Metalness map.</li>
                <li>Anno uses the <strong>DirectX normal convention</strong> (green channel Y-down). The RDA extractor outputs these as-is, so normals appear inverted in Blender and Maya (which expect OpenGL, Y-up). You'd have to flip the green channel manually.</li>
              </ul>
              <p style={{ marginTop: 8 }}>This tool handles all of that for you: it splits every DDS into its correct individual maps, discards trivially-uniform alpha channels (so you don't get a pointless fully-opaque file), and converts normals to OpenGL so they work immediately in your 3D app.</p>
            </section>
          )}

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>What is a DDS?</h3></div>
            <p>DirectDraw Surface — a GPU-native image container. Anno uses BC7, a high-quality block-compressed format that stores 4×4 pixel tiles with per-block compression modes. Encoding is slow; decoding is free on the GPU. That's why the game ships these instead of PNGs.</p>
          </section>

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>Anno channel-packing convention</h3></div>
            <table className="help-table">
              <thead><tr><th>DDS</th><th>RGB</th><th>A</th></tr></thead>
              <tbody>
                <tr><td>Diffuse</td><td>Albedo (sRGB)</td><td>Opacity</td></tr>
                <tr><td>Metal</td><td>Metalness (grayscale, linear)</td><td>Ambient Occlusion</td></tr>
                <tr><td>Normal</td><td>DirectX tangent normal (linear)</td><td>Glossiness (= 1 − roughness)</td></tr>
                <tr><td>Height</td><td>Grayscale displacement (linear)</td><td>—</td></tr>
                <tr><td>Mask</td><td>Emission / night-glow mask (linear)</td><td>Secondary night mask</td></tr>
              </tbody>
            </table>
          </section>

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>Filename suffixes the auto-detector recognises</h3></div>
            <table className="help-table">
              <thead><tr><th>Channel</th><th>Suffixes</th></tr></thead>
              <tbody>
                <tr><td>Diffuse / albedo</td><td><span className="code">_diff</span> <span className="code">_diffuse</span> <span className="code">_albedo</span> <span className="code">_color</span> <span className="code">_basecolor</span> <span className="code">_bc</span></td></tr>
                <tr><td>Opacity</td><td><span className="code">_opacity</span> <span className="code">_opc</span> <span className="code">_alpha</span></td></tr>
                <tr><td>Metalness</td><td><span className="code">_metal</span> <span className="code">_metalness</span> <span className="code">_metallic</span></td></tr>
                <tr><td>Ambient occlusion</td><td><span className="code">_ao</span> <span className="code">_ambientocclusion</span></td></tr>
                <tr><td>Normal</td><td><span className="code">_norm</span> <span className="code">_normal</span> <span className="code">_nrm</span></td></tr>
                <tr><td>Glossiness / Roughness</td><td><span className="code">_gloss</span> <span className="code">_glossiness</span> <span className="code">_rough</span> <span className="code">_roughness</span></td></tr>
                <tr><td>Height / Displacement</td><td><span className="code">_height</span> <span className="code">_disp</span> <span className="code">_displacement</span></td></tr>
                <tr><td>Packed Rough+Metal</td><td><span className="code">_rm</span></td></tr>
                <tr><td>Packed Occ+Rough+Metal</td><td><span className="code">_orm</span></td></tr>
                <tr><td>Emission / night mask</td><td><span className="code">_emission</span> <span className="code">_emissive</span> <span className="code">_nightmask</span></td></tr>
              </tbody>
            </table>
            <p style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>Matching is case-insensitive and tolerant of <span className="code">.</span>, <span className="code">_</span>, <span className="code">-</span> separators. Base name = filename minus suffix minus extension; files that share a base name are bundled into a "set".</p>
          </section>

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>Packed map handling</h3></div>
            <p><span className="code">_rm</span> (G = roughness → glossiness, B = metalness) → <span className="code">metal.RGB</span> ← B replicated; <span className="code">normal.A</span> ← 1 − G.</p>
            <p><span className="code">_orm</span> (R = AO, G = roughness, B = metalness) → <span className="code">metal.RGB</span> ← B replicated; <span className="code">metal.A</span> ← R; <span className="code">normal.A</span> ← 1 − G.</p>
          </section>

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>Missing-channel synthesis</h3></div>
            <p>If only <span className="code">_diff</span> and <span className="code">_rm</span> are supplied (no <span className="code">_normal</span>), the tool synthesises a flat normal with RGB = (128, 128, 255) and packs <span className="code">1 − G_rm</span> into its alpha. NORMAL.DDS will be valid; only the surface micro-detail is missing. You'll get a one-time warning per set.</p>
          </section>

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>LODs</h3></div>
            <p>LODs are the texture's mip chain pre-baked at decreasing resolutions: LOD0 = 1×, LOD1 = ½×, LOD2 = ¼×, LOD3 = ⅛×, LOD4 = ¹⁄₁₆×. Disabling LODs saves disk space but distant LODs look blurry. <strong>LOD0 is always written</strong> — its checkbox is locked on.</p>
          </section>

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>Fast mode</h3></div>
            <p>BC7 encoding sweeps many block modes to find the best per-tile. Fast mode prunes the search to modes that statistically win ≥ 95% of the time. Output is visually identical in 99.x% of cases on Anno-style material textures. Speedup ≈ <strong>1.5×</strong>. Fast mode is always enabled — for Anno textures there is no perceptible quality difference.</p>
          </section>

          <section className="help-section">
            <div className="help-section-title"><span className="strip" /><h3>Parallel sets</h3></div>
            <p>A "set" is one base-name's worth of inputs (diffuse + normal + …). The encoder runs multiple sets concurrently — one worker thread per GPU encode queue. The cap shown in the footer is <span className="code">min(cpu_count(), 8)</span>. Raise it in <span className="code">%APPDATA%/AnnoDDSPacker/settings.json → parallelSetsMax</span>.</p>
          </section>
        </div>
        <div className="help-actions">
          <button className="btn-got-it" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

function FolderPickerMenu({ onSameAsInput, onPickFolder, sameAsInput, onClose }) {
  return (
    <div className="picker-flyout" onClick={e => e.stopPropagation()}>
      <button className="picker-row" onClick={() => { onPickFolder(); onClose(); }}>
        <span className="picker-icon">📁</span> Choose folder…
      </button>
      <button className="picker-row" onClick={() => { onSameAsInput(!sameAsInput); onClose(); }}>
        <span className="picker-check">{sameAsInput ? '✓' : ' '}</span> Same as input folder
      </button>
    </div>
  );
}

function Header({ theme, lodOn, setLodOn, outputFolder, sameAsInput, setSameAsInput, lod0Size, setLod0Size, onHelp, onPickFolder, unpackMode, onModeSwitch }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lod0Open, setLod0Open] = useState(false);

  // Close any open dropdown when the user clicks anywhere outside it.
  // setTimeout(0) defers adding the listener until after the current click
  // event finishes, so the opening click doesn't immediately re-close it.
  useEffect(() => {
    if (!pickerOpen && !lod0Open) return;
    const close = () => { setPickerOpen(false); setLod0Open(false); };
    const tid = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(tid); document.removeEventListener('click', close); };
  }, [pickerOpen, lod0Open]);

  return (
    <>
      <div className="header">
        <div className="brand">
          <div className="brand-logo anno">
            <img src="assets/anno_brand_logo.png" alt="" />
          </div>
          <div className="brand-text">
            <div className="brand-title">Anno DDS Packer</div>
            <div className="brand-subtitle">
              {unpackMode
                ? (theme === 'anno' ? 'Unpack DDS Textures to PNG Maps' : 'Unpack DDS textures to PNG maps')
                : (theme === 'anno' ? 'Convert PNG Maps to Game-Ready DDS Textures' : 'Convert PNG maps to game-ready DDS textures')}
            </div>
          </div>
        </div>

        <div className="settings" style={{ left: 500 }}>
          <div className="setting-block">
            <div className="setting-label">Output Folder</div>
            <div className="entry-row">
              <input className="entry"
                     value={sameAsInput ? '' : outputFolder}
                     disabled={sameAsInput}
                     placeholder={sameAsInput ? '(same folder as each input)' : 'Paste or type a path…'}
                     onChange={(e) => setOutputFolder(e.target.value)} />
              <button className="icon-btn" onClick={() => setPickerOpen(o => !o)}>…</button>
              {pickerOpen && (
                <FolderPickerMenu
                  sameAsInput={sameAsInput}
                  onSameAsInput={setSameAsInput}
                  onPickFolder={onPickFolder}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
          </div>
          <div className="setting-block">
            <div className="setting-label">LOD0 Resolution</div>
            <div className="dropdown" onClick={() => setLod0Open(o => !o)}>
              {lod0Size}
              {lod0Open && (
                <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                  {LOD0_SIZE_OPTIONS.map(opt => (
                    <div key={opt} className="dropdown-item"
                         onClick={() => { setLod0Size(opt); setLod0Open(false); }}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="setting-block">
            <div className="setting-label">LOD Levels</div>
            <div className="lod-row">
              {[0,1,2,3,4].map(n => (
                <LodChip key={n} n={n} on={lodOn[n]} locked={n===0} theme={theme}
                  onToggle={() => setLodOn(s => ({ ...s, [n]: !s[n] }))} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="mode-toggle-block">
          <div className="setting-label">Mode</div>
          <div className="mode-toggle">
            <button className={`mode-btn${!unpackMode ? ' active' : ''}`}
                    onClick={() => onModeSwitch(false)}>Pack</button>
            <button className={`mode-btn${unpackMode ? ' active' : ''}`}
                    onClick={() => onModeSwitch(true)}>Unpack</button>
          </div>
        </div>
        <button className="icon-btn" onClick={onHelp}>?</button>
      </div>

      {theme === 'anno' && <div className="anno-header-divider" />}
      {theme === 'modern' && <div className="modern-header-divider" />}
    </>
  );
}

function Footer({ theme, mode, vram, parallel, onToggleTheme }) {
  const working = mode === 'converting';
  const vramText = (vram && vram.total)
    ? `${vram.used.toFixed(1)} / ${vram.total.toFixed(1)} GB`
    : '— / — GB';
  const vramPct = (vram && vram.total) ? Math.min(1, vram.used / vram.total) * 100 : 0;
  return (
    <div className="footer">
      <div className="status" data-state={working ? 'working' : 'ready'}>
        <PulseDot />
        {working ? 'Working' : 'Ready'}
      </div>
      <div className="footer-center">
        <div className="vram">
          <span className="vram-label">VRAM</span>
          <div className="vram-bar"><div className="vram-fill" style={{ width: `${vramPct}%` }} /></div>
          <span className="vram-value">{vramText}</span>
        </div>
        <div className="sep-dot" />
        <div className="parallel">
          <span>Parallel Sets</span>
          <span className="parallel-glyph"><ParallelStackIcon /></span>
          <span className="value">{parallel.active} / {parallel.cap}</span>
          {working && theme === 'modern' && <span className="gpu-pulse" />}
        </div>
      </div>
      <div className="theme-switch" onClick={onToggleTheme}>
        <span>{theme === 'anno' ? 'ANNO' : 'MODERN'}</span>
        <span className="pill" />
      </div>
    </div>
  );
}

function ConvertButton({ theme, mode, enabled, onClick, unpackMode }) {
  const running = mode === 'converting';
  const cls = `convert-bar ${running ? 'running' : (enabled ? 'ready' : '')}`;
  const caption = running
    ? (unpackMode ? 'Unpacking…' : 'Converting…')
    : (unpackMode ? 'Unpack to PNG' : 'Convert to DDS');
  return (
    <>
      <div className="diamond-divider above">
        <div className="line left" />
        <div className="line right" />
        <img src="assets/diamond.png" alt="" />
      </div>
      <div className={cls} onClick={(running || !enabled) ? undefined : onClick}>
        {theme === 'anno' && (
          <>
            <div className="convert-laurel left">
              <img src="assets/laurel_left.png" alt="" />
            </div>
            <div className="convert-laurel right">
              <img src="assets/laurel_right.png" alt="" />
            </div>
          </>
        )}
        {running && <ConvertSpinner />}
        <span className="convert-caption">{caption}</span>
      </div>
      <div className="diamond-divider below">
        <div className="line left" />
        <div className="line right" />
        <img src="assets/diamond.png" alt="" />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend bridge helpers

async function api(method, ...args) {
  // pywebview drops the bridge during page reload; tolerate that gracefully
  if (!window.pywebview || !window.pywebview.api) return null;
  try {
    return await window.pywebview.api[method](...args);
  } catch (e) {
    console.error(`api.${method} failed`, e);
    return null;
  }
}

async function waitForApi(timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.load_settings) {
      return true;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState('anno');
  const [mode, setMode] = useState('idle');             // idle | drag | converting
  const [lodOn, setLodOn] = useState({ 0:true, 1:false, 2:false, 3:false, 4:false });
  const [sameAsInput, setSameAsInput] = useState(true);
  const [outputFolder, setOutputFolder] = useState('');
  const [lod0Size, setLod0Size] = useState('As input');
  const [helpOpen, setHelpOpen] = useState(false);
  const [queueRows, setQueueRows] = useState([]);       // [{set_id, name, input_map_types, output_map_types, status, pct, label, eta_text, maps_done, queue_position}]
  const [vram, setVram] = useState({ used: 0, total: 0 });
  const [parallel, setParallel] = useState({ active: 0, cap: 8 });
  const [errorModal, setErrorModal] = useState(null);   // {name, text} or null
  const [unpackMode, setUnpackMode] = useState(false);
  const [overwritePending, setOverwritePending] = useState(null); // {count, examples} | null
  const [inspector, setInspector] = useState(null);    // image-inspector descriptor | null

  // Ref so async callbacks (closures) always see the current unpackMode
  const unpackModeRef = useRef(false);
  useEffect(() => { unpackModeRef.current = unpackMode; }, [unpackMode]);

  // — Load settings from Python on mount —
  useEffect(() => {
    (async () => {
      const ok = await waitForApi();
      if (!ok) {
        setReady(true);
        return;
      }
      const s = await api('load_settings');
      if (s) {
        setTheme(s.theme_name || 'anno');
        setSameAsInput(s.same_as_input !== false);
        setOutputFolder(s.output_dir || '');
        setLod0Size(s.lod0_size || 'As input');
        const lods = s.selected_lods || [0];
        const map = { 0:true, 1:false, 2:false, 3:false, 4:false };
        for (const n of lods) map[n] = true;
        setLodOn(map);
      }
      const cap = await api('parallel_cap');
      if (cap) setParallel(p => ({ ...p, cap }));
      setReady(true);
    })();
  }, []);

  // — Signal Qt to hide the native splash once React has painted —
  useEffect(() => {
    (window.__bridgeReady || Promise.resolve(null)).then(function(bridge) {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          if (bridge && bridge.notify_ready) {
            console.log('[react] calling notify_ready');
            bridge.notify_ready();
          } else {
            console.warn('[react] bridge not available; Python timeout will dismiss splash');
          }
        });
      });
    });
  }, []);

  // — Splash belt-and-suspenders —
  useEffect(() => {
    if (!ready) return;
    if (window.__hideSplash) window.__hideSplash();
  }, [ready]);

  // — Push setting changes back to Python on every update —
  useEffect(() => {
    if (!ready) return;
    const lods = Object.entries(lodOn).filter(([, v]) => v).map(([k]) => parseInt(k, 10)).sort();
    api('save_settings', {
      theme_name: theme,
      selected_lods: lods,
      lod0_size: lod0Size,
      same_as_input: sameAsInput,
      output_dir: outputFolder,
    });
  }, [ready, theme, lodOn, lod0Size, sameAsInput, outputFolder]);

  // — VRAM + parallel-sets polling —
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const v = await api('vram');
      if (v && (v.total || v.used)) setVram(v);
      const p = await api('parallel_status');
      if (p) setParallel(p);
      setTimeout(tick, 1000);
    };
    tick();
    return () => { stop = true; };
  }, []);

  // — Drag-and-drop (HTML5) —
  useEffect(() => {
    let dragTimer = null;
    const onOver = (e) => {
      e.preventDefault();
      if (mode === 'converting') return;
      setMode('drag');
      if (dragTimer) clearTimeout(dragTimer);
      dragTimer = setTimeout(() => {
        setMode('idle');
        dragTimer = null;
      }, 120);
    };

    const onDrop = async (e) => {
      e.preventDefault();
      if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; }
      if (mode === 'converting') {
        setMode('converting');
        return;
      }
      setMode('idle');

      // In Tauri, native drag-drop fires via tauri://drag-drop → __onFilesDropped
      // with real disk paths. The HTML5 path is a fallback and only handles bytes
      // (no real paths). In unpack mode we always need real paths, so skip HTML5.
      if (unpackModeRef.current) {
        // If images were dropped in unpack mode, auto-switch to pack and fall through
        const files = Array.from(e.dataTransfer.files || []);
        if (files.some(f => /\.(png|jpe?g|tga|bmp|tiff?|webp)$/i.test(f.name))) {
          setUnpackMode(false);
          unpackModeRef.current = false;
          await api('clear_queue');
          setQueueRows([]);
          // fall through — HTML5 image processing below will handle the files
        } else {
          return;
        }
      }

      // Pack mode HTML5 fallback: skip if native already fired
      if (window.__nativeDropFiredAt && (Date.now() - window.__nativeDropFiredAt < 1500)) {
        return;
      }

      const items = e.dataTransfer.items;
      const collected = [];
      async function walk(entry, prefix) {
        if (entry.isFile) {
          const file = await new Promise((res) => entry.file(res));
          collected.push({ path: prefix + file.name, file });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          let chunk;
          do {
            chunk = await new Promise((res) => reader.readEntries(res));
            for (const sub of chunk) await walk(sub, prefix + entry.name + '/');
          } while (chunk.length);
        }
      }
      const rootTasks = [];
      for (const it of items) {
        if (it.kind !== 'file') continue;
        const entry = it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
        if (entry) rootTasks.push(walk(entry, ''));
        else {
          const f = it.getAsFile();
          if (f) collected.push({ path: f.name, file: f });
        }
      }
      await Promise.all(rootTasks);

      const okExt = /\.(png|jpe?g|tga|bmp|tiff?|webp)$/i;
      const usable = collected.filter(({ path }) => okExt.test(path));
      if (!usable.length) {
        // DDS dropped in pack mode via HTML5 — auto-switch (can't process via bytes)
        if (collected.some(({ path }) => /\.dds$/i.test(path))) {
          setUnpackMode(true);
          unpackModeRef.current = true;
          await api('clear_unpack_queue');
          setQueueRows([]);
          // Tauri native drop will have already fired __onFilesDropped with real paths;
          // this HTML5 path is just a belt-and-suspenders mode switch.
        }
        return;
      }

      const payload = await Promise.all(usable.map(async ({ path, file }) => {
        const buf = await file.arrayBuffer();
        let bin = '';
        const view = new Uint8Array(buf);
        const CHUNK = 32 * 1024;
        for (let i = 0; i < view.length; i += CHUNK) {
          bin += String.fromCharCode.apply(null, view.subarray(i, i + CHUNK));
        }
        return { path, data: btoa(bin) };
      }));

      const rows = await api('receive_dropped_files', payload);
      if (rows && rows.length) setQueueRows(rows);
    };

    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      if (dragTimer) clearTimeout(dragTimer);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [mode]);

  // — Globals Python / Tauri push to —
  useEffect(() => {
    window.__onFilesDropped = async (paths) => {
      // Called by Tauri's tauri://drag-drop event with real disk paths.
      window.__nativeDropFiredAt = Date.now();
      const isUnpack = unpackModeRef.current;
      const isDds  = p => /\.dds$/i.test(p);
      const isImg  = p => /\.(png|jpe?g|tga|bmp|tiff?|webp)$/i.test(p);
      const filtered = isUnpack
        ? paths.filter(isDds)
        : paths.filter(isImg);

      if (!filtered.length) {
        // Auto-switch mode and process when the user drops the wrong file type.
        const ddsFiles = paths.filter(isDds);
        const imgFiles = paths.filter(isImg);
        if (!isUnpack && ddsFiles.length) {
          // Pack mode + DDS dropped → switch to Unpack and scan
          setUnpackMode(true);
          unpackModeRef.current = true;
          await api('clear_unpack_queue');
          setQueueRows([]);
          const rows = await api('scan_dds_paths', ddsFiles);
          setMode('idle');
          if (rows && rows.length) setQueueRows(rows);
        } else if (isUnpack && imgFiles.length) {
          // Unpack mode + images dropped → switch to Pack and scan
          setUnpackMode(false);
          unpackModeRef.current = false;
          await api('clear_queue');
          setQueueRows([]);
          const rows = await api('scan_paths', imgFiles);
          setMode('idle');
          if (rows && rows.length) setQueueRows(rows);
        } else {
          setMode('idle');
        }
        return;
      }
      const rows = await api(isUnpack ? 'scan_dds_paths' : 'scan_paths', filtered);
      setMode('idle');
      if (rows && rows.length) setQueueRows(rows);
    };
    window.__nativeDragEnter = () => { if (mode !== 'converting') setMode('drag'); };
    window.__nativeDragLeave = () => { if (mode !== 'converting') setMode('idle'); };
    window.__updateProgress = (ev) => {
      setQueueRows(prev => prev.map(r => {
        if (r.set_id !== ev.set_id) return r;
        return {
          ...r,
          status: ev.status,
          pct: ev.pct,
          label: ev.label,
          eta_text: ev.eta_text,
          maps_done: ev.maps_done || r.maps_done,
          error_text: ev.error_text || r.error_text,
          output_dir: ev.output_dir || r.output_dir,
        };
      }));
    };
    window.__onBatchDone = async () => {
      setMode('idle');
    };
    window.__openInspector = (desc) => setInspector(desc);
    return () => {
      delete window.__onFilesDropped;
      delete window.__updateProgress;
      delete window.__onBatchDone;
      delete window.__openInspector;
    };
  }, []);

  // — Mode switch: clears queue and switches pack ↔ unpack —
  const handleModeSwitch = async (toUnpack) => {
    if (mode === 'converting') return;
    setUnpackMode(toUnpack);
    await api(toUnpack ? 'clear_unpack_queue' : 'clear_queue');
    setQueueRows([]);
    setMode('idle');
  };

  const onPickFiles = async () => {
    if (unpackMode) {
      const paths = await api('pick_dds_files');
      if (paths && paths.length) {
        const rows = await api('scan_dds_paths', paths);
        if (rows) setQueueRows(rows);
      }
    } else {
      const paths = await api('pick_files');
      if (paths && paths.length) {
        const rows = await api('scan_paths', paths);
        if (rows) setQueueRows(rows);
      }
    }
  };

  const onPickFolder = async () => {
    const path = await api('pick_folder');
    if (path) {
      setOutputFolder(path);
      setSameAsInput(false);
    }
  };

  const onScanFolder = async () => {
    const path = await api('pick_scan_folder');
    if (path) {
      const rows = await api(unpackMode ? 'scan_dds_paths' : 'scan_paths', [path]);
      if (rows) setQueueRows(rows);
    }
  };

  // Same as Pick Files / Pick Folder but always APPENDS — used inside the queue
  const onAddFiles = onPickFiles;
  const onAddFolder = onScanFolder;

  const doConvert = () => {
    setMode('converting');
    api(unpackMode ? 'start_unpack' : 'start_convert', {});
  };

  const onConvert = async () => {
    if (!queueRows.length || mode === 'converting') return;
    const result = await api('check_conflicts');
    if (result && typeof result.count === 'number' && result.count > 0) {
      setOverwritePending(result);
      return;
    }
    doConvert();
  };

  const onClearQueue = async () => {
    if (mode === 'converting') return;
    await api(unpackMode ? 'clear_unpack_queue' : 'clear_queue');
    setQueueRows([]);
    setMode('idle');
  };

  const onRemoveRow = async (setId) => {
    if (mode === 'converting') return;
    await api(unpackMode ? 'remove_unpack_set' : 'remove_set', setId);
    setQueueRows(prev => prev.filter(r => r.set_id !== setId));
  };

  const showingQueue = queueRows.length > 0 || mode === 'converting';
  const dragOver = mode === 'drag';
  const themeClass = theme === 'anno' ? 'theme-anno' : 'theme-modern';

  // — Responsive stage scaling: keep 1600×1000 design pixels, scale to fit window —
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  useEffect(() => {
    const onResize = () => {
      if (!wrapRef.current || !stageRef.current) return;
      const W = wrapRef.current.clientWidth, H = wrapRef.current.clientHeight;
      if (!W || !H) return;
      const s = Math.min(W / 1600, H / 1000);
      stageRef.current.style.transform = `scale(${s})`;
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // — Layout —
  return (
    <div className={`stage-wrap ${themeClass}`} ref={wrapRef}>
      <div className="stage" ref={stageRef}>
        {theme === 'anno' && (
          <>
            <img className="anno-corner tl" src="assets/corner_1.png" alt="" />
            <img className="anno-corner tr" src="assets/corner_2.png" alt="" />
            <img className="anno-corner bl" src="assets/corner_3.png" alt="" />
            <img className="anno-corner br" src="assets/corner_4.png" alt="" />
          </>
        )}
        <div className="window">
          <Header
            theme={theme}
            lodOn={lodOn} setLodOn={setLodOn}
            outputFolder={outputFolder}
            sameAsInput={sameAsInput} setSameAsInput={setSameAsInput}
            lod0Size={lod0Size} setLod0Size={setLod0Size}
            onHelp={() => setHelpOpen(true)}
            onPickFolder={onPickFolder}
            unpackMode={unpackMode}
            onModeSwitch={handleModeSwitch}
          />

          <div className={`hero ${dragOver ? 'drag' : ''}`}>
            {theme === 'modern' && !showingQueue && !dragOver && <div className="modern-dashed" />}
            {theme === 'modern' && dragOver && <div className="modern-dashed drag" />}

            {!showingQueue && (
              theme === 'anno'
                ? <AnnoHeroEmpty dragOver={dragOver} onPickFiles={onPickFiles} onPickFolder={onScanFolder} unpackMode={unpackMode} />
                : <ModernHeroEmpty dragOver={dragOver} onPickFiles={onPickFiles} onPickFolder={onScanFolder} unpackMode={unpackMode} />
            )}

            {showingQueue && (
              theme === 'anno'
                ? <AnnoQueue rows={queueRows} onClear={onClearQueue}
                    canClear={mode !== 'converting'}
                    onAddFiles={onAddFiles} onAddFolder={onAddFolder}
                    onShowLog={(row) => setErrorModal({ name: row.name, text: row.error_text || '' })}
                    onRemove={onRemoveRow}
                    unpackMode={unpackMode} />
                : <ModernQueue rows={queueRows} onClear={onClearQueue}
                    canClear={mode !== 'converting'}
                    onAddFiles={onAddFiles} onAddFolder={onAddFolder}
                    onShowLog={(row) => setErrorModal({ name: row.name, text: row.error_text || '' })}
                    onRemove={onRemoveRow}
                    unpackMode={unpackMode} />
            )}
          </div>

          <ConvertButton
            theme={theme}
            mode={mode}
            enabled={queueRows.length > 0}
            onClick={onConvert}
            unpackMode={unpackMode}
          />
          <Footer theme={theme} mode={mode}
                  vram={vram} parallel={parallel}
                  onToggleTheme={() => setTheme(t => t === 'anno' ? 'modern' : 'anno')} />

          {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} unpackMode={unpackMode} />}
          {overwritePending && (
            <OverwriteDialog
              count={overwritePending.count}
              examples={overwritePending.examples}
              onCancel={() => setOverwritePending(null)}
              onOverwrite={() => { setOverwritePending(null); doConvert(); }}
            />
          )}
          {errorModal && (
            <ErrorLogDialog
              name={errorModal.name}
              text={errorModal.text}
              onClose={() => setErrorModal(null)}
            />
          )}
        </div>
      </div>
      {inspector && (
        <ImageInspector desc={inspector} onClose={() => setInspector(null)} />
      )}
    </div>
  );
}

function OverwriteDialog({ count, examples, onOverwrite, onCancel }) {
  return (
    <div className="scrim" onClick={onCancel}>
      <div className="help-dialog" style={{ width: 460, maxHeight: 'none' }} onClick={e => e.stopPropagation()}>
        <div className="help-title-row">
          <div className="help-title">Overwrite Existing Files?</div>
          <button className="help-close" onClick={onCancel}>✕</button>
        </div>
        <div className="help-body" style={{ padding: '20px 24px 8px' }}>
          <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
            <strong>{count}</strong> output file{count !== 1 ? 's' : ''} already exist in the output
            folder. Do you want to overwrite {count !== 1 ? 'them' : 'it'}?
          </p>
          {examples && examples.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              {examples.map(f => (
                <span key={f} className="code" style={{ fontSize: 11, opacity: 0.7 }}>{f}</span>
              ))}
              {count > examples.length && (
                <span style={{ fontSize: 11, opacity: 0.5 }}>…and {count - examples.length} more</span>
              )}
            </div>
          )}
        </div>
        <div className="help-actions" style={{ gap: 10 }}>
          <button className="btn-ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-got-it" onClick={onOverwrite} style={{ flex: 1 }}>Overwrite</button>
        </div>
      </div>
    </div>
  );
}

function ErrorLogDialog({ name, text, onClose }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="help-dialog" style={{ width: 720, maxHeight: '70%' }} onClick={e => e.stopPropagation()}>
        <div className="help-title-row">
          <div className="help-title">Error log — {name}</div>
          <button className="help-close" onClick={onClose}>✕</button>
        </div>
        <div className="help-body" style={{ whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 13, color: '#F26B6B' }}>
          {text || '(no details captured)'}
        </div>
        <div className="help-actions">
          <button className="btn-got-it" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


console.log('[react] about to create root...');
try {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  console.log('[react] root render dispatched');
} catch (e) {
  console.error('[react] createRoot failed: ' + (e.stack || e.message));
}
