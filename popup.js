import { normalizeScan, revalidate } from "./model.js";
import { expandStudy } from "./expand.js";
const browserApi = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);
let tabId,
  origin,
  data = { items: [], warnings: [] },
  chosen,
  selectedMode = false,
  confirmed,
  busy = false,
  patientLoading = false,
  loadGeneration = 0;
function show(id) {
  for (const name of ["selected", "chooser", "confirm", "result"])
    $(name).hidden = name !== id;
}
function summary(id, r) {
  const dl = $(id);
  dl.replaceChildren();
  for (const [label, value] of [
    ["Beteg", r.name || "Név nem érhető el"],
    ["Betegazonosító", r.patientId || "Nincs megjelenítve"],
    ["Vizsgálat dátuma", r.date || "Nincs megjelenítve"],
    ["Modalitás", r.modality || "Nincs megjelenítve"],
    ["Vizsgálat", r.description || "Nincs külön megnevezés"],
  ]) {
    const dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    dl.append(dt, dd);
  }
}
async function task(fn) {
  if (busy) return;
  busy = true;
  $("error").hidden = true;
  const controls = [...document.querySelectorAll("button,select")],
    states = controls.map((n) => n.disabled);
  controls.forEach((n) => (n.disabled = true));
  try {
    await fn();
  } catch (e) {
    $("status").textContent = "A művelet nem fejeződött be.";
    $("error").textContent = e.message || "A művelet nem sikerült.";
    $("error").hidden = false;
  } finally {
    controls.forEach((n, i) => (n.disabled = states[i]));
    busy = false;
    updateChoices();
  }
}
async function scan() {
  const tab = await browserApi.tabs.get(tabId);
  if (new URL(tab.url).origin !== origin)
    throw new Error(
      "Az eRad-lap elnavigált. Nyissa meg újra a bővítményt az eRadban.",
    );
  const results = await browserApi.scripting.executeScript({
    target: { tabId },
    files: ["scan.js"],
  });
  if (!results[0]?.result)
    throw new Error(
      "Az eRad adatai nem olvashatók. Frissítse az eRad-oldalt, majd nyissa meg újra a bővítményt.",
    );
  return normalizeScan(results[0].result);
}
function options(select, items, placeholder) {
  select.replaceChildren(new Option(placeholder, ""));
  for (const [value, label] of items) select.add(new Option(label, value));
}
function chooser() {
  loadGeneration++;
  patientLoading = false;
  confirmed = null;
  $("uid").value = "";
  selectedMode = false;
  chosen = null;
  show("chooser");
  const patients = new Map();
  for (const r of data.items)
    patients.set(
      r.patientKey,
      `${r.name || "Név nem érhető el"}${r.patientId ? " · " + r.patientId : ""}`,
    );
  options($("patient"), [...patients], "Válasszon beteget");
  options($("study"), [], "Előbb válasszon beteget");
  updateChoices();
}
function updateChoices() {
  $("study").disabled = busy || patientLoading || !$("patient").value;
  const r = data.items.find(
    (r) => r.key === $("study").value && r.patientKey === $("patient").value,
  );
  $("review").disabled = busy || patientLoading || !r?.uid;
}
async function loadPatient() {
  const generation = ++loadGeneration;
  const patientKey = $("patient").value;
  const active = () =>
    generation === loadGeneration && $("patient").value === patientKey;
  confirmed = null;
  chosen = null;
  $("uid").value = "";
  $("error").hidden = true;
  patientLoading = !!patientKey;
  options(
    $("study"),
    [],
    patientKey ? "Vizsgálatok betöltése…" : "Előbb válasszon beteget",
  );
  updateChoices();
  if (!patientKey) return;
  $("status").textContent = "A beteg vizsgálatainak betöltése az eRadból…";
  try {
    let fresh = await scan();
    if (!active()) return;
    const current = fresh.items.find(
      (r) => r.patientKey === patientKey && r.expansionTarget,
    );
    if (current) {
      const [result] = await browserApi.scripting.executeScript({
        target: { tabId },
        func: expandStudy,
        args: [current.expansionTarget],
      });
      if (!active()) return;
      if (!result?.result?.ok)
        throw new Error(
          result?.result?.message || "A vizsgálatok megnyitása nem sikerült.",
        );
      let previous = "",
        stable = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (!active()) return;
        fresh = await scan();
        if (!active()) return;
        const cards = fresh.items.filter(
          (r) =>
            r.patientKey === patientKey &&
            r.uid &&
            r.source === "card" &&
            !r.cached,
        );
        const signature = JSON.stringify(
          cards.map((r) => [r.key, r.date, r.modality, r.description]).sort(),
        );
        if (cards.length && signature === previous) {
          stable = true;
          break;
        }
        previous = signature;
      }
      if (!stable)
        throw new Error(
          "Az eRad nem töltötte be időben a vizsgálatokat. Válassza ki újra a beteget az ismételt betöltéshez.",
        );
    }
    if (!active()) return;
    data = fresh;
    const studies = data.items.filter(
      (r) => r.patientKey === patientKey && r.uid && !r.cached,
    );
    if (!studies.length)
      throw new Error(
        "Nem érhető el kiolvasható vizsgálat. Nyissa meg a beteg vizsgálatkártyáit az eRadban, majd válassza ki újra a beteget.",
      );
    options(
      $("study"),
      studies.map((r) => [
        r.key,
        `${r.date || "Dátum nélkül"} · ${r.modality || "Modalitás nélkül"}${r.description ? " · " + r.description : ""}`,
      ]),
      "Válasszon vizsgálatot",
    );
    $("status").textContent =
      `A vizsgálatok betöltve (${studies.length}). Válassza ki a kívánt vizsgálatot, majd hagyja jóvá. ${fresh.warnings.join(" ")}`;
  } catch (e) {
    if (!active()) return;
    options($("study"), [], "Nem sikerült betölteni a vizsgálatokat");
    $("status").textContent = "A beteg vizsgálatainak betöltése nem sikerült.";
    $("error").textContent = e.message || "A betöltés nem sikerült.";
    $("error").hidden = false;
  } finally {
    if (active()) {
      patientLoading = false;
      updateChoices();
    }
  }
}
async function refresh() {
  loadGeneration++;
  patientLoading = false;
  confirmed = null;
  chosen = null;
  $("uid").value = "";
  show(null);
  $("status").textContent = "Az eRad vizsgálatainak keresése…";
  data = await scan();
  const selected = data.items.filter((r) => r.selected);
  $("status").textContent =
    `${data.items.filter((r) => r.uid).length} kiolvasható vizsgálat; ${data.items.filter((r) => !r.uid).length} sor UID-ja még nincs betöltve. ${data.warnings.join(" ")}`;
  if (!data.items.length) {
    $("status").textContent =
      "Nem találtam azonosítható vizsgálatot. Nyissa meg az eRad munkalistáját vagy a beteg vizsgálatkártyáit, majd frissítsen.";
    return;
  }
  if (selected.length === 1 && selected[0].uid) {
    chosen = selected[0];
    selectedMode = true;
    summary("selected-summary", chosen);
    show("selected");
  } else {
    chooser();
    if (selected.length === 1) {
      $("patient").value = selected[0].patientKey;
      await loadPatient();
    }
    if (selected.length > 1)
      $("status").textContent +=
        " Több kijelölés található; válasszon egy vizsgálatot.";
  }
}
async function extract() {
  const fresh = await scan();
  try {
    confirmed = revalidate(chosen, fresh, selectedMode);
  } catch (e) {
    confirmed = null;
    $("uid").value = "";
    data = fresh;
    chooser();
    throw e;
  }
  summary("result-summary", confirmed);
  $("uid").value = confirmed.uid;
  show("result");
  $("status").textContent = "A jóváhagyott vizsgálat azonosítója kiolvasva.";
}
$("patient").addEventListener("change", loadPatient);
$("study").addEventListener("change", updateChoices);
$("review").addEventListener("click", () => {
  chosen = data.items.find(
    (r) => r.key === $("study").value && r.patientKey === $("patient").value,
  );
  if (!chosen?.uid) return;
  selectedMode = false;
  summary("confirm-summary", chosen);
  show("confirm");
});
$("extract").addEventListener("click", () => task(extract));
$("use-selected").addEventListener("click", () => task(extract));
$("choose-other").addEventListener("click", chooser);
$("back").addEventListener("click", () => {
  confirmed = null;
  chosen = null;
  selectedMode = false;
  $("uid").value = "";
  show("chooser");
  updateChoices();
  $("study").focus();
});
$("refresh").addEventListener("click", () => task(refresh));
async function copy(link) {
  if (!confirmed) return;
  const current = revalidate(confirmed, await scan(), selectedMode);
  await navigator.clipboard.writeText(
    link
      ? `https://nyhcwl.eradpacs.hu/epws/openViewer.epw?Study=${current.uid}`
      : current.uid,
  );
  $("status").textContent = link
    ? "Az eRad-link a vágólapra másolva."
    : "Az UID a vágólapra másolva.";
}
$("copy").addEventListener("click", () => task(() => copy(false)));
$("copy-link").addEventListener("click", () => task(() => copy(true)));
task(async () => {
  const [tab] = await browserApi.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.url || new URL(tab.url).origin !== "https://nyhcwl.eradpacs.hu")
    throw new Error(
      "A bővítményt a nyíregyházi eRad megnyitott lapján indítsa el.",
    );
  tabId = tab.id;
  origin = new URL(tab.url).origin;
  await refresh();
});
