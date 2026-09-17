// Serialized into the tab by scripting.executeScript; keep this self-contained.
export function expandStudy(criteria) {
  const clean = (v) =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
  const value = (r, s) => {
    const n = r.querySelector(s);
    return clean(n?.getAttribute("origvalue") || n?.textContent);
  };
  const matches = [],
    docs = new Set();
  function visit(doc) {
    if (docs.has(doc)) return;
    docs.add(doc);
    function hidden(n) {
      return (
        !!n &&
        (n.hidden ||
          n.classList.contains("sf-hidden") ||
          doc.defaultView.getComputedStyle(n).display === "none" ||
          doc.defaultView.getComputedStyle(n).visibility === "hidden" ||
          hidden(n.parentElement))
      );
    }
    for (const row of doc.querySelectorAll(".epserv-TableRow")) {
      if (
        hidden(row) ||
        row.closest(".epserv-worklist-tablerow-container-header")
      )
        continue;
      if (
        value(row, ".PANM").replace(/\^+/g, " ").trim() === criteria.name &&
        value(row, ".PAID") === criteria.patientId &&
        value(row, ".DATE") === criteria.date &&
        value(row, ".MODY") === criteria.modality
      )
        matches.push(row);
    }
    for (const frame of doc.querySelectorAll("iframe"))
      try {
        if (!hidden(frame) && frame.contentDocument)
          visit(frame.contentDocument);
      } catch {}
  }
  visit(document);
  if (matches.length !== 1)
    return {
      ok: false,
      message:
        "Az eRad sora megváltozott vagy nem egyértelmű. Frissítse a listát.",
    };
  const row = matches[0],
    container = row.closest(".epserv-worklist-tablerow-container");
  const detail = container?.querySelector(":scope > .RowDetail");
  const handle = row
    .closest(".RowWrapper")
    ?.querySelector(".epserv-worklist-rowopenhandle.priors");
  if (!handle)
    return {
      ok: false,
      message:
        "Ebben az elrendezésben nincs felismerhető vizsgálatnyitó gomb. Nyissa meg a vizsgálatkártyákat az eRadban.",
    };
  if (
    detail &&
    detail.ownerDocument.defaultView.getComputedStyle(detail).height !==
      "0px" &&
    detail.querySelector(".epserv-sum-box[id]")
  )
    return { ok: true };
  handle.click();
  return { ok: true };
}
