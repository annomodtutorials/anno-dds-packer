function ModernHeroEmpty({ dragOver, onPickFiles, onPickFolder }) {
  return /* @__PURE__ */ React.createElement("div", { className: "hero-stack" }, /* @__PURE__ */ React.createElement("div", { className: `modern-drop-icon ${dragOver ? "drag" : ""}`, style: { marginTop: 32 } }, /* @__PURE__ */ React.createElement("div", { className: "paper back" }), /* @__PURE__ */ React.createElement("div", { className: "paper front" }, /* @__PURE__ */ React.createElement(ImagePlaceholderIcon, null)), /* @__PURE__ */ React.createElement("div", { className: "arrow" }, /* @__PURE__ */ React.createElement(
    "svg",
    {
      width: "36",
      height: "36",
      viewBox: "0 0 36 36",
      fill: "none",
      stroke: dragOver ? "#ffffff" : "rgba(156,163,176,0.85)",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "6", x2: "18", y2: "28" }),
    /* @__PURE__ */ React.createElement("polyline", { points: "10 22 18 30 26 22" })
  ))), /* @__PURE__ */ React.createElement("div", { className: "hero-headline", style: { marginTop: 40 } }, dragOver ? "Release to import images" : "Drop image files or folders"), /* @__PURE__ */ React.createElement("div", { className: "hero-body", style: dragOver ? { whiteSpace: "nowrap", maxWidth: "none" } : {} }, dragOver ? "Drop your images to begin packing" : "We'll auto-detect Diffuse, Normal, and Packed Metal+Roughness maps and convert them to game-ready DDS textures. PNG, JPG, TGA, BMP and TIFF all supported."), !dragOver && /* @__PURE__ */ React.createElement("div", { className: "hero-buttons" }, /* @__PURE__ */ React.createElement("button", { className: "btn-ghost", onClick: onPickFiles }, /* @__PURE__ */ React.createElement(FileIcon, { color: "#9893FC" }), "Pick Files"), /* @__PURE__ */ React.createElement("button", { className: "btn-ghost", onClick: onPickFolder }, /* @__PURE__ */ React.createElement(FolderIcon, { color: "#9893FC" }), "Pick Folder")));
}
function ModernQueueRow({ row, onShowLog }) {
  const labelText = row.status === "done" ? "COMPLETED" : row.status === "queued" ? "WAITING IN QUEUE" : row.label || row.status.toUpperCase();
  const inputs = maybeInputChips(row.input_map_types);
  const outputs = row.output_map_types || ["diff", "norm", "metal"];
  const done = new Set(row.maps_done || []);
  const iconsFor = (chip) => {
    const t = chip.type;
    if (t === "diff") return [/* @__PURE__ */ React.createElement(ModernSunIcon, { size: 26, color: "#F2B65A" })];
    if (t === "opacity") return [/* @__PURE__ */ React.createElement(ModernSunIcon, { size: 26, color: "#A8A0FF" })];
    if (t === "norm") return [/* @__PURE__ */ React.createElement(ModernWaveIcon, { size: 26 })];
    if (t === "rough") return [/* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#F2B65A" })];
    if (t === "gloss") return [/* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#A8A0FF" })];
    if (t === "metal") return [/* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#9CA3B0" })];
    if (t === "ao") return [/* @__PURE__ */ React.createElement(ModernSunIcon, { size: 26, color: "#6B7280" })];
    if (t === "height") return [/* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#5DD49A" })];
    if (t === "rm") return [
      /* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#9CA3B0" }),
      // metal
      /* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#F2B65A" })
      // roughness
    ];
    if (t === "orm") return [
      /* @__PURE__ */ React.createElement(ModernSunIcon, { size: 26, color: "#6B7280" }),
      // AO
      /* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#F2B65A" }),
      // roughness
      /* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26, color: "#9CA3B0" })
      // metal
    ];
    return [/* @__PURE__ */ React.createElement(ModernCubeIcon, { size: 26 })];
  };
  return /* @__PURE__ */ React.createElement("div", { className: "queue-row", "data-status": row.status }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "row-name" }, row.name), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "flex", alignItems: "center", flexWrap: "wrap" } }, inputs.map((c, i) => {
    const nodes = iconsFor(c);
    return /* @__PURE__ */ React.createElement("span", { key: `${c.type}-${i}`, className: "row-input-chip" }, nodes.map((n, j) => /* @__PURE__ */ React.createElement(React.Fragment, { key: j }, j > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip-plus" }, "+"), n)), /* @__PURE__ */ React.createElement("span", { className: "label" }, c.label));
  }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "row-output-label" }, "Output DDS"), outputs.map((mt) => /* @__PURE__ */ React.createElement("div", { key: mt, className: "dds-chip" }, /* @__PURE__ */ React.createElement("span", { className: "dds-badge" }, "DDS"), DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`, (row.status === "done" || done.has(mt)) && /* @__PURE__ */ React.createElement("span", { className: "check", style: { color: "#5DD49A" } }, "\u2713")))), /* @__PURE__ */ React.createElement("div", { className: "row-status", "data-status": row.status }, /* @__PURE__ */ React.createElement(Donut, { pct: row.pct, status: row.status, theme: "modern" }), /* @__PURE__ */ React.createElement("div", { className: "row-status-text" }, /* @__PURE__ */ React.createElement("div", { className: "label" }, labelText), row.status === "done" && /* @__PURE__ */ React.createElement("div", { className: "eta" }, "100%"), row.status === "queued" && /* @__PURE__ */ React.createElement("div", { className: "eta" }, row.eta_text || `Position ${row.queue_position || ""}`), (row.status === "encoding" || row.status === "packing" || row.status === "writing" || row.status === "reading") && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "eta" }, row.eta_text || `${Math.round(row.pct)}%`), /* @__PURE__ */ React.createElement("div", { className: "row-progress-bar", style: { width: 240 } }, /* @__PURE__ */ React.createElement("div", { className: "fill", style: { width: `${row.pct}%` } }))), row.status === "error" && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "eta",
      style: { color: "var(--red)", cursor: "pointer", textDecoration: "underline" },
      onClick: () => onShowLog && onShowLog(row)
    },
    "See log \u2197"
  ))));
}
function ModernQueue({ rows, onClear, canClear, onAddFiles, onAddFolder, onShowLog }) {
  const inProgress = rows.filter((r) => r.status !== "queued").length;
  return /* @__PURE__ */ React.createElement("div", { className: "queue" }, /* @__PURE__ */ React.createElement("div", { className: "queue-header", style: { position: "relative" } }, canClear && /* @__PURE__ */ React.createElement("div", { className: "queue-actions left" }, /* @__PURE__ */ React.createElement("button", { className: "queue-action-btn", onClick: onAddFiles, title: "Add files" }, /* @__PURE__ */ React.createElement(FileIcon, { color: "#9893FC" }), " Add Files"), /* @__PURE__ */ React.createElement("button", { className: "queue-action-btn", onClick: onAddFolder, title: "Add folder" }, /* @__PURE__ */ React.createElement(FolderIcon, { color: "#9893FC" }), " Add Folder")), "Conversion Queue ", /* @__PURE__ */ React.createElement("span", { className: "count" }, inProgress, " of ", rows.length), canClear && /* @__PURE__ */ React.createElement("button", { className: "queue-clear-btn", onClick: onClear, title: "Clear queue" }, "Clear \u2715")), /* @__PURE__ */ React.createElement("div", { className: "queue-list" }, rows.map((r) => /* @__PURE__ */ React.createElement(ModernQueueRow, { key: r.set_id, row: r, onShowLog }))));
}
window.ModernHeroEmpty = ModernHeroEmpty;
window.ModernQueue = ModernQueue;
