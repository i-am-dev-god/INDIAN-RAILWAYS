# Scene 01 research note — Ground and sky

**Research date:** 2026-10-22  
**Build scope:** a first interactive environment study only. No station architecture, train, rails, signals, or player-data integration is part of this milestone.

## Regional evidence

1. **Hyderabad district terrain (official district portal).** The district's “At a glance” information describes the terrain as hard and rocky, with pink and grey granite, and gives the district's altitude and normal rainfall. This supports a rocky, elevated Deccan ground palette rather than a flat green lawn. The district page is regional context, not a precise survey of the railway right-of-way.  
   Source: [Hyderabad District — Economy](https://hyderabad.telangana.gov.in/economy/)

2. **Broader Telangana plateau.** Britannica describes the Telangana Plateau as an upland region with valleys and isolated hills; its land description notes red sandy soil and scattered rocky terrain. This informs the low, rolling terrain profile and the reddish soil tones.  
   Source: [Encyclopaedia Britannica — Telangana](https://www.britannica.com/place/Telengana)

3. **Northern Telangana landscape for later route sections.** The National Tiger Conservation Authority's Kawal brief classifies that reserve's vegetation as southern tropical dry deciduous forest, including dry teak and mixed deciduous series, with teak and bamboo. This is a reference for later northern-Telangana scenery near the route corridor; it is **not** being used to claim that the first Secunderabad scene is forest or that the line passes through the reserve.  
   Source: [NTCA — Kawal Tiger Reserve brief](https://ntca.gov.in/assets/uploads/briefnote/kawal.pdf)

4. **Time-of-day starting point.** Central Railway's notice for the Secunderabad–Nagpur Vande Bharat lists the Secunderabad departure at 13:00. The first lighting preset therefore starts as a clear early-afternoon study; the user can move the slider toward evening. The clear weather is an artistic test preset, not a claim about a particular day's forecast.  
   Source: [Central Railway — Nagpur–Secunderabad Vande Bharat service notice](https://cr.indianrailways.gov.in/view_detail.jsp?lang=0&id=0,4,268&dcd=9353&did=172647245844857BA67FF8C29026226FB364D51C9F60C)

5. **Station architecture is date-sensitive.** Reporting in February 2025 documented demolition/redevelopment work at Secunderabad's historic station building. Since the station's appearance depends on the chosen time period and project state, this milestone deliberately avoids depicting the station façade.  
   Source: [The Hindu — Secunderabad station redevelopment](https://www.thehindu.com/news/cities/Hyderabad/main-building-of-secbad-rly-station-to-be-demolished-in-phases-for-redevelopment/article69216307.ece)

## Visual decisions for this milestone

- Treat the scene as a **regional Deccan terrain study around the Secunderabad approach**, not a geometrically surveyed real-world location.
- Use gently uneven ground, dry red-brown earth, pale pink/grey granite outcrops, and sparse scrub. Keep the skyline open and avoid dense northern-Telangana forest at the starting location.
- Use a physically based atmospheric sky and a high-sun 13:00 baseline. An interactive slider allows inspection of the lighting toward evening.
- Generate ground and cloud textures in code for this prototype. No scraped photographs or third-party model assets are bundled.
- Keep the first scene free of railway structures so the ground/sky foundation can be reviewed before track and station assets are researched and added.

## Accuracy and scope limits

Public regional references establish a plausible visual direction, not exact soil color, vegetation density, station coordinates, or trackside geometry. Before depicting a specific platform, signal, bridge, village, or forest section, that element needs its own source check and visual reference. Later stages should cite official railway/engineering references where available and separately label any artistic approximation.
