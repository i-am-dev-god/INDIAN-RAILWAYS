# Scene 03 research — Secunderabad Junction, current and planned views

**Research cutoff:** 2026-10-22

**User selection:** Secunderabad station/yard; provide both current and future views.

**Build status:** A best-evidence, visibly schematic station study is implemented. It is **not** a verified as-built yard plan. The current scene carries ten passenger platforms, an eleven-track reported count, 25 kV OHE, schematic north/south terminal massing and separate, caveated redevelopment views. Exact track-to-platform assignments, track spacing, lengths, approach throats, building geometry and future yard changes remain unresolved.

## Evidence and confidence

### Higher-confidence facts

- **Ten passenger platforms.** South Central Railway's official station profile states that Secunderabad has ten platforms. This is a platform count, not a yard diagram.
- **Eleven tracks (reported).** A July 2024 Financial Express report citing the Ministry of Railways describes ten platforms and eleven tracks. No authoritative, readable Secunderabad yard plan was found to verify how those tracks serve the platforms.
- **Broad-gauge standard.** Indian Railways' BG Schedule of Dimensions specifies 1,676 mm gauge. This supports the scene's gauge, not its station topology.
- **High-platform dimensions.** The Schedule of Dimensions gives 1.670–1.680 m from track centre to passenger-platform coping and 0.760–0.840 m high-platform height above rail. The scene uses 1.670 m and 0.800 m as values within those standard ranges, not measurements taken at Secunderabad.
- **Redevelopment scope.** SCR's redevelopment material and dated reporting support passenger-facing works including station buildings, a two-level air/sky concourse, foot-overbridge/circulation changes and a through-roof over platforms/tracks. A February 2026 Metro India report gives the planned air-concourse footprint as 108 m × 120 m; that footprint is a media-reported plan detail, and its exact orientation is not established here. These sources do not establish a yard-track revision or the exact as-built construction bay on 22 October 2026.
- **Terminal-building scope (secondary reporting).** The Hans India reported a G+3 north-side building with 22,516 sq m and a G+3 south-side extension with 14,792 sq m, plus the double-storey concourse. The report does not provide a verifiable facade/footprint drawing or clearly resolve whether each area is footprint or total built-up area. The scene uses the figures only as broad scale cues.
- **The authoritative layout reference.** SCR's 2023 Operating Manual says a station Working Rule diagram records the complete yard, points, signals, gradients, interlocking and line capacities. The Secunderabad-specific diagram remains the missing primary source for an exact reconstruction.

### Lower-confidence leads and unresolved claims

- **Service road between Platforms 7 and 8.** Secondary layout descriptions (Wikipedia/Primidi) place an additional MMTS/service track between Platforms 7 and 8. This is a useful, lower-confidence lead, not a verified road identity or surveyed location. It is represented as a subtly distinguished schematic track; the scene labels the claim as secondary-source information.
- **Platform suffixes.** Secondary descriptions mention 6A/6B and 7A/7B. These may be boarding/stopping subdivisions rather than separate platform structures. The scene uses small study labels only; it does not model new platform surfaces or claim exact section boundaries.
- **“16 platforms” redevelopment claim.** Project architect STHAPATI says the project spans 16 platforms, while SCR's station profile says there are 10 existing platforms. The architect page does not define whether “spanning” means operational platforms, platform faces, or project coverage. It is not adopted as a future operating count.
- **Working Time Table lengths.** Indexed text from SCR WTT No. 77 appears to list Roads 1–8 at 641, 725, 493, 517, 551, 657, 621 and 658 m, and separate snippets Roads 9–11 at 654, 593 and 602 m. The direct PDF fetch failed and the column/direction semantics and road-to-platform mapping remain unresolved. These numbers are not used to assign individual platform lengths in the scene.
- **DPR plan previews.** A third-party Scribd preview indexes a 2022 Secunderabad redevelopment DPR's “Site Survey Plan” (printed p. 62), “Yard Plan” (p. 63), existing tracks and proposed master plan. The source/provenance and plan geometry could not be verified from the available preview; it is a lead, not an inspected plan.
- **Public map/photo attempts.** Google Maps loaded controls/tiles rather than traceable satellite imagery; OSM API/tile requests failed; available photos were partial, oblique or construction views. None supports drawing the full yard. Search failure does not prove a Working Rule diagram is unavailable.

## What the 3D scene represents

The application now has a **Current / Planned** selector. Both are station studies, not operating diagrams:

| View | Rendered content | Confidence statement |
| --- | --- | --- |
| **Current** | Ten platform strips; eleven parallel BG roads; detailed-but-schematic portal OHE; retained end-canopy sections; an open concourse frame; north/south terminal blocks with lower floors clad and upper floors shown as an illustrative structure. | Ten platforms are official; eleven tracks are reported. Straight parallel topology, platform-road pairing, common lengths, clearances, terminal placement, facade and work-zone phasing are illustrative. Construction reporting is dated and is not a verified October 2026 as-built survey. |
| **Planned** | The same track group carried forward under a conceptual two-level concourse/roof, lower terminal-to-concourse links and G+3 terminal-building massing. | “No verified yard change” assumption, not an approved future yard plan or claim that redevelopment is complete. Building footprint/facade and concourse geometry are conceptual. |

A Vande Bharat 20102 exterior study is present in both station views on a schematic central road. Its exact Secunderabad platform assignment is not verified. A separate forward-only drive prototype moves it along the bounded schematic track; there is no route, signalling, timetable or station-stop simulation. Train-specific evidence and assumptions are recorded in [`scene-04-vande-bharat-20102.md`](scene-04-vande-bharat-20102.md).

**Deliberately absent:** switches, crossovers, pointwork, platform-road names, signal locations, station throat geometry, approach directions, exact cardinal orientation, a verified architectural plan, route-accurate train movement and any Ghatkesar–Kazipet or Sanathnagar–Wadi corridor tie-in. The drive prototype is limited to the existing straight schematic rails. No fourth line or 16-platform future is shown. Corridor projects remain separate from station redevelopment.

### Geometry assumptions, recorded in code

- The eleven-track/ten-platform count is converted to a straight 11-road/10-island sequence solely to create a readable study. This is not a claim that all Secunderabad platforms are islands or that this is their actual order.
- **11.4 m modelled track-centre spacing:** the Schedule of Dimensions' 1.670 m centre-to-coping offset plus an **assumed 8.0 m island-platform width** plus the same offset gives 11.34 m, rounded to 11.4 m. Neither the 8 m width nor the resulting track spacing is measured Secunderabad data. The scene therefore has an approximately 8.06 m clear slab between the assumed coping offsets.
- **Platform height:** 0.800 m above rail is a selected visual value within the Schedule of Dimensions' 0.760–0.840 m high-platform range; it is not a surveyed platform height.
- **Platform/track extent:** the shared 640 m platform strip and 680 m straight road are display extents for the study, not WTT-derived platform lengths. WTT road-length snippets are not assigned to numbered platforms.
- **Track details:** 1,676 mm gauge is the standard BG value. The 0.6024 m sleeper interval and portal OHE arrangement are illustrative visual defaults, not verified Secunderabad sleeper or OHE drawings. The current support rhythm is 60 m; contact and messenger wires use generic 5.65 m / 7.05 m above-rail reference heights with droppers at up to 9 m. Outer portal legs use sparse lacing, base plates, feet, mast plates, ladder rungs and earth leads; the cross-girder uses six large alternating truss panels. These are generic visual cues based on Railway Board OHE material, not a site SED. Portal legs pause through the concourse span; central suspension lines hang from the schematic concourse frame as a clearance-preserving placeholder. No approved OHE/roof integration drawing was inspected, and contact-wire stagger/sectioning are omitted.
- **Building/wire clearance:** concourse columns sit on the modelled platform centre-lines rather than through the running tracks. Platform light heads are kept below the schematic canopy roofs. These are scene-clearance decisions, not claims about actual column or lamp locations.
- **Current construction:** the two end canopy bands and the central open concourse frame simplify construction activity into a readable image. They do not trace a specific work package, closure, roof-removal extent or 2026 site photograph.
- **Planned construction:** the two-level concourse uses the media-reported 108 m × 120 m footprint, with the 120 m span placed across the tracks as a visual assumption; floor elevations and exact orientation are not verified. The through-roof is shown over the full schematic platform extent because a dated redevelopment report describes roof cover over all platforms/tracks, but its modeled length, width and height are not measured values. This is massing only, not an approved architectural model.
- **Terminal buildings:** The north/south G+3 labels and reported areas come from The Hans India (2022); the source does not supply an inspectable architectural drawing or resolve area semantics. The visual study uses approximate 50 × 112 m and 40 × 93 m footprints over four levels as scale cues, then adds repeated window reveals/mullions, floor bands, shallow fins, ground-level glazing, entrance canopies, roof plant and conceptual concourse links. North/south placement on the two model edges, exact facade, current two-clad-floor/open-frame staging, roof plant and all link dimensions are assumptions. No detailed local heritage facade or approved station plan is claimed.
- **Surroundings:** the low-rise/mid-rise urban-edge blocks are procedural background massing, not traced or individually identified Hyderabad/Secunderabad buildings.

## Current versus planned — project boundary

The current reference date is 22 October 2026, but the available evidence does not establish a contemporaneous, surveyed yard layout or exact construction stage on that date. The Hindu's April 2025 report documents platform closures/overhead-cover dismantling **at that time**, not a 2026 as-built view. October 2026 media progress estimates also disagree on completion targets; none is a commissioning notice.

The planned view therefore keeps the best-evidence track group unchanged as an explicit **“no verified yard change”** assumption. The air-concourse/roof is explicitly conceptual. Do not read it as the approved drawing, the completed station, or a confirmed 2027 commissioning state.

Corridor proposals are separate: Ghatkesar–Yadadri/Yadadri–Kazipet and the Ghatkesar–Kazipet fourth-line approval do not prove a Secunderabad station-yard change. Likewise, project-level Secunderabad (Sanathnagar)–Wadi third/fourth-line material does not establish its precise yard tie-in, platform-road changes or construction staging inside the station.

## Research still needed before claiming an exact yard

1. Obtain the Secunderabad Station Working Rule diagram or a readable, issue-dated official yard general-arrangement drawing.
2. Verify the 11-track count and identify each road, platform face, island/side relationship, platform length and any service road.
3. Verify approach directions, yard limits, switch/lead geometry, pointwork, signals, gradients and OHE portals before adding them.
4. Obtain an approved station redevelopment plan and distinguish operating tracks from architectural coverage before changing the Planned state.
5. Re-check any 2026 construction depiction against a dated, attributable source before presenting it as current/as-built.

## Sources

1. [South Central Railway — Secunderabad Railway Station](https://scr.indianrailways.gov.in/view_section.jsp?fontColor=black&backgroundColor=LIGHTSTEELBLUE&lang=0&id=0%2C1%2C291%2C357%2C2096%2C2244) — official 10-platform station profile.
2. [Financial Express — Ministry-reported Secunderabad upgrade, 22 July 2024](https://www.financialexpress.com/business/railways-upgradation-of-secunderabad-railway-station-is-going-at-a-swift-pace-ministry-of-railways-shares-details-of-work-done-3561398/) — reports 10 platforms and 11 tracks; not a yard diagram.
3. [South Central Railway — Signal & Telecom](https://scr.indianrailways.gov.in/view_section.jsp?lang=0&id=0,1,383,553) — identifies RRI at Secunderabad Junction among major yards.
4. [South Central Railway — Operating Manual 2023](https://scr.indianrailways.gov.in/cris//uploads/files/1707808846355-SCR%20Operating%20Manual%202023.pdf) — describes the contents and operational role of station Working Rule diagrams.
5. [Indian Railways — BG Schedule of Dimensions, revised 2004](https://irimee.indianrailways.gov.in/instt/uploads/files/1454673172611-sod.pdf) — general 1,676 mm BG, track-centre, platform-coping and high-platform standards; not Secunderabad measurements.
6. [SCR Working Time Table No. 77 (official SCR-hosted PDF/index)](https://digitalscr.in/bzadiv/circulars/train_circulars/uploads/SC_Divn_WTT.pdf) — indexed “Length of Platforms between SC-WADI” road lengths; direct PDF fetch returned 404 and platform/road mapping remains unresolved.
7. [Wikipedia — Secunderabad Junction layout](https://en.wikipedia.org/wiki/Secunderabad_Junction_railway_station) and [Primidi — platform layout](https://www.primidi.com/secunderabad_railway_station/the_station/layout/platforms) — secondary descriptions of a service track and suffixes; lower-confidence leads only.
8. [The Hindu — passenger entrances, 10 June 2019](https://www.thehindu.com/news/cities/Hyderabad/secunderabad-station-turns-passenger-friendly/article27766946.ece) — says the main entrance leads to Platform 1 and Bhoiguda-side entrance to Platform 10; does not establish compass orientation or yard layout.
9. [South Central Railway — Secunderabad station redevelopment release](https://scr.indianrailways.gov.in/view_detail.jsp?lang=0&dcd=21164&id=0,5,268) — passenger-facing redevelopment context, not a yard-track plan.
10. [The Hindu — construction activity at Secunderabad, 18 April 2025](https://www.thehindu.com/news/cities/Hyderabad/secunderabad-railway-station-still-bustling-despite-construction-activity/article69464782.ece) — dated platform closures/cover removal and a two-level sky-concourse/roof-plaza description; not a 2026 as-built reference.
11. [STHAPATI — Secunderabad Station project page](https://sthapatiindia.org/portfolio/secunderabad-station/) — project architect's page; says “spanning 16 platforms,” undefined and not adopted as an operational count.
12. [Secunderabad Railway Station redevelopment DPR (third-party Scribd mirror)](https://www.scribd.com/document/745843909/DPRofSecunderabadstation-1) — indexed site-survey, yard-plan and proposed-master-plan pages; drawing provenance and geometry not verified.
13. [Press Information Bureau — NPG review, 19 December 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2206595&reg=1&lang=1) — proposed additional-line sections involving Ghatkesar, Yadadri and Kazipet; outside proof of a station-yard change.
14. [The Hindu BusinessLine — Ghatkesar–Kazipet fourth-line CCEA approval, September 2026](https://www.thehindubusinessline.com/news/national/cabinet-clears-8-railway-multitracking-projects-worth-rs-20804-crore/article71448210.ece) — corridor project approval/target reporting; not a Secunderabad station plan.
15. [Press Information Bureau — Secunderabad (Sanathnagar)–Wadi third/fourth-line approval, 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2161227) — project-level approval; station-yard tie-in remains unverified.
16. [Metro India — redevelopment status report, 9 October 2026](https://metroindia.net/news/articlenews/chilkalguda-rail-land-stuck-in-slow-lane-45926) and [Disha Daily — status report, 28 September 2026](https://www.dishadaily.com/telangana/hyderabad/secunderabad-station-to-resemble-an-airport-69-of-the-work-completed-588943) — conflicting progress/target estimates; neither is a commissioning notice.
17. [OpenStreetMap — Secunderabad station](https://www.openstreetmap.org/way/500394347) and [Google Maps — station area](https://maps.google.com/maps?ll=17.43315,78.50148&z=17&t=k) — consulted as public map leads; retrieval did not produce inspectable, full-yard geometry for this build.
18. [Metro India — Secunderabad station upgradation, 28 February 2026](https://www.metroindia.net/news/articlenews/secunderabad-station-upgradation-complete-36001) — reports a 108 m × 120 m two-level air-concourse plan and a through-roof over the platforms/tracks; useful redevelopment scope, but secondary reporting rather than a readable approved architectural drawing.
19. [The Hans India — Secunderabad station redevelopment scope, 27 October 2022](https://www.thehansindia.com/news/cities/hyderabad/secbad-railway-station-to-don-a-new-look-soon-766866) — reports G+3 north/south terminal buildings and floor-area figures; those figures are not a verified footprint or facade drawing.
