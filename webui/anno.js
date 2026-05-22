function AnnoChrome() {
  return null;
}
function AnnoHeroEmpty({ dragOver, onPickFiles, onPickFolder }) {
  return /* @__PURE__ */ React.createElement("div", { className: "hero-stack" }, /* @__PURE__ */ React.createElement("div", { className: "hero-icon" }, /* @__PURE__ */ React.createElement("img", { src: "assets/anno_hero_logo.png", alt: "Anno A logo" })), /* @__PURE__ */ React.createElement("div", { className: "hero-headline" }, dragOver ? "Release to Import Images" : "Drop Image Files or Folders"), /* @__PURE__ */ React.createElement("div", { className: "hero-body", style: dragOver ? { whiteSpace: "nowrap", maxWidth: "none" } : {} }, dragOver ? "Drop your images to begin packing" : "We'll auto-detect Diffuse, Normal, and Packed Metal+Roughness maps and convert them to game-ready DDS textures. PNG, JPG, TGA, BMP and TIFF all supported."), !dragOver && /* @__PURE__ */ React.createElement("div", { className: "hero-buttons" }, /* @__PURE__ */ React.createElement("button", { className: "btn-ghost", onClick: onPickFiles }, /* @__PURE__ */ React.createElement(FileIcon, { color: "#C9A152" }), "Pick Files"), /* @__PURE__ */ React.createElement("button", { className: "btn-ghost", onClick: onPickFolder }, /* @__PURE__ */ React.createElement(FolderIcon, { color: "#C9A152" }), "Pick Folder")));
}
const DDS_LABEL = {
  diff: "DIFFUSE.DDS",
  norm: "NORMAL.DDS",
  metal: "METAL.DDS",
  height: "HEIGHT.DDS"
};
const INPUT_CHIP_DEFS = {
  diff: { kind: "diffuse", label: "Diffuse", icons: ["assets/icon_diffuse.png"] },
  opacity: { kind: "diffuse", label: "Opacity", icons: ["assets/icon_opacity.png"] },
  norm: { kind: "normal", label: "Normal", icons: ["assets/icon_normal.png"] },
  metal: { kind: "packed", label: "Metal", icons: ["assets/icon_metal.png"] },
  rough: { kind: "packed", label: "Roughness", icons: ["assets/icon_roughness.png"] },
  // Glossiness = inverse of roughness — same icon, semantically equivalent.
  gloss: { kind: "packed", label: "Glossiness", icons: ["assets/icon_roughness.png"] },
  ao: { kind: "packed", label: "AO", icons: ["assets/icon_ao.png"] },
  height: { kind: "height", label: "Height", icons: ["assets/icon_height.png"] },
  // Packed maps: composite icons showing the channels combined.
  rm: { kind: "packed", label: "Packed M+R", icons: ["assets/icon_metal.png", "assets/icon_roughness.png"] },
  orm: { kind: "packed", label: "Packed O+R+M", icons: ["assets/icon_ao.png", "assets/icon_roughness.png", "assets/icon_metal.png"] }
};
function maybeInputChips(inputs) {
  const out = [];
  for (const t of inputs || []) {
    const def = INPUT_CHIP_DEFS[t];
    if (def) out.push({ ...def, type: t });
  }
  return out.slice(0, 6);
}
function AnnoQueueRow({ row, onShowLog }) {
  const labelText = row.status === "done" ? "COMPLETED" : row.status === "queued" ? "WAITING IN QUEUE" : row.label || row.status.toUpperCase();
  const inputs = maybeInputChips(row.input_map_types);
  const outputs = row.output_map_types || ["diff", "norm", "metal"];
  const done = new Set(row.maps_done || []);
  return /* @__PURE__ */ React.createElement("div", { className: "queue-row", "data-status": row.status }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "row-name" }, row.name), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "flex", alignItems: "center", flexWrap: "wrap" } }, inputs.map((c, i) => /* @__PURE__ */ React.createElement("span", { key: `${c.type}-${i}`, className: "row-input-chip" }, (c.icons || []).map((p, j) => /* @__PURE__ */ React.createElement(React.Fragment, { key: j }, j > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip-plus" }, "+"), /* @__PURE__ */ React.createElement("img", { src: p, alt: "", style: { width: 26, height: 26, objectFit: "contain" } }))), /* @__PURE__ */ React.createElement("span", { className: "label" }, c.label))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "row-output-label" }, "Output DDS"), outputs.map((mt) => /* @__PURE__ */ React.createElement("div", { key: mt, className: "dds-chip" }, /* @__PURE__ */ React.createElement("span", { className: "dds-badge" }, "DDS"), DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`, (row.status === "done" || done.has(mt)) && /* @__PURE__ */ React.createElement("span", { className: "check" }, "\u2713")))), /* @__PURE__ */ React.createElement("div", { className: "row-status", "data-status": row.status }, /* @__PURE__ */ React.createElement(Donut, { pct: row.pct, status: row.status, theme: "anno" }), /* @__PURE__ */ React.createElement("div", { className: "row-status-text" }, /* @__PURE__ */ React.createElement("div", { className: "label" }, labelText), row.status === "done" && /* @__PURE__ */ React.createElement("div", { className: "eta" }, "100%"), row.status === "queued" && /* @__PURE__ */ React.createElement("div", { className: "eta" }, row.eta_text || `Position ${row.queue_position || ""}`), (row.status === "encoding" || row.status === "packing" || row.status === "writing" || row.status === "reading") && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "eta" }, row.eta_text || `${Math.round(row.pct)}%`), /* @__PURE__ */ React.createElement("div", { className: "row-progress-bar", style: { width: 240 } }, /* @__PURE__ */ React.createElement("div", { className: "fill", style: { width: `${row.pct}%` } }))), row.status === "error" && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "eta",
      style: { color: "var(--red-error)", cursor: "pointer", textDecoration: "underline" },
      onClick: () => onShowLog && onShowLog(row)
    },
    "See log \u2197"
  ))));
}
function AnnoQueue({ rows, onClear, canClear, onAddFiles, onAddFolder, onShowLog }) {
  const inProgress = rows.filter((r) => r.status !== "queued").length;
  return /* @__PURE__ */ React.createElement("div", { className: "queue" }, /* @__PURE__ */ React.createElement("div", { className: "queue-header", style: { textAlign: "center", position: "relative" } }, canClear && /* @__PURE__ */ React.createElement("div", { className: "queue-actions left" }, /* @__PURE__ */ React.createElement("button", { className: "queue-action-btn", onClick: onAddFiles, title: "Add files" }, /* @__PURE__ */ React.createElement(FileIcon, { color: "#E6C57A" }), " Add Files"), /* @__PURE__ */ React.createElement("button", { className: "queue-action-btn", onClick: onAddFolder, title: "Add folder" }, /* @__PURE__ */ React.createElement(FolderIcon, { color: "#E6C57A" }), " Add Folder")), "Conversion Queue", /* @__PURE__ */ React.createElement("span", { className: "diamond" }, "\u25C6"), /* @__PURE__ */ React.createElement("span", { className: "count" }, inProgress, " of ", rows.length), canClear && /* @__PURE__ */ React.createElement("button", { className: "queue-clear-btn", onClick: onClear, title: "Clear queue" }, "Clear \u2715")), /* @__PURE__ */ React.createElement("div", { className: "queue-list" }, rows.map((r) => /* @__PURE__ */ React.createElement(AnnoQueueRow, { key: r.set_id, row: r, onShowLog }))));
}
window.AnnoChrome = AnnoChrome;
window.AnnoHeroEmpty = AnnoHeroEmpty;
window.AnnoQueue = AnnoQueue;
window.maybeInputChips = maybeInputChips;
window.DDS_LABEL = DDS_LABEL;
