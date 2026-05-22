const LOD0_SIZE_OPTIONS = ["As input", "4096", "2048", "1024", "512", "256"];
function HelpDialog({ onClose }) {
  return /* @__PURE__ */ React.createElement("div", { className: "scrim", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "help-dialog", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "help-title-row" }, /* @__PURE__ */ React.createElement("div", { className: "help-title" }, "Help & Channel Reference"), /* @__PURE__ */ React.createElement("button", { className: "help-close", onClick: onClose }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "help-body" }, /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "What this tool does")), /* @__PURE__ */ React.createElement("p", null, "Anno 117 DDS Packer turns standard PBR PNG exports \u2014 the kind you get out of Blender, Substance, or any AI 3D generator \u2014 into the BC7-encoded DDS textures the Anno 117 modding pipeline expects. It auto-detects which PNG is which (diffuse, normal, metalness, etc.), repacks channels into Anno's convention, generates the LOD chain, and writes the ", /* @__PURE__ */ React.createElement("span", { className: "code" }, ".dds"), " files you can drop straight into your mod folder.")), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "What is a DDS?")), /* @__PURE__ */ React.createElement("p", null, "DirectDraw Surface \u2014 a GPU-native image container. Anno uses BC7, a high-quality block-compressed format that stores 4\xD74 pixel tiles with per-block compression modes. Encoding is slow; decoding is free on the GPU. That's why the game ships these instead of PNGs.")), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "Anno channel-packing convention")), /* @__PURE__ */ React.createElement("table", { className: "help-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "DDS"), /* @__PURE__ */ React.createElement("th", null, "RGB"), /* @__PURE__ */ React.createElement("th", null, "A"))), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Diffuse"), /* @__PURE__ */ React.createElement("td", null, "Albedo (sRGB)"), /* @__PURE__ */ React.createElement("td", null, "Opacity")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Metal"), /* @__PURE__ */ React.createElement("td", null, "Metalness (grayscale, linear)"), /* @__PURE__ */ React.createElement("td", null, "Ambient Occlusion")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Normal"), /* @__PURE__ */ React.createElement("td", null, "DirectX tangent normal (linear)"), /* @__PURE__ */ React.createElement("td", null, "Glossiness (= 1 \u2212 roughness)")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Height"), /* @__PURE__ */ React.createElement("td", null, "Grayscale displacement (linear)"), /* @__PURE__ */ React.createElement("td", null, "\u2014"))))), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "Filename suffixes the auto-detector recognises")), /* @__PURE__ */ React.createElement("table", { className: "help-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Channel"), /* @__PURE__ */ React.createElement("th", null, "Suffixes"))), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Diffuse / albedo"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_diff"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_diffuse"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_albedo"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_color"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_basecolor"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_bc"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Opacity"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_opacity"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_opc"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_alpha"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Metalness"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_metal"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_metalness"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_metallic"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Ambient occlusion"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_ao"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_ambientocclusion"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Normal"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_norm"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_normal"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_nrm"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Glossiness / Roughness"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_gloss"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_glossiness"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_rough"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_roughness"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Height / Displacement"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_height"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_disp"), " ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_displacement"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Packed Rough+Metal"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_rm"))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Packed Occ+Rough+Metal"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_orm"))))), /* @__PURE__ */ React.createElement("p", { style: { marginTop: 10, fontSize: 13, opacity: 0.85 } }, "Matching is case-insensitive and tolerant of ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "."), ", ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_"), ", ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "-"), ' separators. Base name = filename minus suffix minus extension; files that share a base name are bundled into a "set".')), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "Packed map handling")), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_rm"), " (G = roughness \u2192 glossiness, B = metalness) \u2192 ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "metal.RGB"), " \u2190 B replicated; ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "normal.A"), " \u2190 1 \u2212 G."), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "code" }, "_orm"), " (R = AO, G = roughness, B = metalness) \u2192 ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "metal.RGB"), " \u2190 B replicated; ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "metal.A"), " \u2190 R; ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "normal.A"), " \u2190 1 \u2212 G.")), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "Missing-channel synthesis")), /* @__PURE__ */ React.createElement("p", null, "If only ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_diff"), " and ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_rm"), " are supplied (no ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "_normal"), "), the tool synthesises a flat normal with RGB = (128, 128, 255) and packs ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "1 \u2212 G_rm"), " into its alpha. NORMAL.DDS will be valid; only the surface micro-detail is missing. You'll get a one-time warning per set.")), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "LODs")), /* @__PURE__ */ React.createElement("p", null, "LODs are the texture's mip chain pre-baked at decreasing resolutions: LOD0 = 1\xD7, LOD1 = \xBD\xD7, LOD2 = \xBC\xD7, LOD3 = \u215B\xD7, LOD4 = \xB9\u2044\u2081\u2086\xD7. Disabling LODs saves disk space but distant LODs look blurry. ", /* @__PURE__ */ React.createElement("strong", null, "LOD0 is always written"), " \u2014 its checkbox is locked on.")), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "Fast mode")), /* @__PURE__ */ React.createElement("p", null, "BC7 encoding sweeps many block modes to find the best per-tile. Fast mode prunes the search to modes that statistically win \u2265 95% of the time. Output is visually identical in 99.x% of cases on Anno-style material textures. Speedup \u2248 ", /* @__PURE__ */ React.createElement("strong", null, "1.5\xD7"), ". Use during iteration; turn off for release builds.")), /* @__PURE__ */ React.createElement("section", { className: "help-section" }, /* @__PURE__ */ React.createElement("div", { className: "help-section-title" }, /* @__PURE__ */ React.createElement("span", { className: "strip" }), /* @__PURE__ */ React.createElement("h3", null, "Parallel sets")), /* @__PURE__ */ React.createElement("p", null, `A "set" is one base-name's worth of inputs (diffuse + normal + \u2026). The encoder runs multiple sets concurrently \u2014 one worker thread per GPU encode queue. The cap shown in the footer is `, /* @__PURE__ */ React.createElement("span", { className: "code" }, "min(cpu_count(), 8)"), ". Raise it in ", /* @__PURE__ */ React.createElement("span", { className: "code" }, "%APPDATA%/AnnoDDSPacker/settings.json \u2192 parallelSetsMax"), "."))), /* @__PURE__ */ React.createElement("div", { className: "help-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-got-it", onClick: onClose }, "Got it"))));
}
function FolderPickerMenu({ onSameAsInput, onPickFolder, sameAsInput, onClose }) {
  return /* @__PURE__ */ React.createElement("div", { className: "picker-flyout", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("button", { className: "picker-row", onClick: () => {
    onPickFolder();
    onClose();
  } }, /* @__PURE__ */ React.createElement("span", { className: "picker-icon" }, "\u{1F4C1}"), " Choose folder\u2026"), /* @__PURE__ */ React.createElement("button", { className: "picker-row", onClick: () => {
    onSameAsInput(!sameAsInput);
    onClose();
  } }, /* @__PURE__ */ React.createElement("span", { className: "picker-check" }, sameAsInput ? "\u2713" : " "), " Same as input folder"));
}
function Header({ theme, lodOn, setLodOn, fastMode, setFastMode, outputFolder, sameAsInput, setSameAsInput, lod0Size, setLod0Size, onHelp, onPickFolder }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lod0Open, setLod0Open] = useState(false);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "header" }, /* @__PURE__ */ React.createElement("div", { className: "brand" }, /* @__PURE__ */ React.createElement("div", { className: "brand-logo anno" }, /* @__PURE__ */ React.createElement("img", { src: "assets/anno_brand_logo.png", alt: "" })), /* @__PURE__ */ React.createElement("div", { className: "brand-text" }, /* @__PURE__ */ React.createElement("div", { className: "brand-title" }, "Anno DDS Packer"), /* @__PURE__ */ React.createElement("div", { className: "brand-subtitle" }, theme === "anno" ? "Convert PNG Maps to Game-Ready DDS Textures" : "Convert PNG maps to game-ready DDS textures"))), /* @__PURE__ */ React.createElement("div", { className: "settings", style: { left: 500 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-block" }, /* @__PURE__ */ React.createElement("div", { className: "setting-label" }, "Output Folder"), /* @__PURE__ */ React.createElement("div", { className: "entry-row" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "entry",
      value: sameAsInput ? "" : outputFolder,
      disabled: sameAsInput,
      placeholder: sameAsInput ? "(same folder as each input)" : "Paste or type a path\u2026",
      onChange: (e) => setOutputFolder(e.target.value)
    }
  ), /* @__PURE__ */ React.createElement("button", { className: "icon-btn", onClick: () => setPickerOpen((o) => !o) }, "\u2026"), pickerOpen && /* @__PURE__ */ React.createElement(
    FolderPickerMenu,
    {
      sameAsInput,
      onSameAsInput: setSameAsInput,
      onPickFolder,
      onClose: () => setPickerOpen(false)
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "setting-block" }, /* @__PURE__ */ React.createElement("div", { className: "setting-label" }, "LOD0 Resolution"), /* @__PURE__ */ React.createElement("div", { className: "dropdown", onClick: () => setLod0Open((o) => !o) }, lod0Size, lod0Open && /* @__PURE__ */ React.createElement("div", { className: "dropdown-menu", onClick: (e) => e.stopPropagation() }, LOD0_SIZE_OPTIONS.map((opt) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: opt,
      className: "dropdown-item",
      onClick: () => {
        setLod0Size(opt);
        setLod0Open(false);
      }
    },
    opt
  ))))), /* @__PURE__ */ React.createElement("div", { className: "setting-block" }, /* @__PURE__ */ React.createElement("div", { className: "setting-label" }, "LOD Levels"), /* @__PURE__ */ React.createElement("div", { className: "lod-row" }, [0, 1, 2, 3, 4].map((n) => /* @__PURE__ */ React.createElement(
    LodChip,
    {
      key: n,
      n,
      on: lodOn[n],
      locked: n === 0,
      theme,
      onToggle: () => setLodOn((s) => ({ ...s, [n]: !s[n] }))
    }
  )))))), /* @__PURE__ */ React.createElement("div", { className: "header-right" }, /* @__PURE__ */ React.createElement("div", { className: "fast-mode-block" }, /* @__PURE__ */ React.createElement("div", { className: "setting-label" }, "Fast Mode"), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "toggle",
      "data-on": fastMode,
      onClick: () => setFastMode((v) => !v)
    },
    /* @__PURE__ */ React.createElement("div", { className: "thumb" })
  )), /* @__PURE__ */ React.createElement("button", { className: "icon-btn", onClick: onHelp }, "?")), theme === "anno" && /* @__PURE__ */ React.createElement("div", { className: "anno-header-divider" }), theme === "modern" && /* @__PURE__ */ React.createElement("div", { className: "modern-header-divider" }));
}
function Footer({ theme, mode, vram, parallel, onToggleTheme }) {
  const working = mode === "converting";
  const vramText = vram && vram.total ? `${vram.used.toFixed(1)} / ${vram.total.toFixed(1)} GB` : "\u2014 / \u2014 GB";
  const vramPct = vram && vram.total ? Math.min(1, vram.used / vram.total) * 100 : 0;
  return /* @__PURE__ */ React.createElement("div", { className: "footer" }, /* @__PURE__ */ React.createElement("div", { className: "status", "data-state": working ? "working" : "ready" }, /* @__PURE__ */ React.createElement(PulseDot, null), working ? "Working" : "Ready"), /* @__PURE__ */ React.createElement("div", { className: "footer-center" }, /* @__PURE__ */ React.createElement("div", { className: "vram" }, /* @__PURE__ */ React.createElement("span", { className: "vram-label" }, "VRAM"), /* @__PURE__ */ React.createElement("div", { className: "vram-bar" }, /* @__PURE__ */ React.createElement("div", { className: "vram-fill", style: { width: `${vramPct}%` } })), /* @__PURE__ */ React.createElement("span", { className: "vram-value" }, vramText)), /* @__PURE__ */ React.createElement("div", { className: "sep-dot" }), /* @__PURE__ */ React.createElement("div", { className: "parallel" }, /* @__PURE__ */ React.createElement("span", null, "Parallel Sets"), /* @__PURE__ */ React.createElement("span", { className: "parallel-glyph" }, /* @__PURE__ */ React.createElement(ParallelStackIcon, null)), /* @__PURE__ */ React.createElement("span", { className: "value" }, parallel.active, " / ", parallel.cap), working && theme === "modern" && /* @__PURE__ */ React.createElement("span", { className: "gpu-pulse" }))), /* @__PURE__ */ React.createElement("div", { className: "theme-switch", onClick: onToggleTheme }, /* @__PURE__ */ React.createElement("span", null, theme === "anno" ? "ANNO" : "MODERN"), /* @__PURE__ */ React.createElement("span", { className: "pill" })));
}
function ConvertButton({ theme, mode, enabled, onClick }) {
  const running = mode === "converting";
  const cls = `convert-bar ${running ? "running" : enabled ? "ready" : ""}`;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "diamond-divider above" }, /* @__PURE__ */ React.createElement("div", { className: "line left" }), /* @__PURE__ */ React.createElement("div", { className: "line right" }), /* @__PURE__ */ React.createElement("img", { src: "assets/diamond.png", alt: "" })), /* @__PURE__ */ React.createElement("div", { className: cls, onClick: running || !enabled ? void 0 : onClick }, theme === "anno" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "convert-laurel left" }, /* @__PURE__ */ React.createElement("img", { src: "assets/laurel_left.png", alt: "" })), /* @__PURE__ */ React.createElement("div", { className: "convert-laurel right" }, /* @__PURE__ */ React.createElement("img", { src: "assets/laurel_right.png", alt: "" }))), running && /* @__PURE__ */ React.createElement(ConvertSpinner, null), /* @__PURE__ */ React.createElement("span", { className: "convert-caption" }, running ? "Converting\u2026" : "Convert to DDS")), /* @__PURE__ */ React.createElement("div", { className: "diamond-divider below" }, /* @__PURE__ */ React.createElement("div", { className: "line left" }), /* @__PURE__ */ React.createElement("div", { className: "line right" }), /* @__PURE__ */ React.createElement("img", { src: "assets/diamond.png", alt: "" })));
}
async function api(method, ...args) {
  if (!window.pywebview || !window.pywebview.api) return null;
  try {
    return await window.pywebview.api[method](...args);
  } catch (e) {
    console.error(`api.${method} failed`, e);
    return null;
  }
}
async function waitForApi(timeoutMs = 15e3) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.load_settings) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}
function App() {
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState("anno");
  const [mode, setMode] = useState("idle");
  const [lodOn, setLodOn] = useState({ 0: true, 1: false, 2: false, 3: false, 4: false });
  const [fastMode, setFastMode] = useState(false);
  const [sameAsInput, setSameAsInput] = useState(true);
  const [outputFolder, setOutputFolder2] = useState("");
  const [lod0Size, setLod0Size] = useState("As input");
  const [helpOpen, setHelpOpen] = useState(false);
  const [queueRows, setQueueRows] = useState([]);
  const [vram, setVram] = useState({ used: 0, total: 0 });
  const [parallel, setParallel] = useState({ active: 0, cap: 8 });
  const [errorModal, setErrorModal] = useState(null);
  useEffect(() => {
    (async () => {
      const ok = await waitForApi();
      if (!ok) {
        setReady(true);
        return;
      }
      const s = await api("load_settings");
      if (s) {
        setTheme(s.theme_name || "anno");
        setFastMode(!!s.fast_mode);
        setSameAsInput(s.same_as_input !== false);
        setOutputFolder2(s.output_dir || "");
        setLod0Size(s.lod0_size || "As input");
        const lods = s.selected_lods || [0];
        const map = { 0: true, 1: false, 2: false, 3: false, 4: false };
        for (const n of lods) map[n] = true;
        setLodOn(map);
      }
      const cap = await api("parallel_cap");
      if (cap) setParallel((p) => ({ ...p, cap }));
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    (window.__bridgeReady || Promise.resolve(null)).then(function(bridge) {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          if (bridge && bridge.notify_ready) {
            console.log("[react] calling notify_ready");
            bridge.notify_ready();
          } else {
            console.warn("[react] bridge not available; Python timeout will dismiss splash");
          }
        });
      });
    });
  }, []);
  useEffect(() => {
    if (!ready) return;
    const lods = Object.entries(lodOn).filter(([, v]) => v).map(([k]) => parseInt(k, 10)).sort();
    api("save_settings", {
      theme_name: theme,
      selected_lods: lods,
      lod0_size: lod0Size,
      fast_mode: fastMode,
      same_as_input: sameAsInput,
      output_dir: outputFolder
    });
  }, [ready, theme, lodOn, lod0Size, fastMode, sameAsInput, outputFolder]);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const v = await api("vram");
      if (v && (v.total || v.used)) setVram(v);
      const p = await api("parallel_status");
      if (p) setParallel(p);
      setTimeout(tick, 1e3);
    };
    tick();
    return () => {
      stop = true;
    };
  }, []);
  useEffect(() => {
    let dragTimer = null;
    const onOver = (e) => {
      e.preventDefault();
      if (mode === "converting") return;
      setMode("drag");
      if (dragTimer) clearTimeout(dragTimer);
      dragTimer = setTimeout(() => {
        setMode("idle");
        dragTimer = null;
      }, 120);
    };
    const onDrop = async (e) => {
      e.preventDefault();
      if (dragTimer) {
        clearTimeout(dragTimer);
        dragTimer = null;
      }
      if (mode === "converting") {
        setMode("converting");
        return;
      }
      setMode("idle");
      if (window.__nativeDropFiredAt && Date.now() - window.__nativeDropFiredAt < 1500) {
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
            for (const sub of chunk) await walk(sub, prefix + entry.name + "/");
          } while (chunk.length);
        }
      }
      const rootTasks = [];
      for (const it of items) {
        if (it.kind !== "file") continue;
        const entry = it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
        if (entry) rootTasks.push(walk(entry, ""));
        else {
          const f = it.getAsFile();
          if (f) collected.push({ path: f.name, file: f });
        }
      }
      await Promise.all(rootTasks);
      const okExt = /\.(png|jpe?g|tga|bmp|tiff?|webp)$/i;
      const usable = collected.filter(({ path }) => okExt.test(path));
      if (!usable.length) return;
      const payload = await Promise.all(usable.map(async ({ path, file }) => {
        const buf = await file.arrayBuffer();
        let bin = "";
        const view = new Uint8Array(buf);
        const CHUNK = 32 * 1024;
        for (let i = 0; i < view.length; i += CHUNK) {
          bin += String.fromCharCode.apply(null, view.subarray(i, i + CHUNK));
        }
        return { path, data: btoa(bin) };
      }));
      const rows = await api("receive_dropped_files", payload);
      if (rows && rows.length) setQueueRows(rows);
    };
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      if (dragTimer) clearTimeout(dragTimer);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [mode]);
  useEffect(() => {
    window.__onFilesDropped = async (paths) => {
      window.__nativeDropFiredAt = Date.now();
      const rows = await api("scan_paths", paths);
      if (rows && rows.length) {
        setQueueRows(rows);
        setMode("idle");
      }
    };
    window.__nativeDragEnter = () => {
      if (mode !== "converting") setMode("drag");
    };
    window.__nativeDragLeave = () => {
      if (mode !== "converting") setMode("idle");
    };
    window.__updateProgress = (ev) => {
      setQueueRows((prev) => prev.map((r) => {
        if (r.set_id !== ev.set_id) return r;
        return {
          ...r,
          status: ev.status,
          pct: ev.pct,
          label: ev.label,
          eta_text: ev.eta_text,
          maps_done: ev.maps_done || r.maps_done,
          error_text: ev.error_text || r.error_text,
          output_dir: ev.output_dir || r.output_dir
        };
      }));
    };
    window.__onBatchDone = async () => {
      setMode("idle");
    };
    return () => {
      delete window.__onFilesDropped;
      delete window.__updateProgress;
      delete window.__onBatchDone;
    };
  }, []);
  const onPickFiles = async () => {
    const paths = await api("pick_files");
    if (paths && paths.length) {
      const rows = await api("scan_paths", paths);
      if (rows) setQueueRows(rows);
    }
  };
  const onPickFolder = async () => {
    const path = await api("pick_folder");
    if (path) {
      setOutputFolder2(path);
      setSameAsInput(false);
    }
  };
  const onScanFolder = async () => {
    const path = await api("pick_scan_folder");
    if (path) {
      const rows = await api("scan_paths", [path]);
      if (rows) setQueueRows(rows);
    }
  };
  const onAddFiles = onPickFiles;
  const onAddFolder = onScanFolder;
  const onConvert = async () => {
    if (!queueRows.length || mode === "converting") return;
    setMode("converting");
    await api("start_convert", {});
  };
  const onClearQueue = async () => {
    if (mode === "converting") return;
    await api("clear_queue");
    setQueueRows([]);
    setMode("idle");
  };
  const showingQueue = queueRows.length > 0 || mode === "converting";
  const dragOver = mode === "drag";
  const themeClass = theme === "anno" ? "theme-anno" : "theme-modern";
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  useEffect(() => {
    const onResize = () => {
      if (!wrapRef.current || !stageRef.current) return;
      const W = wrapRef.current.clientWidth, H = wrapRef.current.clientHeight;
      if (!W || !H) return;
      const s = Math.min(W / 1600, H / 1e3);
      stageRef.current.style.transform = `scale(${s})`;
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return /* @__PURE__ */ React.createElement("div", { className: `stage-wrap ${themeClass}`, ref: wrapRef }, /* @__PURE__ */ React.createElement("div", { className: "stage", ref: stageRef }, theme === "anno" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("img", { className: "anno-corner tl", src: "assets/corner_1.png", alt: "" }), /* @__PURE__ */ React.createElement("img", { className: "anno-corner tr", src: "assets/corner_2.png", alt: "" }), /* @__PURE__ */ React.createElement("img", { className: "anno-corner bl", src: "assets/corner_3.png", alt: "" }), /* @__PURE__ */ React.createElement("img", { className: "anno-corner br", src: "assets/corner_4.png", alt: "" })), /* @__PURE__ */ React.createElement("div", { className: "window" }, /* @__PURE__ */ React.createElement(
    Header,
    {
      theme,
      lodOn,
      setLodOn,
      fastMode,
      setFastMode,
      outputFolder,
      sameAsInput,
      setSameAsInput,
      lod0Size,
      setLod0Size,
      onHelp: () => setHelpOpen(true),
      onPickFolder
    }
  ), /* @__PURE__ */ React.createElement("div", { className: `hero ${dragOver ? "drag" : ""}` }, theme === "modern" && !showingQueue && !dragOver && /* @__PURE__ */ React.createElement("div", { className: "modern-dashed" }), theme === "modern" && dragOver && /* @__PURE__ */ React.createElement("div", { className: "modern-dashed drag" }), !showingQueue && (theme === "anno" ? /* @__PURE__ */ React.createElement(AnnoHeroEmpty, { dragOver, onPickFiles, onPickFolder: onScanFolder }) : /* @__PURE__ */ React.createElement(ModernHeroEmpty, { dragOver, onPickFiles, onPickFolder: onScanFolder })), showingQueue && (theme === "anno" ? /* @__PURE__ */ React.createElement(
    AnnoQueue,
    {
      rows: queueRows,
      onClear: onClearQueue,
      canClear: mode !== "converting",
      onAddFiles,
      onAddFolder,
      onShowLog: (row) => setErrorModal({ name: row.name, text: row.error_text || "" })
    }
  ) : /* @__PURE__ */ React.createElement(
    ModernQueue,
    {
      rows: queueRows,
      onClear: onClearQueue,
      canClear: mode !== "converting",
      onAddFiles,
      onAddFolder,
      onShowLog: (row) => setErrorModal({ name: row.name, text: row.error_text || "" })
    }
  ))), /* @__PURE__ */ React.createElement(
    ConvertButton,
    {
      theme,
      mode,
      enabled: queueRows.length > 0,
      onClick: onConvert
    }
  ), /* @__PURE__ */ React.createElement(
    Footer,
    {
      theme,
      mode,
      vram,
      parallel,
      onToggleTheme: () => setTheme((t) => t === "anno" ? "modern" : "anno")
    }
  ), helpOpen && /* @__PURE__ */ React.createElement(HelpDialog, { onClose: () => setHelpOpen(false) }), errorModal && /* @__PURE__ */ React.createElement(
    ErrorLogDialog,
    {
      name: errorModal.name,
      text: errorModal.text,
      onClose: () => setErrorModal(null)
    }
  ))));
}
function ErrorLogDialog({ name, text, onClose }) {
  return /* @__PURE__ */ React.createElement("div", { className: "scrim", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "help-dialog", style: { width: 720, maxHeight: "70%" }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "help-title-row" }, /* @__PURE__ */ React.createElement("div", { className: "help-title" }, "Error log \u2014 ", name), /* @__PURE__ */ React.createElement("button", { className: "help-close", onClick: onClose }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "help-body", style: { whiteSpace: "pre-wrap", fontFamily: "JetBrains Mono, Consolas, monospace", fontSize: 13, color: "#F26B6B" } }, text || "(no details captured)"), /* @__PURE__ */ React.createElement("div", { className: "help-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-got-it", onClick: onClose }, "Close"))));
}
console.log("[react] about to create root...");
try {
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
  console.log("[react] root render dispatched");
} catch (e) {
  console.error("[react] createRoot failed: " + (e.stack || e.message));
}
