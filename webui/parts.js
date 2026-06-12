const { useState, useEffect, useRef, useMemo } = React;
const QUEUE_SAMPLE = [
  { id: 1, name: "forum_column_set", inputs: 1, status: "done", pct: 100 },
  { id: 2, name: "temple_roof_tiles", inputs: 2, status: "encoding", pct: 65, label: "ENCODING LOD1", eta: "00:00:07" },
  { id: 3, name: "marble_statue_a", inputs: 1, status: "packing", pct: 32, label: "PACKING CHANNELS", eta: "00:00:11" },
  { id: 4, name: "market_stall_cloth", inputs: 2, status: "queued", pct: 0, label: "WAITING IN QUEUE", queuePos: "4 of 4" }
];
function ModernSunIcon({ size = 24, color = "#F2B65A" }) {
  return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "4", fill: color, fillOpacity: "0.2" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "2", x2: "12", y2: "5" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "19", x2: "12", y2: "22" }), /* @__PURE__ */ React.createElement("line", { x1: "2", y1: "12", x2: "5", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "19", y1: "12", x2: "22", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "4.5", y1: "4.5", x2: "6.7", y2: "6.7" }), /* @__PURE__ */ React.createElement("line", { x1: "17.3", y1: "17.3", x2: "19.5", y2: "19.5" }), /* @__PURE__ */ React.createElement("line", { x1: "4.5", y1: "19.5", x2: "6.7", y2: "17.3" }), /* @__PURE__ */ React.createElement("line", { x1: "17.3", y1: "6.7", x2: "19.5", y2: "4.5" }));
}
function ModernWaveIcon({ size = 24, color = "#9893FC" }) {
  return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M2 7 Q 6 2, 12 7 T 22 7" }), /* @__PURE__ */ React.createElement("path", { d: "M2 13 Q 6 8, 12 13 T 22 13" }), /* @__PURE__ */ React.createElement("path", { d: "M2 19 Q 6 14, 12 19 T 22 19" }));
}
function ModernCubeIcon({ size = 24, color = "#F2B65A" }) {
  return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z", fill: color, fillOpacity: "0.12" }), /* @__PURE__ */ React.createElement("path", { d: "M12 2 L12 12 L3 7" }), /* @__PURE__ */ React.createElement("path", { d: "M12 12 L21 7" }), /* @__PURE__ */ React.createElement("path", { d: "M12 12 L12 22" }));
}
function FileIcon({ color }) {
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M14 2 H6 a2 2 0 0 0-2 2 v16 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2-2 V8 z" }), /* @__PURE__ */ React.createElement("polyline", { points: "14 2 14 8 20 8" }));
}
function FolderIcon({ color }) {
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M3 7 a2 2 0 0 1 2-2 h4 l2 2 h8 a2 2 0 0 1 2 2 v9 a2 2 0 0 1-2 2 H5 a2 2 0 0 1-2-2 z" }));
}
function ImagePlaceholderIcon() {
  return /* @__PURE__ */ React.createElement("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", stroke: "rgba(255,255,255,0.65)", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("rect", { x: "6", y: "10", width: "48", height: "36", rx: "3" }), /* @__PURE__ */ React.createElement("circle", { cx: "18", cy: "22", r: "4", fill: "rgba(255,255,255,0.4)", stroke: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M6 38 L20 26 L32 36 L42 28 L54 38" }));
}
function ParallelStackIcon({ color = "currentColor" }) {
  return /* @__PURE__ */ React.createElement("svg", { width: "22", height: "22", viewBox: "0 0 22 22", fill: "none", stroke: color, strokeWidth: "1.5" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "12", height: "8", rx: "1.5", fill: color, fillOpacity: "0.18" }), /* @__PURE__ */ React.createElement("rect", { x: "5", y: "7", width: "12", height: "8", rx: "1.5", fill: color, fillOpacity: "0.18" }), /* @__PURE__ */ React.createElement("rect", { x: "7", y: "11", width: "12", height: "8", rx: "1.5", fill: color, fillOpacity: "0.25" }));
}
function Donut({ pct, status, theme }) {
  const size = 84, r = 36, c = 2 * Math.PI * r;
  const trackColor = theme === "anno" ? "#091422" : "#2A3340";
  const arcColor = theme === "anno" ? "#5B3D8E" : "#6B5FFF";
  const greenColor = theme === "anno" ? "#E6C57A" : "#5DD49A";
  if (status === "queued") {
    const dots = [];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      dots.push(
        /* @__PURE__ */ React.createElement("span", { key: i, style: { transform: `translate(${x}px, ${y}px) translate(-2px,-2px)` } })
      );
    }
    return /* @__PURE__ */ React.createElement("div", { className: "donut", "data-status": "queued", style: { width: size, height: size } }, /* @__PURE__ */ React.createElement("div", { className: "dots" }, dots));
  }
  if (status === "done") {
    return /* @__PURE__ */ React.createElement("div", { className: "donut", "data-status": "done", style: { width: size, height: size } }, /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` }, /* @__PURE__ */ React.createElement("circle", { cx: size / 2, cy: size / 2, r, stroke: greenColor, strokeWidth: "5", fill: "none" }), /* @__PURE__ */ React.createElement(
      "path",
      {
        d: `M ${size / 2 - 12} ${size / 2} l 9 9 l 18 -18`,
        stroke: greenColor,
        strokeWidth: "4",
        fill: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    )));
  }
  const dash = c * (pct / 100);
  return /* @__PURE__ */ React.createElement("div", { className: "donut", style: { width: size, height: size } }, /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { transform: "rotate(-90deg)" } }, /* @__PURE__ */ React.createElement("circle", { cx: size / 2, cy: size / 2, r, stroke: trackColor, strokeWidth: "5", fill: "none" }), /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: size / 2,
      cy: size / 2,
      r,
      stroke: arcColor,
      strokeWidth: "5",
      fill: "none",
      strokeDasharray: `${dash} ${c - dash}`,
      strokeLinecap: "round"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "pct" }, pct, "%"));
}
function ConvertSpinner() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(i);
  }, []);
  const dots = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2;
    const r = 12;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const idx = (i - tick + 12) % 12;
    const op = idx < 4 ? 1 - idx * 0.22 : 0.18;
    dots.push(
      /* @__PURE__ */ React.createElement(
        "span",
        {
          key: i,
          className: "dot",
          style: { transform: `translate(${x}px, ${y}px) translate(-2.5px,-2.5px)`, opacity: op }
        }
      )
    );
  }
  return /* @__PURE__ */ React.createElement("span", { className: "convert-spinner" }, dots);
}
function PulseDot() {
  return /* @__PURE__ */ React.createElement("span", { className: "pulse-dot" });
}
function LodChip({ n, on, locked, theme, onToggle }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `lod-chip lod-chip-${theme}`,
      "data-on": on,
      "data-locked": locked || void 0,
      onClick: () => !locked && onToggle && onToggle()
    },
    /* @__PURE__ */ React.createElement("div", { className: "lod-box" }),
    /* @__PURE__ */ React.createElement("div", { className: "lod-label" }, "LOD", n)
  );
}
function previewBase() {
  return window.__PACKER_BASE || "http://127.0.0.1:45291";
}
function previewUrl(desc, maxdim) {
  const p = new URLSearchParams({
    mode: desc.mode,
    kind: desc.kind,
    set_id: String(desc.set_id),
    map_type: desc.map_type,
    lod: String(desc.lod != null ? desc.lod : -1),
    maxdim: String(maxdim || 0),
    n: String(window.__previewNonce || 0)
  });
  return `${previewBase()}/api/preview?${p.toString()}`;
}
const POP_MAXW = 340, POP_MAXH = 300, POP_CAP = 52, POP_GAP = 12;
function popImgDims(meta) {
  if (meta && meta.width && meta.height) {
    const aspect = meta.width / meta.height;
    let w = POP_MAXW, h = w / aspect;
    if (h > POP_MAXH) {
      h = POP_MAXH;
      w = h * aspect;
    }
    return { w: Math.round(w), h: Math.round(h) };
  }
  const s = Math.min(POP_MAXW, POP_MAXH);
  return { w: s, h: s };
}
function ChipPreview({ desc, children, className, style, as }) {
  const Tag = as || "span";
  const [hover, setHover] = useState(false);
  const [box, setBox] = useState(null);
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const elRef = useRef(null);
  const timerRef = useRef(null);
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
      top = r.bottom + POP_GAP;
    } else {
      top = r.top - POP_GAP - popH;
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
          mode: desc.mode,
          kind: desc.kind,
          set_id: desc.set_id,
          map_type: desc.map_type,
          lod: desc.lod != null ? desc.lod : -1
        }).then((m) => {
          if (m && m.ok) {
            setMeta(m);
            place(m);
          }
        }).catch(() => {
        });
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
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  return /* @__PURE__ */ React.createElement(
    Tag,
    {
      ref: elRef,
      className,
      style: { cursor: "zoom-in", ...style || {} },
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      onClick
    },
    children,
    hover && box && !failed && ReactDOM.createPortal(
      /* @__PURE__ */ React.createElement("div", { className: "preview-pop", style: { left: box.left, top: box.top, width: box.w } }, /* @__PURE__ */ React.createElement("div", { className: "preview-pop-img checker", style: { height: box.h } }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: previewUrl(desc, 512),
          alt: "",
          onError: () => setFailed(true)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "preview-pop-cap" }, /* @__PURE__ */ React.createElement("div", { className: "preview-pop-name" }, meta ? meta.name : desc.label || "\u2026"), /* @__PURE__ */ React.createElement("div", { className: "preview-pop-type" }, (desc.label || "").toString(), meta && meta.width ? `  \xB7  ${meta.width}\xD7${meta.height}` : ""))),
      document.body
    )
  );
}
const ANNO_DDS_SEM = {
  diff: { all: "Diffuse", R: "Albedo (R)", G: "Albedo (G)", B: "Albedo (B)", A: "Opacity" },
  norm: { all: "Normal", R: "Normal X", G: "Normal Y (DX)", B: "Normal Z", A: "Glossiness" },
  metal: { all: "Metal (packed)", R: "Metalness", G: "Metalness", B: "Metalness", A: "Ambient Occlusion" },
  height: { all: "Height", R: "Displacement", G: "Displacement", B: "Displacement", A: "\u2014" },
  mask: { all: "Mask", R: "Emission (R)", G: "Emission (G)", B: "Emission (B)", A: "Night mask" },
  icon: { all: "Icon", R: "Red", G: "Green", B: "Blue", A: "Mask" }
};
function channelSemantics(desc) {
  const ddsLike = desc.mode === "unpack" && desc.kind === "input" || desc.mode === "pack" && desc.kind === "output";
  if (ddsLike && ANNO_DDS_SEM[desc.map_type]) return ANNO_DDS_SEM[desc.map_type];
  return { all: desc.label || "", R: "Red", G: "Green", B: "Blue", A: "Alpha" };
}
function ImageInspector({ desc, onClose }) {
  const [meta, setMeta] = useState(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [channel, setChannel] = useState("RGBA");
  const [base, setBase] = useState(null);
  const [canChannels, setCanChannels] = useState(true);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const sem = channelSemantics(desc);
  useEffect(() => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.preview_meta({
        mode: desc.mode,
        kind: desc.kind,
        set_id: desc.set_id,
        map_type: desc.map_type,
        lod: desc.lod != null ? desc.lod : -1
      }).then((m) => {
        if (m && m.ok) setMeta(m);
      }).catch(() => {
      });
    }
  }, [desc]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBase(null);
    setChannel("RGBA");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const oc = document.createElement("canvas");
      oc.width = img.naturalWidth;
      oc.height = img.naturalHeight;
      const octx = oc.getContext("2d");
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
    img.onerror = () => {
      if (!cancelled) setLoading(false);
    };
    img.src = previewUrl(desc, 1600);
    return () => {
      cancelled = true;
    };
  }, [desc]);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !base) return;
    cv.width = base.w;
    cv.height = base.h;
    const ctx = cv.getContext("2d");
    if (base.tainted) {
      ctx.drawImage(base.img, 0, 0);
      return;
    }
    if (channel === "RGBA") {
      ctx.putImageData(base.data, 0, 0);
      return;
    }
    const off = channel === "R" ? 0 : channel === "G" ? 1 : channel === "B" ? 2 : 3;
    const out = ctx.createImageData(base.w, base.h);
    const s = base.data.data, d = out.data;
    for (let i = 0; i < s.length; i += 4) {
      const v = s[i + off];
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [base, channel]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "0") {
        setScale(1);
        setTx(0);
        setTy(0);
      } else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(16, s * 1.25));
      else if (e.key === "-" || e.key === "_") setScale((s) => Math.max(0.1, s / 1.25));
      else if (canChannels && "rR".includes(e.key)) setChannel("R");
      else if (canChannels && "gG".includes(e.key)) setChannel("G");
      else if (canChannels && "bB".includes(e.key)) setChannel("B");
      else if (canChannels && "aA".includes(e.key)) setChannel("A");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, canChannels]);
  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setScale((s) => Math.max(0.1, Math.min(16, s * factor)));
  };
  const onDown = (e) => {
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      tx,
      ty,
      moved: false,
      onImage: e.target && e.target.classList && e.target.classList.contains("inspector-img")
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
  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };
  const pill = channel === "RGBA" ? sem.all || "RGBA" : sem[channel];
  const CH = ["R", "G", "B", "A", "RGBA"];
  return ReactDOM.createPortal(
    /* @__PURE__ */ React.createElement("div", { className: "inspector-scrim", onMouseMove: onMove, onMouseUp: onUp, onMouseLeave: onUp }, /* @__PURE__ */ React.createElement("div", { className: "inspector-bar" }, /* @__PURE__ */ React.createElement("div", { className: "inspector-titles" }, /* @__PURE__ */ React.createElement("span", { className: "inspector-name" }, meta ? meta.name : desc.label || "Preview"), /* @__PURE__ */ React.createElement("span", { className: "inspector-sub" }, pill && /* @__PURE__ */ React.createElement("span", { className: "inspector-pill" }, pill), meta && meta.width ? /* @__PURE__ */ React.createElement("span", { className: "inspector-dims" }, meta.width, "\xD7", meta.height) : null)), /* @__PURE__ */ React.createElement("div", { className: "inspector-tools" }, /* @__PURE__ */ React.createElement("div", { className: "channel-btns" }, CH.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c,
        className: "channel-btn ch-" + c + (channel === c ? " active" : ""),
        disabled: !canChannels && c !== "RGBA",
        title: c === "RGBA" ? "Full colour (original)" : `Isolate ${c} channel \u2014 ${sem[c]}`,
        onClick: () => setChannel(c)
      },
      c
    ))), /* @__PURE__ */ React.createElement("span", { className: "inspector-divider" }), /* @__PURE__ */ React.createElement("button", { onClick: () => setScale((s) => Math.max(0.1, s / 1.25)), title: "Zoom out (\u2212)" }, "\u2212"), /* @__PURE__ */ React.createElement("span", { className: "inspector-zoom" }, Math.round(scale * 100), "%"), /* @__PURE__ */ React.createElement("button", { onClick: () => setScale((s) => Math.min(16, s * 1.25)), title: "Zoom in (+)" }, "+"), /* @__PURE__ */ React.createElement("button", { onClick: reset, title: "Reset (0)" }, "Fit"), /* @__PURE__ */ React.createElement("button", { className: "inspector-close", onClick: onClose, title: "Close (Esc)" }, "\u2715"))), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "inspector-stage checker",
        onWheel,
        onMouseDown: onDown,
        style: { cursor: "grab" }
      },
      loading && /* @__PURE__ */ React.createElement("div", { className: "inspector-loading" }, "Loading\u2026"),
      /* @__PURE__ */ React.createElement(
        "canvas",
        {
          ref: canvasRef,
          className: "inspector-img",
          style: {
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            visibility: base ? "visible" : "hidden"
          }
        }
      )
    )),
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
