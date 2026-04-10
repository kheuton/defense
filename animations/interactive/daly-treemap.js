import * as d3 from "d3";

const YEAR = window.DALY_YEAR || 2023;

// ── Colour palette ────────────────────────────────────────────────────────────
// Within each L1 category, L2 children share a colour family.
// Colours are assigned by rank (largest → darkest).

const L2_COLORS = {
  // Non-communicable diseases — purple family
  "Cardiovascular diseases":              "#3d35a5",
  "Neoplasms":                            "#5248c8",
  "Mental disorders":                     "#7c6af7",
  "Musculoskeletal disorders":            "#6459da",
  "Other non-communicable diseases":      "#4840b8",
  "Diabetes and kidney diseases":         "#8a7cf9",
  "Neurological disorders":               "#9a8ffb",
  "Chronic respiratory diseases":         "#a9a0fc",
  "Digestive diseases":                   "#5c52cc",
  "Sense organ diseases":                 "#b8b2fd",
  "Skin and subcutaneous diseases":       "#cac6fe",
  "Substance use disorders":              "#d8d5ff",

  // Communicable, maternal, neonatal, and nutritional diseases — coral family
  "Maternal and neonatal disorders":                  "#b83a1e",
  "Respiratory infections and tuberculosis":          "#d44e2e",
  "Enteric infections":                               "#ff7c57",
  "Other infectious diseases":                        "#a83318",
  "Neglected tropical diseases and malaria":          "#ff9a7a",
  "Nutritional deficiencies":                         "#c95a38",
  "HIV/AIDS and sexually transmitted infections":     "#ffb8a4",

  // Injuries — teal family
  "Unintentional injuries":               "#236e56",
  "Transport injuries":                   "#50c8a8",
  "Self-harm and interpersonal violence": "#349e80",
};

// L1 border colours for the outer stroke
const L1_STROKE = {
  "Non-communicable diseases": "#7c6af7",
  "Communicable, maternal, neonatal, and nutritional diseases": "#ff7c57",
  "Injuries": "#50c8a8",
};

// Short labels for medium-sized cells
const SHORT = {
  "Cardiovascular diseases":              "Cardiovascular",
  "Neoplasms":                            "Cancers",
  "Mental disorders":                     "Mental",
  "Musculoskeletal disorders":            "Musculoskeletal",
  "Other non-communicable diseases":      "Other NCD",
  "Diabetes and kidney diseases":         "Diabetes/Kidney",
  "Neurological disorders":               "Neurological",
  "Chronic respiratory diseases":         "Resp. diseases",
  "Digestive diseases":                   "Digestive",
  "Sense organ diseases":                 "Sense organs",
  "Skin and subcutaneous diseases":       "Skin",
  "Substance use disorders":              "Substance use",
  "Maternal and neonatal disorders":      "Maternal/Neonatal",
  "Respiratory infections and tuberculosis": "Resp. inf. & TB",
  "Enteric infections":                   "Enteric infections",
  "Other infectious diseases":            "Other infectious",
  "Neglected tropical diseases and malaria": "NTDs & Malaria",
  "Nutritional deficiencies":             "Nutrition",
  "HIV/AIDS and sexually transmitted infections": "HIV/AIDS & STIs",
  "Unintentional injuries":               "Unintentional",
  "Transport injuries":                   "Transport",
  "Self-harm and interpersonal violence": "Self-harm & violence",
};

// ── Hierarchy data ────────────────────────────────────────────────────────────

const DATA = {
  1990: {
    name: "All causes",
    children: [
      {
        name: "Non-communicable diseases",
        children: [
          { name: "Cardiovascular diseases",              value: 0.116836 },
          { name: "Neoplasms",                            value: 0.065426 },
          { name: "Other non-communicable diseases",      value: 0.048413 },
          { name: "Musculoskeletal disorders",            value: 0.031397 },
          { name: "Mental disorders",                     value: 0.030426 },
          { name: "Digestive diseases",                   value: 0.027393 },
          { name: "Chronic respiratory diseases",         value: 0.024668 },
          { name: "Neurological disorders",               value: 0.021299 },
          { name: "Diabetes and kidney diseases",         value: 0.019889 },
          { name: "Sense organ diseases",                 value: 0.014288 },
          { name: "Skin and subcutaneous diseases",       value: 0.008912 },
          { name: "Substance use disorders",              value: 0.008176 },
        ]
      },
      {
        name: "Communicable, maternal, neonatal, and nutritional diseases",
        children: [
          { name: "Maternal and neonatal disorders",                  value: 0.117580 },
          { name: "Respiratory infections and tuberculosis",          value: 0.108664 },
          { name: "Enteric infections",                               value: 0.090884 },
          { name: "Other infectious diseases",                        value: 0.076836 },
          { name: "Neglected tropical diseases and malaria",          value: 0.036418 },
          { name: "Nutritional deficiencies",                         value: 0.030770 },
          { name: "HIV/AIDS and sexually transmitted infections",     value: 0.010744 },
        ]
      },
      {
        name: "Injuries",
        children: [
          { name: "Unintentional injuries",               value: 0.056028 },
          { name: "Transport injuries",                   value: 0.029020 },
          { name: "Self-harm and interpersonal violence", value: 0.025935 },
        ]
      }
    ]
  },
  2023: {
    name: "All causes",
    children: [
      {
        name: "Non-communicable diseases",
        children: [
          { name: "Cardiovascular diseases",              value: 0.156105 },
          { name: "Neoplasms",                            value: 0.098804 },
          { name: "Mental disorders",                     value: 0.060986 },
          { name: "Musculoskeletal disorders",            value: 0.058343 },
          { name: "Other non-communicable diseases",      value: 0.054006 },
          { name: "Diabetes and kidney diseases",         value: 0.048800 },
          { name: "Neurological disorders",               value: 0.041702 },
          { name: "Chronic respiratory diseases",         value: 0.039096 },
          { name: "Digestive diseases",                   value: 0.031649 },
          { name: "Sense organ diseases",                 value: 0.028345 },
          { name: "Skin and subcutaneous diseases",       value: 0.013028 },
          { name: "Substance use disorders",              value: 0.012710 },
        ]
      },
      {
        name: "Communicable, maternal, neonatal, and nutritional diseases",
        children: [
          { name: "Maternal and neonatal disorders",                  value: 0.066406 },
          { name: "Respiratory infections and tuberculosis",          value: 0.065551 },
          { name: "Enteric infections",                               value: 0.024558 },
          { name: "Neglected tropical diseases and malaria",          value: 0.025353 },
          { name: "Other infectious diseases",                        value: 0.022030 },
          { name: "Nutritional deficiencies",                         value: 0.020774 },
          { name: "HIV/AIDS and sexually transmitted infections",     value: 0.019012 },
        ]
      },
      {
        name: "Injuries",
        children: [
          { name: "Unintentional injuries",               value: 0.055626 },
          { name: "Transport injuries",                   value: 0.028604 },
          { name: "Self-harm and interpersonal violence", value: 0.028513 },
        ]
      }
    ]
  }
};

// ── Render ────────────────────────────────────────────────────────────────────

const W = window.innerWidth;
const H = window.innerHeight;

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", W)
  .attr("height", H)
  .style("display", "block");

// Background
svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#11111e");

// Build treemap
const root = d3.hierarchy(DATA[YEAR])
  .sum(d => d.value)
  .sort((a, b) => b.value - a.value);

d3.treemap()
  .size([W, H])
  .paddingOuter(2)
  .paddingInner(1.5)
  .round(true)(root);

// Only draw leaves (L2 cells)
const leaves = root.leaves();

// Cell groups
const cell = svg.selectAll("g.cell")
  .data(leaves)
  .join("g")
    .attr("class", "cell")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

// Rectangles
cell.append("rect")
  .attr("width",  d => Math.max(0, d.x1 - d.x0))
  .attr("height", d => Math.max(0, d.y1 - d.y0))
  .attr("fill",   d => L2_COLORS[d.data.name] || "#555")
  .attr("rx", 2)
  .attr("ry", 2);

// Labels
cell.each(function(d) {
  const cw = d.x1 - d.x0;
  const ch = d.y1 - d.y0;
  const pct = (d.data.value * 100).toFixed(1) + "%";
  const g = d3.select(this);

  // Skip very small cells
  if (cw < 30 || ch < 20) return;

  const name = cw > 110 ? d.data.name : (SHORT[d.data.name] || d.data.name);
  const fontSize = cw > 90 ? 12 : 10;
  const cx = cw / 2;

  // Wrap name into lines of ~(cw-8) chars wide
  const maxChars = Math.floor((cw - 8) / (fontSize * 0.55));
  const words = name.split(" ");
  const lines = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? current + " " + w : w;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);

  // Vertical layout: lines + pct, centered
  const lineH = fontSize + 2;
  const showPct = ch > lineH * (lines.length + 1) + 4;
  const totalH = lineH * lines.length + (showPct ? lineH : 0);
  let y0 = (ch - totalH) / 2 + fontSize;

  // Name lines
  lines.forEach((line, i) => {
    g.append("text")
      .attr("x", cx)
      .attr("y", y0 + i * lineH)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .attr("font-size", fontSize)
      .attr("font-family", "Inter, system-ui, sans-serif")
      .attr("font-weight", "600")
      .style("paint-order", "stroke")
      .style("stroke", "rgba(0,0,0,0.5)")
      .style("stroke-width", "2px")
      .text(line);
  });

  // Percentage
  if (showPct) {
    g.append("text")
      .attr("x", cx)
      .attr("y", y0 + lines.length * lineH)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.75)")
      .attr("font-size", fontSize - 1)
      .attr("font-family", "Inter, system-ui, sans-serif")
      .style("paint-order", "stroke")
      .style("stroke", "rgba(0,0,0,0.4)")
      .style("stroke-width", "2px")
      .text(pct);
  }
});

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltip = d3.select("body").append("div")
  .attr("id", "tooltip")
  .style("position", "fixed")
  .style("pointer-events", "none")
  .style("background", "rgba(17,17,30,0.92)")
  .style("border", "1px solid rgba(255,255,255,0.15)")
  .style("border-radius", "6px")
  .style("padding", "8px 12px")
  .style("font-family", "Inter, system-ui, sans-serif")
  .style("font-size", "13px")
  .style("color", "#e8e8f0")
  .style("line-height", "1.5")
  .style("max-width", "240px")
  .style("opacity", "0")
  .style("transition", "opacity 0.15s");

cell.on("mousemove", function(event, d) {
    const parent = d.parent?.data?.name || "";
    const pct = (d.data.value * 100).toFixed(2) + "%";
    tooltip
      .style("opacity", "1")
      .style("left", (event.clientX + 14) + "px")
      .style("top",  (event.clientY - 10) + "px")
      .html(`<strong>${d.data.name}</strong><br><span style="color:#888899">${parent}</span><br><span style="color:#ffd166">${pct} of global DALYs</span>`);
  })
  .on("mouseleave", function() {
    tooltip.style("opacity", "0");
  });

// ── Year label ────────────────────────────────────────────────────────────────

svg.append("text")
  .attr("x", W - 14)
  .attr("y", H - 10)
  .attr("text-anchor", "end")
  .attr("fill", "rgba(136,136,153,0.6)")
  .attr("font-size", 11)
  .attr("font-family", "Inter, system-ui, sans-serif")
  .text(`GBD ${YEAR} · Global DALYs · Source: IHME`);

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { label: "Non-communicable diseases",                                  color: "#7c6af7" },
  { label: "Communicable, maternal, neonatal & nutritional diseases",    color: "#ff7c57" },
  { label: "Injuries",                                                   color: "#50c8a8" },
];

const legend = svg.append("g")
  .attr("transform", `translate(14, ${H - 14})`);

let lx = 0;
LEGEND.forEach(({ label, color }) => {
  const g = legend.append("g").attr("transform", `translate(${lx}, 0)`);
  g.append("rect")
    .attr("width", 10).attr("height", 10)
    .attr("y", -10)
    .attr("rx", 2)
    .attr("fill", color);
  g.append("text")
    .attr("x", 14).attr("y", -1)
    .attr("fill", "rgba(232,232,240,0.7)")
    .attr("font-size", 11)
    .attr("font-family", "Inter, system-ui, sans-serif")
    .text(label);
  lx += label.length * 6.5 + 30;
});
