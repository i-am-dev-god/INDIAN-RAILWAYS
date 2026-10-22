# Scene 02 research note — Main-line track and 25 kV OHE

**Research date:** 2026-10-22

**Build scope:** add a procedural, illustrative double-track main-line segment and conventional overhead equipment (OHE) to the existing Deccan environment. No train, station yard, pointwork, bridge, or signal is added in this pass.

## Route and track evidence

1. **Secunderabad–Kazipet is a UP/DN route.** South Central Railway listings identify the Secunderabad–Kazipet section as UP and DN lines. A South Central Railway track-renewal entry for parts of SC–KZJ describes existing 52 kg rails being renewed with class-I 60 kg rails on PSC6 sleepers at 1,660 sleepers/km, on UP and DN lines. The same entry shows different existing track structures in different lengths; this supports a modern 60 kg/PSC6 visual example, but does **not** establish that every kilometre—or the unspecified terrain-study location—has that exact structure.
   - [SCR section listing](https://scr.indianrailways.gov.in/cris/view_section.jsp?lang=0&id=0%2C1%2C383%2C547%2C2694%2C2703%2C2713%2C2742)
   - [SCR track-renewal / work-status listing](https://scr.indianrailways.gov.in/billStatus_new.jsp?Department_id=-100&id=0%2C5&Start=410&Division_id=-100&lang=0&search_go=null)

2. **Broad gauge.** The Indian Railways Schedule of Dimensions identifies BG as 1,676 mm gauge. Gauge is represented between the rail gauge faces; the model's rail-head spacing accounts for the head width rather than treating rail centerlines as the gauge measurement.
   - [Indian Railways Schedule of Dimensions — 1676 mm BG](https://irimee.indianrailways.gov.in/instt/uploads/files/1454673172611-sod.pdf)

3. **Rail and sleeper sizes.** RDSO's current track-relaying specification lists 60 kg/m rail at about 172 mm high and a normal PSC sleeper at approximately 2,750 × 250 × 210 mm. RDSO sleeper material identifies drawing RT-2496 for the 60 kg BG sleeper. These are dimensional references for a simplified mesh, not a claim that the exact local sleeper drawing or rail grade is known.
   - [RDSO — Track Relaying Equipment specification, July 2026](https://rdso.indianrailways.gov.in/uploads/files1/2026-07-13-Specification%20of%20TLE.pdf)
   - [RDSO — PSC sleeper quality-assurance pamphlet](https://rdso.indianrailways.gov.in/works/uploads/File/Pamphlet%20on%20Quality%20Assurance%20Planning%20PSC%20Sleepers.pdf)

4. **Sleeper density.** The SCR renewal entry above specifies 1,660 sleepers/km for the referenced renewed lengths, equivalent to about 0.60 m average spacing. The model uses that value as a main-line visual reference; actual spacing varies around joints and special trackwork, which are outside this straight-track study.

5. **Existing-line track spacing.** The Indian Railways Schedule of Dimensions gives 4,265 mm centre-to-centre as the minimum for existing straight tracks and 5,300 mm for new works/additions. The study uses 4,265 mm for its illustrative pair of existing UP/DN lines; it is not a surveyed local measurement and is not a spacing claim for a new third/fourth line.
   - [Indian Railways Schedule of Dimensions — 1676 mm BG](https://irimee.indianrailways.gov.in/instt/uploads/files/1454673172611-sod.pdf)
   - [CAMTECH — Basics of Track Structure and Components (September 2023)](https://indianrailways.gov.in/railwayboard/uploads/directorate/eff_res/camtech/Civil%20Engineering/YearWise/Booklet%20on%20BASIC%20OF%20TRACK%20STRUCTURE%20AND%20COMPONENTS.pdf)

6. **Ballast cushion.** The CAMTECH reference compiles a 60 kg/PSC/1,660 sleepers-per-kilometre track structure with a 300 mm total ballast cushion (including a clean-ballast component) for its specified high-speed track conditions. The visual study uses a 300 mm cushion as a documented reference, not as a verified measurement of the unspecified SC–KZJ scene location.

## Electrification evidence

1. **Traction system.** South Central Railway describes its conventional electric traction supply as 25 kV, single-phase AC and the OHE as a contact wire suspended from a catenary by flexible droppers. The pantograph slides against the contact wire. This supports adding a conventional two-wire catenary/contact-wire system, not a live electrical simulation.
   - [South Central Railway — Traction Distribution](https://scr.indianrailways.gov.in/view_section.jsp?lang=0&id=0,1,383,541,846)

2. **OHE dimensions and support rhythm.** Railway Board AC Traction Manual material gives a normal regulated contact-wire height of about 5.60 m above rail level, a catenary support height around 6.95 m, droppers spaced no more than 9 m apart, and straight-track support spans up to 72 m. A separate manual appendix gives 2.50 m from the centre line of a tangent BG track to the nearest part of a standard traction mast. The scene uses a 60 m support rhythm, 8 m maximum dropper spacing, and that 2.50 m mast-face setting. Exact heights, spans, and mast placement remain controlled by site-specific Section Erection Drawings (SEDs), which are not available for this generic location.
   - [Railway Board — AC Traction Manual, Volume I (2022)](https://indianrailways.gov.in/railwayboard/uploads/directorate/ele_engg/2022/ACTM%20VOLUME-I_Ebook_20-11-22.pdf)
   - [Railway Board — AC Traction Manual, fixed-installation chapter](https://indianrailways.gov.in/railwayboard/uploads/codesmanual/ACTraction-I/AcTractionICh2_Data.htm)
   - [Railway Board — AC Traction Manual, mast setting appendix](https://indianrailways.gov.in/railwayboard/uploads/codesmanual/ACTraction-II-P-II/AcTractionIIAppendix1b.htm)

3. **Signals are deliberately deferred.** SCR reports an automatic-signalling installation on the Moula-Ali–Ghatkesar lines, but the existing scene is not tied to a surveyed milepost and does not establish the control system, signal sequence, line assignment, or signal location for this modeled patch. Adding a plausible-looking signal without that information would imply unsupported route-specific accuracy.
   - [SCR — Moula-Ali–Ghatkesar double-line and automatic-signalling work](https://scr.indianrailways.gov.in/view_detail.jsp?lang=0&id=0,5,268&dcd=14462&did=1584533047472FA22E3A38542DEEDF53234963EFBE11B)

## Visual decisions and limits

- Represent two current UP/DN main lines as a straight, gently graded, 540 m ballasted corridor with regular 60 m OHE spans through the existing regional environment. This is an **illustrative track study**, not a reconstruction of a particular station, track kilometre, yard, or approved construction layout.
- Use 1,676 mm BG, 60 kg/m-style rail, PSC sleepers, about 0.60 m sleeper spacing, a 300 mm ballast cushion, and 4.265 m between existing-line centres, based on the cited route-renewal and Railway Board/RDSO references. The corridor contains a mix of existing and renewed structures; this one illustrative example intentionally does not pretend otherwise.
- Add one conventional OHE system over each line, with contact wire at the general 5.60 m reference height and supports at 60 m intervals. Use a restrained procedural material palette; no third-party models or textures are bundled.
- Do not show a future third/fourth-line buildout inside Secunderabad station, station infrastructure, signals, or a train until the dated station/yard layout and relevant official plans are verified. Selecting a location and time-slice does not establish the track geometry.
- The generated forms are scale-oriented visual meshes, not engineering drawings, a safety representation, or a promise of exact compliance with railway construction tolerances.

Direct fetching of several Railway Board/RDSO pages returned a site-maintenance page or failed; values above were checked against the manuals/specification excerpts indexed by search. A survey drawing and route-specific OHE SED would be needed before claiming an exact local arrangement.
