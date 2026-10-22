# Scene 04 research note — Vande Bharat 20102

**Research cutoff:** 2026-10-22

**Implementation:** an eight-coach exterior study with Station / Exterior / Cab camera choices and a bounded, forward-only straight-line driving prototype. Separate on-screen throttle/brake levers, matching schematic cab levers and keyboard controls are implemented. This is not a route simulator. The cab camera uses a generic dashboard surround; no 20102 cab drawing was inspected.

## Verified and reported operating facts

- **Direction and number:** Newsonair identifies 20101 as Nagpur → Secunderabad and 20102 as Secunderabad → Nagpur. Its September 2024 launch report lists a 13:00 departure and 20:20 arrival for 20102; treat those as the launch schedule, not a guaranteed current timetable.
- **Eight-coach formation:** The Hindu reported that SCR would change 20101/20102 to eight coaches from 19 February 2025, comprising seven Chair Cars and one Executive Chair Car. This is the strongest route-specific evidence used in the model.
- **Coach order:** A third-party coach-position listing gives the 20102 order from the Secunderabad end as C7, C6, E1, C5, C4, C3, C2, C1. This order is displayed in the model but remains lower-confidence because no official formation diagram was inspected.
- **Traction context:** The generic line scene uses conventional 25 kV AC OHE references from the Railway Board AC Traction Manual. This establishes the visual power-system context only; it is not an electrical or train-control simulation.

## Geometry and visual assumptions

- The eight-coach count and 7 CC + 1 EC class mix are route-specific reports. Coach order is the third-party lead described above.
- Public secondary descriptions for Vande Bharat trainsets commonly give approximately 24 m per coach, 3.24 m body width, 4.14 m height and 192 m for an eight-coach set. These are generic trainset references, not measurements from a 20102 rake drawing. The procedural model uses them only as scale cues.
- The white-and-blue exterior treatment is a conservative Vande Bharat visual reference. The Hindu reported that an eight-car rake on a different Vande Bharat route used white-and-blue livery in May 2025; that is supporting context, not direct proof of the exact 20102 rake finish on the research date. Search-result photos were not bundled as game assets.
- Body profile, nose curvature, window spacing, doors, roof HVAC, bogies, pantograph mechanics and cab are all schematic. Pantographs are placed on C2 and C6 as a readable two-unit assumption; the exact 20102 pantograph-bearing coach IDs were not verified.
- The train is placed on the central road of the scene's schematic track group. No official 20102 platform/road assignment at Secunderabad was verified. It begins within the displayed platform extent and moves only in the Secunderabad→Nagpur (+z) direction until the model reaches the end of the straight track. This is a bounded interaction prototype, not a surveyed departure path.
- **Drive-control assumptions:** the independent 0–100% throttle and brake sliders (5% steps) move two schematic camera-relative cab levers. `W` / `↑` raises throttle by 10%; `S` / `↓` lowers it; `[` / `]` adjusts brake; holding Space applies full brake. The model uses a simple 0.55 m/s² full-throttle acceleration, speed-dependent brake deceleration, rolling resistance and a 60 km/h cap. These values are game controls only—not 20102 performance data, a railway speed limit, brake curve, traction model or safety system. Reset returns the train to its starting marker on the same straight.
- The cab camera uses an overlay-like generic control desk, twin levers and windscreen frame. It is not a measured reproduction of a Vande Bharat driving cab. The exterior/cab selector now exposes the prototype controls, but no timetable, route geometry, signals, gradients, station stops or route speed restrictions are simulated.

## Sources

1. [Newsonair — Nagpur–Secunderabad Vande Bharat service launch, 16 September 2024](https://newsonair.gov.in/telangana-vande-bharat-train-service-between-nagpur-and-secunderabad-to-be-launched-today/) — official broadcaster report identifying train numbers, direction and original launch schedule; it describes the original 20-coach service.
2. [The Hindu — Nagpur–Secunderabad Vande Bharat to have eight coaches, 14 February 2025](https://www.thehindu.com/news/national/telangana/nagpur-secbad-nagpur-vb-express-to-have-eight-coaches-only/article69220085.ece) — route-specific report of the 19 February change to seven Chair Cars and one Executive Chair Car.
3. [IndiaRailInfo — 20102 coach position](https://indiarailinfo.com/train/-train-secunderabad-nagpur-vande-bharat-express-20102/235516/22/21) — third-party coach order; use cautiously and do not treat as an official formation drawing.
4. [The Hindu — eight-car Vande Bharat livery context, 15 May 2025](https://www.thehindu.com/news/cities/Mangalore/augmented-mangaluru-thiruvananthapuram-vande-bharat-express-to-have-coaches-with-orange-livery/article69579487.ece) — reports the then-current eight-car rake on a different route had white-and-blue livery; not a 20102-specific photograph or proof.
5. [Vande Bharat (trainset) — secondary general dimensions](https://en.wikipedia.org/wiki/Vande_Bharat_(trainset)) and [Vande Bharat Express — secondary formation/length summary](https://en.wikipedia.org/wiki/Vande_Bharat_Express) — generic 24 m coach / 3.24 m width / 4.14 m height / approximate 192 m eight-car context; not an official 20102 rake drawing.
6. [Railway Board — AC Traction Manual, Volume I (2022)](https://indianrailways.gov.in/railwayboard/uploads/directorate/ele_engg/2022/ACTM%20VOLUME-I_Ebook_20-11-22.pdf) — generic 25 kV OHE support, catenary, contact-wire and dropper references; see [`scene-02-track-ohe.md`](scene-02-track-ohe.md).

## Still needed before a driving simulator milestone

1. An official or attributable 20102 formation/coach-position document and a dated photograph of the eight-coach rake.
2. A relevant ICF/RDSO exterior or general-arrangement drawing for exact dimensions, cab nose, windows, bogie placement and pantograph-bearing cars.
3. A sourced driver-cab layout and control references before presenting controls as train-specific.
4. A verified Secunderabad platform assignment and route/signal/stop data before route-driving gameplay is described as operationally accurate.
