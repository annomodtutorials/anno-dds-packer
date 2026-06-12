function AnnoChrome() {
  return null;
}
function AnnoHeroEmpty({ dragOver, onPickFiles, onPickFolder, unpackMode }) {
  return /* @__PURE__ */ React.createElement("div", { className: "hero-stack" }, /* @__PURE__ */ React.createElement("div", { className: "hero-icon" }, /* @__PURE__ */ React.createElement("img", { src: "assets/anno_hero_logo.png", alt: "Anno A logo" })), /* @__PURE__ */ React.createElement("div", { className: "hero-headline" }, dragOver ? unpackMode ? "Release to Import DDS Files" : "Release to Import Images" : unpackMode ? "Drop DDS Files or Folders" : "Drop Image Files or Folders"), /* @__PURE__ */ React.createElement("div", { className: "hero-body", style: dragOver ? { whiteSpace: "nowrap", maxWidth: "none" } : {} }, dragOver ? unpackMode ? "Drop DDS files to begin unpacking" : "Drop your images to begin packing" : unpackMode ? "Drop Anno DDS texture files to unpack them back into individual PNG maps \u2014 Diffuse, Normal, Metalness, AO, Gloss and more." : "We'll auto-detect Diffuse, Normal, and Packed Metal+Roughness maps and convert them to game-ready DDS textures. PNG, JPG, TGA, BMP and TIFF all supported."), !dragOver && /* @__PURE__ */ React.createElement("div", { className: "hero-buttons" }, /* @__PURE__ */ React.createElement("button", { className: "btn-ghost", onClick: onPickFiles }, /* @__PURE__ */ React.createElement(FileIcon, { color: "#C9A152" }), unpackMode ? "Pick DDS Files" : "Pick Files"), /* @__PURE__ */ React.createElement("button", { className: "btn-ghost", onClick: onPickFolder }, /* @__PURE__ */ React.createElement(FolderIcon, { color: "#C9A152" }), "Pick Folder")));
}
const DDS_LABEL = {
  diff: "DIFFUSE.DDS",
  norm: "NORMAL.DDS",
  metal: "METAL.DDS",
  height: "HEIGHT.DDS",
  mask: "MASK.DDS",
  icon: "ICON.DDS"
};
const PNG_OUTPUT_LABEL = {
  diffuse: "DIFFUSE.PNG",
  opacity: "OPACITY.PNG",
  normal: "NORMAL.PNG",
  rough: "ROUGHNESS.PNG",
  metal: "METAL.PNG",
  ao: "AO.PNG",
  height: "HEIGHT.PNG",
  emission: "EMISSION.PNG",
  mask_alpha: "MASK_ALPHA.PNG"
};
const INPUT_CHIP_DEFS = {
  diff: { kind: "diffuse", label: "Diffuse", icons: ["assets/icon_diffuse.png"] },
  opacity: { kind: "diffuse", label: "Opacity", icons: ["assets/icon_opacity.png"] },
  norm: { kind: "normal", label: "Normal", icons: ["assets/icon_normals.png"] },
  metal: { kind: "packed", label: "Metal", icons: ["assets/icon_metal.png"] },
  rough: { kind: "packed", label: "Roughness", icons: ["assets/icon_roughness.png"] },
  // Glossiness = inverse of roughness — same icon, semantically equivalent.
  gloss: { kind: "packed", label: "Glossiness", icons: ["assets/icon_roughness.png"] },
  ao: { kind: "packed", label: "AO", icons: ["assets/icon_ao.png"] },
  height: { kind: "height", label: "Height", icons: ["assets/icon_height.png"] },
  // Packed maps: composite icons showing the channels combined.
  rm: { kind: "packed", label: "Packed M+R", icons: ["assets/icon_metal.png", "assets/icon_roughness.png"] },
  orm: { kind: "packed", label: "Packed O+R+M", icons: ["assets/icon_ao.png", "assets/icon_roughness.png", "assets/icon_metal.png"] },
  emission: { kind: "emission", label: "Emission", icons: ["assets/icon_emission.png"] },
  // UI icon textures: straight RGBA, no channel packing, BC7_UNORM_SRGB
  icon: { kind: "diffuse", label: "Icon", icons: ["assets/icon_diffuse.png"] }
};
const DDS_UNPACK_INPUT_DEFS = {
  diff: { label: "Diffuse", icons: ["assets/icon_diffuse.png", "assets/icon_opacity.png"] },
  norm: { label: "Normal", icons: ["assets/icon_normals.png", "assets/icon_roughness.png"] },
  metal: { label: "Metal", icons: ["assets/icon_metal.png", "assets/icon_ao.png"] },
  height: { label: "Height", icons: ["assets/icon_height.png"] },
  mask: { label: "Mask", icons: ["assets/icon_emission.png"] }
};
const DDS_OUTPUT_ICONS = {
  diff: ["assets/icon_diffuse.png", "assets/icon_opacity.png"],
  norm: ["assets/icon_normals.png", "assets/icon_roughness.png"],
  metal: ["assets/icon_metal.png", "assets/icon_ao.png"],
  height: ["assets/icon_height.png"],
  mask: ["assets/icon_emission.png"],
  icon: ["assets/icon_diffuse.png"]
};
const PNG_OUTPUT_ICONS = {
  diffuse: "assets/icon_diffuse.png",
  opacity: "assets/icon_opacity.png",
  normal: "assets/icon_normals.png",
  rough: "assets/icon_roughness.png",
  metal: "assets/icon_metal.png",
  ao: "assets/icon_ao.png",
  height: "assets/icon_height.png",
  emission: "assets/icon_emission.png",
  mask_alpha: "assets/icon_opacity.png"
};
function getDdsOutputIcons(mt, inputTypes) {
  const inp = new Set(inputTypes || []);
  switch (mt) {
    case "diff":
      return inp.has("opacity") ? ["assets/icon_diffuse.png", "assets/icon_opacity.png"] : ["assets/icon_diffuse.png"];
    case "norm": {
      const hasRough = inp.has("rough") || inp.has("gloss") || inp.has("rm") || inp.has("orm");
      return hasRough ? ["assets/icon_normals.png", "assets/icon_roughness.png"] : ["assets/icon_normals.png"];
    }
    case "metal": {
      const hasAo = inp.has("ao") || inp.has("orm");
      return hasAo ? ["assets/icon_metal.png", "assets/icon_ao.png"] : ["assets/icon_metal.png"];
    }
    case "height":
      return ["assets/icon_height.png"];
    case "mask":
      return ["assets/icon_emission.png"];
    case "icon":
      return ["assets/icon_diffuse.png"];
    default:
      return [];
  }
}
function maybeInputChips(inputs) {
  const out = [];
  for (const t of inputs || []) {
    const def = INPUT_CHIP_DEFS[t];
    if (def) out.push({ ...def, type: t });
  }
  return out.slice(0, 6);
}
function AnnoQueueRow({ row, onShowLog, onRemove, unpackMode }) {
  const labelText = row.status === "done" ? unpackMode ? "UNPACKED" : "COMPLETED" : row.status === "queued" ? "WAITING IN QUEUE" : row.label || row.status.toUpperCase();
  const done = new Set(row.maps_done || []);
  const packInputs = maybeInputChips(row.input_map_types);
  const packOutputs = row.output_map_types || ["diff", "norm", "metal"];
  const unpackInputs = row.input_dds_types || [];
  const unpackOutputs = row.status === "done" ? (row.output_png_types || []).filter((pt) => done.has(pt)) : row.output_png_types || [];
  return /* @__PURE__ */ React.createElement("div", { className: "queue-row", "data-status": row.status, style: { position: "relative" } }, (row.status === "queued" || row.status === "done" || row.status === "error") && onRemove && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onRemove(row.set_id),
      title: "Remove from queue",
      style: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        padding: 0,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 5,
        color: "rgba(255,255,255,0.4)",
        fontSize: 11,
        lineHeight: "22px",
        textAlign: "center",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.background = "rgba(192,57,43,0.55)";
        e.currentTarget.style.color = "#fff";
        e.currentTarget.style.borderColor = "rgba(192,57,43,0.8)";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = "rgba(255,255,255,0.4)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
      }
    },
    "\u2715"
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "row-name" }, row.name), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 10 } }, unpackMode ? unpackInputs.map((mt) => {
    const def = DDS_UNPACK_INPUT_DEFS[mt] || { label: mt.toUpperCase(), icons: [] };
    return /* @__PURE__ */ React.createElement(
      ChipPreview,
      {
        key: mt,
        className: "row-input-chip",
        desc: { mode: "unpack", kind: "input", set_id: row.set_id, map_type: mt, label: def.label }
      },
      def.icons.map((p, j) => /* @__PURE__ */ React.createElement(React.Fragment, { key: j }, j > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip-plus" }, "+"), /* @__PURE__ */ React.createElement("img", { src: p, alt: "", style: { width: 26, height: 26, objectFit: "contain" } }))),
      /* @__PURE__ */ React.createElement("span", { className: "label" }, def.label)
    );
  }) : packInputs.map((c, i) => /* @__PURE__ */ React.createElement(
    ChipPreview,
    {
      key: `${c.type}-${i}`,
      className: "row-input-chip",
      desc: { mode: "pack", kind: "input", set_id: row.set_id, map_type: c.type, label: c.label }
    },
    (c.icons || []).map((p, j) => /* @__PURE__ */ React.createElement(React.Fragment, { key: j }, j > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip-plus" }, "+"), /* @__PURE__ */ React.createElement("img", { src: p, alt: "", style: { width: 26, height: 26, objectFit: "contain" } }))),
    /* @__PURE__ */ React.createElement("span", { className: "label" }, c.label)
  )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "row-output-label" }, unpackMode ? "Output PNG" : "Output DDS"), unpackMode ? unpackOutputs.map((pt) => {
    const icon = PNG_OUTPUT_ICONS[pt];
    return /* @__PURE__ */ React.createElement(
      ChipPreview,
      {
        key: pt,
        as: "div",
        className: "dds-chip",
        desc: { mode: "unpack", kind: "output", set_id: row.set_id, map_type: pt, label: PNG_OUTPUT_LABEL[pt] || `${pt.toUpperCase()}.PNG` }
      },
      /* @__PURE__ */ React.createElement("span", { style: { width: 128, flexShrink: 0, whiteSpace: "nowrap" } }, PNG_OUTPUT_LABEL[pt] || `${pt.toUpperCase()}.PNG`),
      /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", width: 22, marginLeft: 16, flexShrink: 0 } }, icon && /* @__PURE__ */ React.createElement("img", { src: icon, alt: "", style: { width: 22, height: 22, objectFit: "contain" } })),
      done.has(pt) && /* @__PURE__ */ React.createElement("span", { className: "check" }, "\u2713")
    );
  }) : packOutputs.map((mt) => {
    const icons = getDdsOutputIcons(mt, row.input_map_types);
    return /* @__PURE__ */ React.createElement(
      ChipPreview,
      {
        key: mt,
        as: "div",
        className: "dds-chip",
        desc: { mode: "pack", kind: "output", set_id: row.set_id, map_type: mt, lod: 0, label: DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS` }
      },
      /* @__PURE__ */ React.createElement("span", { style: { width: 100, flexShrink: 0, whiteSpace: "nowrap" } }, DDS_LABEL[mt] || `${mt.toUpperCase()}.DDS`),
      /* @__PURE__ */ React.createElement("span", { style: { display: "inline-grid", gridTemplateColumns: "22px 12px 22px", alignItems: "center", marginLeft: 16, flexShrink: 0 } }, /* @__PURE__ */ React.createElement("img", { src: icons[0], alt: "", style: { width: 22, height: 22, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("span", { style: { textAlign: "center", fontSize: 9, opacity: icons.length > 1 ? 0.5 : 0 } }, "+"), icons[1] ? /* @__PURE__ */ React.createElement("img", { src: icons[1], alt: "", style: { width: 22, height: 22, objectFit: "contain" } }) : /* @__PURE__ */ React.createElement("span", null)),
      (row.status === "done" || done.has(mt)) && /* @__PURE__ */ React.createElement("span", { className: "check" }, "\u2713")
    );
  })), /* @__PURE__ */ React.createElement("div", { className: "row-status", "data-status": row.status }, /* @__PURE__ */ React.createElement(Donut, { pct: row.pct, status: row.status, theme: "anno" }), /* @__PURE__ */ React.createElement("div", { className: "row-status-text" }, /* @__PURE__ */ React.createElement("div", { className: "label" }, labelText), row.status === "done" && /* @__PURE__ */ React.createElement("div", { className: "eta" }, "100%"), row.status === "queued" && /* @__PURE__ */ React.createElement("div", { className: "eta" }, row.eta_text || `Position ${row.queue_position || ""}`), (row.status === "encoding" || row.status === "packing" || row.status === "writing" || row.status === "reading") && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "eta" }, row.eta_text || `${Math.round(row.pct)}%`), /* @__PURE__ */ React.createElement("div", { className: "row-progress-bar", style: { width: 240 } }, /* @__PURE__ */ React.createElement("div", { className: "fill", style: { width: `${row.pct}%` } }))), row.status === "error" && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "eta",
      style: { color: "var(--red-error)", cursor: "pointer", textDecoration: "underline" },
      onClick: () => onShowLog && onShowLog(row)
    },
    "See log \u2197"
  ))));
}
function AnnoQueue({ rows, onClear, canClear, onAddFiles, onAddFolder, onShowLog, onRemove, unpackMode }) {
  const inProgress = rows.filter((r) => r.status !== "queued").length;
  const queueTitle = unpackMode ? "Unpack Queue" : "Conversion Queue";
  return /* @__PURE__ */ React.createElement("div", { className: "queue" }, /* @__PURE__ */ React.createElement("div", { className: "queue-header", style: { textAlign: "center", position: "relative" } }, canClear && /* @__PURE__ */ React.createElement("div", { className: "queue-actions left" }, /* @__PURE__ */ React.createElement("button", { className: "queue-action-btn", onClick: onAddFiles, title: "Add files" }, /* @__PURE__ */ React.createElement(FileIcon, { color: "#E6C57A" }), " ", unpackMode ? "Add DDS" : "Add Files"), /* @__PURE__ */ React.createElement("button", { className: "queue-action-btn", onClick: onAddFolder, title: "Add folder" }, /* @__PURE__ */ React.createElement(FolderIcon, { color: "#E6C57A" }), " Add Folder")), queueTitle, /* @__PURE__ */ React.createElement("span", { className: "diamond" }, "\u25C6"), /* @__PURE__ */ React.createElement("span", { className: "count" }, inProgress, " of ", rows.length), canClear && /* @__PURE__ */ React.createElement("button", { className: "queue-clear-btn", onClick: onClear, title: "Clear queue" }, "Clear \u2715")), /* @__PURE__ */ React.createElement("div", { className: "queue-list" }, rows.map((r) => /* @__PURE__ */ React.createElement(AnnoQueueRow, { key: r.set_id, row: r, onShowLog, onRemove, unpackMode }))));
}
window.AnnoChrome = AnnoChrome;
window.AnnoHeroEmpty = AnnoHeroEmpty;
window.AnnoQueue = AnnoQueue;
window.maybeInputChips = maybeInputChips;
window.DDS_LABEL = DDS_LABEL;
window.PNG_OUTPUT_LABEL = PNG_OUTPUT_LABEL;
