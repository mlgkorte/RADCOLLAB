export function validUid(value) {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    /^[0-9]+(?:\.[0-9]+)+$/.test(value) &&
    value.split(".").every((p) => p === "0" || !p.startsWith("0"))
  );
}
export function normalizeScan(scan) {
  const byUid = new Map(),
    items = [],
    conflicts = new Set();
  for (const raw of scan.records ?? []) {
    const r = { ...raw, uid: validUid(raw.uid) ? raw.uid : "" };
    if (raw.expandable) r.expansionTarget = { ...raw };
    r.patientKey = JSON.stringify(
      r.patientId ? ["id", r.patientId] : ["name", r.name, r.scope],
    );
    r.key = JSON.stringify([r.patientKey, r.uid || r.scope]);
    if (r.uid && byUid.has(r.uid)) {
      const prev = byUid.get(r.uid);
      if (
        prev.patientKey !== r.patientKey ||
        (prev.name && r.name && prev.name !== r.name)
      ) {
        conflicts.add(r.uid);
        continue;
      }
      const selected = prev.selected || r.selected;
      const expansionTarget = prev.expansionTarget || r.expansionTarget;
      if (r.source === "card") Object.assign(prev, r);
      prev.selected = selected;
      prev.expansionTarget = expansionTarget;
    } else {
      items.push(r);
      if (r.uid) byUid.set(r.uid, r);
    }
  }
  return {
    items: items.filter((r) => !conflicts.has(r.uid)),
    warnings: [
      ...(scan.warnings ?? []),
      ...(conflicts.size
        ? [
            "Ellentmondó betegazonosítót találtam; az érintett vizsgálatokat kihagytam.",
          ]
        : []),
    ],
  };
}
export const fingerprint = (r) =>
  JSON.stringify([
    r.key,
    r.name,
    r.patientId,
    r.date,
    r.modality,
    r.description,
    r.uid,
  ]);
export function revalidate(chosen, fresh, selectedMode) {
  const matches = fresh.items.filter(
    (r) => r.key === chosen.key && fingerprint(r) === fingerprint(chosen),
  );
  const selected = fresh.items.filter((r) => r.selected);
  if (
    matches.length !== 1 ||
    !validUid(matches[0].uid) ||
    (selectedMode && (selected.length !== 1 || selected[0].key !== chosen.key))
  )
    throw new Error(
      "Az eRad adatai vagy kijelölése megváltozott. Frissítse a listát, és válasszon újra.",
    );
  return matches[0];
}
