// Injected on demand in the isolated extension world. No page scripts are run.
(() => {
  const clean = (v) =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
  const valid = (v) =>
    v.length <= 64 &&
    /^[0-9]+(?:\.[0-9]+)+$/.test(v) &&
    v.split(".").every((p) => p === "0" || !p.startsWith("0"));
  const records = [],
    warnings = new Set(),
    seenDocs = new Set();
  function visit(doc, frame = "top") {
    if (seenDocs.has(doc)) return;
    seenDocs.add(doc);
    const hiddenCache = new WeakMap();
    function hidden(node) {
      if (!node) return false;
      if (hiddenCache.has(node)) return hiddenCache.get(node);
      const result =
        node.hidden ||
        node.classList.contains("sf-hidden") ||
        doc.defaultView?.getComputedStyle(node).display === "none" ||
        doc.defaultView?.getComputedStyle(node).visibility === "hidden" ||
        hidden(node.parentElement);
      hiddenCache.set(node, result);
      return result;
    }
    const value = (root, selector) => {
      const n = root?.querySelector(selector);
      return clean(n?.getAttribute("origvalue") || n?.textContent);
    };
    const rows = [...doc.querySelectorAll(".epserv-TableRow")].filter(
      (row) =>
        !hidden(row) &&
        !row.closest(".epserv-worklist-tablerow-container-header"),
    );
    const checkedRows = rows.filter((row) => {
      const wrapper = row.closest(".RowWrapper") ?? row;
      return (
        !!wrapper.querySelector(
          ":scope > .TOGGLE_CHECKBOX.down, :scope > input[type=checkbox]:checked, :scope > [role=checkbox][aria-checked=true]",
        ) ||
        row.getAttribute("aria-selected") === "true" ||
        row.classList.contains("epserv-TableRowSelected")
      );
    });
    for (const [index, row] of rows.entries()) {
      const name = value(row, ".PANM").replace(/\^+/g, " ").trim(),
        patientId = value(row, ".PAID");
      if (!name && !patientId) continue;
      const uidValue = value(row, ".SYUI");
      records.push({
        name,
        patientId,
        date: value(row, ".DATE"),
        modality: value(row, ".MODY"),
        description: value(row, ".STDE"),
        uid: valid(uidValue) ? uidValue : "",
        selected: checkedRows.includes(row),
        expandable: !!row
          .closest(".RowWrapper")
          ?.querySelector(".epserv-worklist-rowopenhandle.priors"),
        source: "table",
        scope: frame + ":row:" + index,
      });
    }
    for (const [index, card] of [
      ...doc.querySelectorAll(".epserv-sum-box[id]"),
    ].entries()) {
      if (hidden(card) || !valid(card.id)) continue;
      // PatientFolder belongs to this worklist row. Never borrow a patient
      // from a global header or a neighbouring row.
      const container = card.closest(".epserv-worklist-tablerow-container");
      const owner = container?.querySelector(".RowWrapper .epserv-TableRow");
      const name = value(owner, ".PANM").replace(/\^+/g, " ").trim(),
        patientId = value(owner, ".PAID");
      if (!name && !patientId) {
        warnings.add("Egy vizsgálatkártyához nem rendelhető biztosan beteg.");
        continue;
      }
      records.push({
        name,
        patientId,
        date: value(card, ".epserv-sum-box-date"),
        modality: value(card, ".epserv-sum-box-moda"),
        description: value(card, ".epserv-sum-box-desc"),
        uid: card.id,
        selected:
          !checkedRows.length &&
          card.classList.contains("epserv-sum-boxSelected") &&
          !(
            card.closest(".RowDetail") &&
            doc.defaultView.getComputedStyle(card.closest(".RowDetail"))
              .height === "0px"
          ),
        cached: !!(
          card.closest(".RowDetail") &&
          doc.defaultView.getComputedStyle(card.closest(".RowDetail"))
            .height === "0px"
        ),
        source: "card",
        scope: frame + ":card:" + index,
      });
    }
    for (const [index, iframe] of [
      ...doc.querySelectorAll("iframe"),
    ].entries()) {
      if (hidden(iframe)) continue;
      try {
        if (iframe.contentDocument)
          visit(iframe.contentDocument, frame + ":" + index);
        else warnings.add("Egy beágyazott oldalhoz nincs hozzáférés.");
      } catch {
        warnings.add("Egy beágyazott oldalhoz nincs hozzáférés.");
      }
    }
  }
  visit(document);
  return { records, warnings: [...warnings] };
})();
