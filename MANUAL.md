# Abakus – návod

Kalkulačka prepočtov: čas (MJD, DOY, GPS), súradnice, geodetické úlohy, kovariancie, jednotky, GNSS, kurzy a rýchly príkazový riadok.
Celá apka je jeden súbor `abakus.html`. Výpočty bežia v prehliadači, žiadna databáza, žiadne knižnice. Port **8770** (Výkaz 8765, Financie 8766, Nákupy 8767, Záhradka 8768, Kabinet 8769).

## 1. Spustenie a ikona na ploche

**Windows** (rovnaký env ako ostatné apky):
1. Rozbaľ do `C:\Users\eliasmichal\Dev\Projects\Personal\Abakus\`.
2. V cmd/PowerShell raz:
   ```
   C:\Users\eliasmichal\Dev\Env\Personal\Scripts\python.exe C:\Users\eliasmichal\Dev\Projects\Personal\Abakus\vytvor_odkaz.py
   ```
3. Na ploche je ikona **Abakus**. Dvojklik = spustí malý server na pozadí a otvorí prehliadač. Ak už beží, len otvorí prehliadač.

Ručne: pravý klik na plochu → Nový → Odkaz →
`"C:\Users\eliasmichal\Dev\Env\Personal\Scripts\pythonw.exe" "C:\Users\eliasmichal\Dev\Projects\Personal\Abakus\abakus.pyw"`, ikona `abakus.ico`.

**Linux:** `python3 vytvor_odkaz.py`. **Bez ikony:** `abakus.bat` / `./abakus.sh`, adresa `http://127.0.0.1:8770/`.
**Bez Pythonu:** dvojklik na `abakus.html`. Funguje všetko, len kurzy sa načítavajú priamo z prehliadača (môže ich blokovať firemná sieť).
**Vypnutie:** tlačidlo Vypnúť vpravo hore. **Chyby:** `server.log` vedľa programu.
**Aktualizácia:** rozbaľ novú verziu cez starú a klikni na ikonu. Stará verzia sa sama vypne.

Server robí len dve veci: podáva `abakus.html` a sťahuje kurzový lístok ČNB.

## 2. Príkazový riadok

Enter = vypočítať, Shift+Enter = nový riadok, ↑ ↓ = história, Esc = skok do riadku, klik na výsledok = skopírovať.

| Čo | Príklad |
|---|---|
| výraz | `sqrt(3^2+4^2)` · `sind(30)` · `2*pi*R_mean` · `a = 6378137` · `ans/2` |
| jednotky | `120 km/h in m/s` · `0.5 deg in rad` · `1 mas in rad` · `20 °C in K` |
| čas | `2026-10-08` · `2026-10-08 12:30:00` · `mjd 61321` · `jd 2461321.5` · `doy 2026 281` · `gps 2439 345600` · `gpss 1475539200` · `unix 1791417600` · `teraz` |
| samotné číslo | `61321` ponúkne výklad (MJD, JD, GPS týždeň, Unix, GPS sekundy) |
| dáta | vlož stĺpec čísel (Ctrl+V) → n, priemer, medián, odchýlka, RMS, MAD, kvartily, šikmosť, špicatosť, Jarque-Bera |
| dva stĺpce | štatistika oboch, rozdiel (priemer, odchýlka, RMS), korelácia, regresná priamka |
| súradnice | `ecef 50 14.5 300` · `geod X Y Z` · `utm 50 14.5` · `jtsk 50 14.5` · `dist φ1 λ1 φ2 λ2` · `dms 50.0875` · `deg 50 5 15` |
| rozdelenia | `qnorm(0.975)` · `qt(0.975, 10)` · `qchi2(0.95, 2)` · `pnorm(x)` · `pt(t, ν)` · `pchi2(x, k)` |

Desatinná čiarka funguje v dátach a v poliach kariet. Vo výrazoch píš bodku (čiarka oddeľuje argumenty funkcií).
Vlastné premenné a história sa pamätajú v prehliadači.

## 3. Karty

Prepíš ľubovoľné pole, ostatné sa prepočítajú. Polia s prerušovaným okrajom sú len výsledky. ⧉ = skopírovať.

| Karta | Obsah |
|---|---|
| Čas | UTC ↔ MJD ↔ JD ↔ rok + DOY ↔ GPS týždeň + SOW ↔ GPS sekundy ↔ Unix; GPST, TAI, priestupné sekundy |
| Súradnice | φ λ h ↔ ECEF ↔ UTM ↔ S-JTSK ↔ Web Mercator; sférické, LAEA (EPSG:3035), LCC (EPSG:3034); odkaz na Mapy.cz a OSM |
| Dva body | Vincenty (dĺžka, azimuty), ortodróma na guli, loxodróma, priestorová spojnica, ENU a azimut/elevácia, priama úloha, náčrt |
| Elipsoid | konštanty 5 elipsoidov, polomery krivosti N, M, R, oblúk poludníka, metre na 1° a 1″, normálne tiažové zrýchlenie |
| Kovariancia | prenos matice 3×3 medzi ECEF, GEOD, ENU, SPHERE; kontrola Monte Carlo; panel 3×3 ako v LOKI |
| Elipsa chýb | poloosi, natočenie, hladina spoľahlivosti, Helmertova krivka, stredná polohová chyba |
| Jednotky a mierky | dĺžka, rýchlosť, uhol, čas, plocha, tlak, teplota…; mierka mapy; decibely |
| GNSS | frekvencie a vlnové dĺžky signálov, wide-lane, narrow-lane, iono-free koeficienty, GLONASS kanály |
| Kurzy | kurzový lístok ČNB, prepočet medzi menami, ručný kurz bez internetu |
| Konštanty | c, GM, ω, elipsoidy, ρ″…; názvy fungujú aj v príkazovom riadku |

## 4. Presnosť a obmedzenia

| Vec | Stav |
|---|---|
| S-JTSK | Helmert „S-JTSK to ETRS89 (1)“ bez mriežky ČÚZK, **presnosť okolo 1 m**. Křovákovo zobrazenie samotné je presné na mm. |
| ETRS89 vs. WGS84 | berú sa ako totožné (v skutočnosti necelý meter rozdiel) |
| Priestupné sekundy | tabuľka do 2017-01-01 (TAI − UTC = 37 s). Novú sekundu doplň do `LEAPS` v `abakus.html`. |
| Vincenty | pre takmer protiľahlé body nekonverguje, karta to oznámi |
| Geoid / kvázigeoid | nie je (plán: EGM2008, CR-2005) |
| Jakobián | numericky centrálnymi diferenciami |

Overené proti PROJ 9.8 (pyproj): ECEF, UTM, Křovák, LAEA, LCC, Web Mercator pod 1 mm; Vincenty pod 1 mm a 1e-7°.

## 5. Úprava

Všetko je v `abakus.html`: výpočty v prvom bloku `<script>` (jadro bez väzby na stránku), rozhranie v druhom.
Po úprave stačí F5. Pri zmene `abakus.pyw` zvýš `VERZIA` v `abakus.pyw` aj v `abakus.html` (rovnaká hodnota).
