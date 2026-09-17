# RADCOLLAB · eRad UID 1.0.3

Az eRad `https://nyhcwl.eradpacs.hu` oldalán használható, helyben működő bővítmény. Nem küld adatokat szerverre, nem tárol betegadatot, és kizárólag a kiválasztott beteg saját eRad-kártyanyitójával indítja a vizsgálatok betöltését. Nincs háttérben futó oldalfigyelés. A vágólaphoz kizárólag az UID/link másolási gomb megnyomásakor nyúl.

## Telepítés Edge / Chrome

1. A ZIP-et csomagolja ki egy állandó mappába; a mappát telepítés után ne törölje.
2. Nyissa meg az Edge `edge://extensions` vagy Chrome `chrome://extensions` oldalát.
3. Kapcsolja be a Fejlesztői módot.
4. Válassza a Kicsomagolt elemek betöltése / Load unpacked lehetőséget, és jelölje ki azt a mappát, amelyben a `manifest.json` van (a chromium csomag).
5. Rögzítse a RADCOLLAB · eRad UID ikonját az eszköztárra.

## Használat

1. Nyissa meg az eRad munkalistáját vagy a beteg vizsgálatkártyáit.
2. Kattintson a bővítmény ikonjára.
3. Egy kijelölt vizsgálat esetén a bővítmény megmutatja a beteg nevét, azonosítóját és a vizsgálat adatait: „A kijelölt vizsgálat UID-ját szeretné kinyerni?” Válassza az „Igen, ezt a vizsgálatot” gombot, vagy kérjen másik beteget/vizsgálatot.
4. Kijelölés nélkül válasszon beteget: vizsgálatai automatikusan betöltődnek az eRadból. Ezután válasszon a kiolvasható vizsgálatok listájából. Ellenőrizze az összefoglalót, és hagyja jóvá a kinyerést.
5. Az UID másolása gombbal másolja az azonosítót, majd illessze a RADCOLLAB PACS StudyInstanceUID mezőjébe. Az eRad link másolása teljes hivatkozást ad.

A lista az éppen betöltött eRad-adatokra korlátozódik. Másik beteg vagy régebbi vizsgálat betöltéséhez az eRadban navigáljon, majd nyomja meg a Lista frissítése gombot. Rejtett UID-oszlop esetén a beteg kiválasztása automatikusan megnyitja a saját vizsgálatkártyáit. Az összes rejtett oszlopos elrendezés általános támogatása nem igazolt.

A bővítmény nem választ az első találat alapján, és több kijelölés esetén is kézi választást kér. Megerősítéskor és másolás előtt újra ellenőrzi a választott vizsgálatot. Megváltozott adatoknál frissítés szükséges. Ismeretlen vagy ellentmondó betegkapcsolat esetén nem ad ki UID-t.

## Firefox

A firefox csomag Manifest V3 változatot tartalmaz. Ideiglenes helyi teszt: `about:debugging#/runtime/this-firefox` → Ideiglenes kiegészítő betöltése → a firefox csomag `manifest.json` fájlja. Az ideiglenes telepítés újraindításig él. Normál, tartós terjesztéshez Mozilla-aláírás szükséges; a mellékelt ZIP nincs aláírva. Firefoxban külön élő ellenőrzés szükséges.

## Fejlesztés és ellenőrzés

`node extension/build.mjs` készíti el a `releases/erad-uid/v1.0.3/chromium` és `releases/erad-uid/v1.0.3/firefox` mappákat. A források kizárólag a csomagban vannak; nincs CDN vagy távoli kód.

Felismerés: táblázatban `.epserv-TableRow` saját `.PANM`, `.PAID`, `.DATE`, `.MODY`, `.SYUI` mezői; kártyán `.epserv-sum-box[id]`, a beteg az adott `.epserv-worklist-tablerow-container` saját sorából. Azonos eredetű, hozzáférhető iframe-eket is feldolgoz. Más eredetű iframe-ekhez nem kér széles hozzáférést.

Az alkalmazásba nincs automatikus beküldés vagy publikálás: a jóváhagyott UID-t kell beilleszteni. Az eRad élő, minden elrendezésére kiterjedő tesztelés külön elfogadási lépés.

Dokumentáció: [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), [Firefox manifest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings).

## 1.0.3 – automatikus vizsgálatbetöltés

A beteg kiválasztása automatikusan megnyitja saját eRad-vizsgálatkártyáit. A betöltés idején nem választható vizsgálat; a betegváltás továbbra is elérhető. A vizsgálatlistában csak érvényes UID-val rendelkező, nyitott adatok jelennek meg, UID nélküli munkalistasorok és összecsukott régi kártyák nem. Betöltés után továbbra is külön ki kell választani és jóvá kell hagyni a vizsgálatot.

Gyors betegváltáskor a korábbi kérés eredménye nem írhatja felül az új beteg listáját. Sikertelen betöltésnél hibaüzenet jelenik meg, korábbi vizsgálat nem marad választható. Újrapróbáláshoz válasszon másik beteget, majd ismét a kívánt beteget, vagy frissítse a listát. Az eRad csak az adott kártyanézetben betöltött vizsgálatokat teszi elérhetővé; további lapozást a bővítmény nem végez.

Frissítés: a ZIP tartalmával írja felül a korábban betöltött bővítménymappa fájljait, majd az edge://extensions vagy chrome://extensions oldalon nyomja meg a bővítmény Újratöltés gombját. Ellenőrizze, hogy 1.0.3 verzió látható.

A megerősítő képernyő „Vissza a választáshoz” gombja megőrzi az aktuális beteget, a betöltött vizsgálatlistát és a kijelölést. Másik vizsgálat új betöltés nélkül választható. Ez az állapot csak a nyitott bővítményablakban marad meg; a jóváhagyás továbbra is újra ellenőrzi az eRad adatait.
