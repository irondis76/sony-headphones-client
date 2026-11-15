# 02 - Sony product lineup and official app feature set

Research date: 2026-11-15. Confidence markers: [V] = verified from a fetched/searched source this session; [P] = prior knowledge, not re-verified; [?] = uncertain/conflicting/unknown.
Many Sony help-guide and support pages returned 403/404 to the fetcher, so a per-model official matrix could not be built from primary sources. The tables below are best-effort and must be validated against each model's help guide (helpguide.sony.net/mdr/<model>/v1/en/) and real captures.

## 1. Official apps

| Item | Detail |
|---|---|
| Current name | "Sony | Sound Connect" - rebrand of "Sony | Headphones Connect" announced Oct 2024 [V]. Same store listing (iOS id1168502924). |
| Versions | Latest tracked ~12.5.x; iOS 17+ required from 12.5; Android 11+ [V, third-party tracker]. |
| Feature availability | Sony states features depend on the model; Sony publishes a "compatible models" list (Sony Asia article 00346846) [V exists; contents not retrieved]. |
| Other Sony apps | "Sony | Sound Connect" also covers speakers/TVs? [?]. INZONE Hub (PC) is separate for INZONE gaming gear [P]. |
| Platforms for desktop | None official. No official Windows/macOS/Linux client for earbuds/headphones [P]. |

### Official app UX structure (best-known; [P] unless noted)
Sound Connect 2024+ layout: bottom tabs roughly "Devices" (home/devices, add device), "Sound" / "Services" / "Discover" style tabs [?]. Exact tab names changed between 2024 and 2026 versions; verify with screenshots. Older Headphones Connect had two tabs: **Status** (battery, connection codec, NC/ambient, EQ summary) and **Sound**/**System** (settings).

Per-device screen groups (typical):
1. **Sound**: NC/Ambient control (Noise Canceling / Ambient / Off, ambient level slider 0-20, "Focus on Voice", wind noise reduction, NC optimizer), Adaptive Sound Control, EQ (presets, Clear Bass slider, 5-band or 10-band custom), DSEE / DSEE Extreme, 360 Reality Audio setup, Spatial/head-tracking, Voice Guidance volume.
2. **System**: touch sensor / button assignment, Speak-to-Chat (sensitivity, timeout), Quick Attention, auto power-off, pause on removal (wear detection), Connection quality (Sound Quality Priority vs Connection Priority, LDAC), multipoint device management, Bluetooth/LE Audio mode & Auracast, language/voice assistant (Google/Alexa/Siri), firmware update, device info, find device (last-known location), "Connect to previously connected device", reset/factory reset.
3. **Services**: streaming-service integration (Endel, Spotify "Tap", Amazon Music, etc.), "Adaptive Sound Control" location-based behavior, Personalized NC Optimizer, Capture Voice During Phone Call, Headphones "Scene" / Listening modes. [P]

Most valuable for a desktop client (priority): (1) battery + status incl. case; (2) NC/ambient mode + level + voice passthrough; (3) EQ presets/custom bands/Clear Bass; (4) multipoint switching/device list; (5) connection quality + codec display; (6) touch/button mapping and wear detection toggles; (7) Speak-to-Chat toggle; (8) auto power-off/power off; (9) DSEE toggle; (10) firmware version display (not flashing). Lower value on desktop: location/find, head tracking (needs phone sensors), streaming-service links, Auracast broadcast setup, 360 RA personalization (needs ear photos).

## 2. Naming, model IDs and identification
- Marketing names (WH-1000XM6) differ from model numbers sometimes printed on devices/regulatory labels (e.g. WH-1000XM6 = "WH-1000XM6" with regional suffixes like /B, /S; earlier devices e.g. WH-1000XM4 "WH-1000XM4/B") [P]. Internal regulatory codes (e.g. "YY2xxx") exist but I could not verify mappings [?].
- Bluetooth advertised names usually equal the marketing name (e.g. "WH-1000XM5"), but user can rename in app; LE Audio / BLE adverts may show a different name [P].
- RFCOMM control channel uses service UUID `96CC203E-5068-46AD-B32D-E316F5E069BA` (v1/MDR); the channel number is found via SDP and varies by device [V - AndreasOlofsson/mdr-protocol]. Newer (v2) devices' UUID: a BTUUIDer-based reverse-engineering effort extracted UUIDs from WH-ULT900N, WH-1000XM5, WH-1000XM6 [V search snippet; UUID values not retrieved; likely a different UUID "956C7B26-D49A-4BA8-B03F-B17D393CB6E2" for v2 [P, unverified]].
- Frame format: start 0x3E, end 0x3C, escape 0x3D, DataType, seq id 0/1, 4-byte BE length, payload, 1-byte wrap-sum checksum [V]. mdr-protocol documents no model-ID table and no protocol-level model identification [V]; model detection in community clients is done via Bluetooth name / protocol "Init"/"Get device info" (model name, firmware version, series/color) request [P/?]. Needs capture/libmdr source review.
- Protocol generations: **v1** (ANC mode only: WH-1000XM2/XM3/XM4, WH-XB900N, MDR-XB950BT [V per SoundGuys/Sony Bridge]); **v2** (EQ, precise battery, more: WH-1000XM5/XM6, WH-XB910N, WH-CH720/CH520, WF-1000XM4/XM5, WF-C700N, LinkBuds S [V per Sony Bridge review]). XM4 is partly v1/v2-ish in community reports (Plutoberth lists XM4 "partially working") [V]. Newer-generation models (XM6, WF-1000XM6, ULT, LinkBuds Fit etc.) use further extended command sets [V: mos9527 fork has per-device docs].

## 3. Lineup (current and recent) - [P] unless stated

| Family | Models | Notes |
|---|---|---|
| WH-1000XM over-ear | XM3 (2018), XM4 (2020), XM5 (2022), XM6 (2025) | XM6: BT 5.3, 12 mics, QN3 processor, LDAC + LC3 + Auracast [V TechRepublic/SoundGuys] |
| WF-1000XM earbuds | XM3 (2019), XM4 (2021), XM5 (2023), XM6 (Feb 2026) | XM6: QN3e, 32-bit processing, IPX4, LDAC, LC3, 8 h NC on / 12 h off buds, case ~24 h total retailer claim [V partial] |
| LinkBuds | LinkBuds (WF-L900), LinkBuds S (WF-LS900N), LinkBuds Fit (WF-LS910N), LinkBuds Clip, LinkBuds Open (WF-L910) | mos9527 fork has docs for WF-LS900N and WF-L910 [V] |
| ULT | WH-ULT900N (ULT Wear), WF-ULT... (ULT Buds), SRS-ULT10/ULT Field speakers | Sound Connect has ULT POWER SOUND bass modes [P]; WH-ULT900N UUID analysis exists [V] |
| Budget NC | WH-CH720N, WH-CH520, WH-CH720, WF-C700N, WF-C710N, WF-C510, WF-C500 | WF-C510 and WH-CH720N documented in mos9527 fork [V] |
| Extra Bass | WH-XB910N, WH-XB900N, WF-XB700 | XB910N is v2 [V] |
| INZONE | INZONE H9, H7, H5 (headsets), INZONE Buds | Mostly use INZONE Hub (PC) + dongle; may not use MDR protocol [P/?] |
| Pulse | PlayStation Pulse Elite / Pulse Explore | Sony Interactive; PlayStation Link (not Bluetooth), separate app [P] |
| Others | Float Run, open-ear/neckband WI-series, WI-C100 etc. | Many not in app [?] |

## 4. Model-by-feature matrix (flagships; [P] unless marked)
Legend: Y = yes, N = no, ? = unsure/unverified, A = app-dependent (can only be set in app), D = also device-only (button/gesture).

| Feature | WH-1000XM4 | WH-1000XM5 | WH-1000XM6 | WF-1000XM4 | WF-1000XM5 | WF-1000XM6 | LinkBuds S | WH-CH720N | Location (A/D) |
|---|---|---|---|---|---|---|---|---|---|
| ANC / Ambient levels | Y (20 levels) | Y | Y, new auto ambient level [V mos9527] | Y | Y | Y | Y | Y | A + D |
| Voice passthrough ("Focus on Voice") | Y | Y | Y | Y | Y | Y | Y | ? | A |
| Wind noise reduction | Y | Y (auto/on?) | Y? | Y | Y | Y? | ? | N? | A |
| Adaptive Sound Control | Y | Y | Y | Y | Y | Y [V Sony EU] | Y | N? | A |
| Speak-to-Chat | Y | Y | Y [V mos9527] | Y | Y | Y [V mos9527] | Y | N? | A + D (toggle gesture) |
| Quick Attention | Y | Y | Y | Y (earbud) | Y | Y? | ? | Y? | D (touch) + A |
| EQ presets/custom | 5-band | 5-band + Clear Bass | 10-band [V shopsavvy, 3rd party]; preset codes Heavy/Clear/Hard/Soft 0x30-0x33, Custom 0xA0 [V] | 5-band | 5-band | Y? | Y | Y | A |
| DSEE / DSEE Extreme | Extreme | Extreme | Extreme [V 3rd party] | Extreme | Extreme | Y [V mos9527 DSEE supported] | Y | Y (DSEE) | A |
| 360 Reality Audio | Y | Y | Y | Y | Y | Y? | Y | N | A (ear photo) |
| Spatial / head tracking | N | ? | Y (Android 13+ requirement) [V partial] | N | ? | Y? [V Sony TH: head tracking on "both XM6"] | ? | N | A |
| Codecs | SBC/AAC/LDAC | SBC/AAC/LDAC | SBC/AAC/LDAC/LC3 [V] | SBC/AAC/LDAC | SBC/AAC/LDAC | SBC/AAC/LDAC/LC3 [V] | SBC/AAC/LDAC | SBC/AAC | - |
| LE Audio / Auracast | N | N (later FW?) [?] | Y Auracast (Android app) [V] | N | N? | LC3/LE Audio profiles [V], Auracast [?] | ? | N | A (Auracast setup) |
| Multipoint (2 devices) | Y | Y | Y [V] | Y | Y | Y [V mos9527] | Y | Y | A + D |
| Battery incl. case | headset % | % | % | buds L/R + case | L/R + case | L/R + case | L/R + case | % | A (v2 precise) |
| Wear detection / pause on removal | Y (WH-1000XM4 sensor) | Y | Y | Y | Y | mos9527 lists "Pause when removed: unsupported" for XM6 buds (client side) [V] | Y | N | A |
| Touch/button customization | Y | Y | Y (touch enable/disable; NC/AMB button) [V] | Y | Y | Y [V] | Y | N (buttons) | A |
| Auto power-off | Y | Y | Y [V] | Y | Y | Y [V] | Y | Y | A |
| Firmware update | Y (OTA via app) | Y | Y | Y | Y | Y | Y | Y | A only |
| Connection quality mode (SQ/Connection priority) | Y | Y | Y | Y | Y | Y | Y | N? | A |
| Find device | via app | via app | via app | via app | via app | via app | via app | ? | A |
| Voice assistant | Google/Alexa | Google/Alexa/Siri | same | same | same | same | same | Google | A + D |
| Capture voice during phone call | ? | ? | Y [V mos9527] | ? | ? | Y [V mos9527] | ? | ? | A |

Cells are largely prior knowledge; only [V]-marked entries were confirmed.

## 5. Features exposed in community protocol implementations (mos9527 fork, rewrite branch) [V]
Listed per device: Current Playing, Sound Pressure, Battery, Volume, Voice Guidance Volume, Track Controls, Multipoint (device change), Speak to Chat, Listening Mode, Equalizer, Touch Sensor enable/disable and gesture mapping, NC/AMB button settings, Power Off, Capture Voice During Phone Call, DSEE. Device docs exist for: WF-1000XM5, WF-1000XM6, WF-C510, WF-L910, WF-LS900N, WH-1000XM5, WH-1000XM6, WH-CH720N (list may be truncated). Includes caveat that the XM6 EQ accepts only specific preset codes as of FW 3.0.0.

Other projects: Plutoberth/SonyHeadphonesClient (original; WH-1000XM3 full, XM4 partial, MDR-XB950BT), ElXreno fork (WF-1000XM5), AndreasOlofsson/mdr-protocol and libmdr (protocol documentation, incomplete), juliusbroomfield/sony-headphones-client, "Sony Bridge" (macOS, v1/v2).

## 6. Implications for design
- Treat device capability as data: detect a capability set (from protocol "supported function" query [?]) rather than hard-coding per model.
- Support three protocol tiers: v1 (ANC only), v2 (MDR-ext), v3-ish (newer, XM6/ULT/LinkBuds Fit).
- LDAC cannot be controlled from macOS (OS limits Bluetooth to AAC) [V Soundguys].
- Features requiring phone sensors/cloud (head tracking, 360 RA, find device, firmware download) are out of scope initially.

## 7. Gaps
- Official per-model compatibility matrix and help-guide feature lists not retrieved (Sony 403/404).
- Model ID / model number codes and v2 UUID not verified; need mdr-protocol packets, libmdr source or captures.
- LinkBuds Fit/Clip, ULT, INZONE, Pulse feature specifics unverified.
- Official app tab names unverified.
- Auracast on WF-1000XM6 and head tracking on XM5/WF-1000XM5 unverified.

## Sources
- https://www.soundguys.com/sony-bluetooth-headphone-control-mac-os-160060/
- https://github.com/AndreasOlofsson/mdr-protocol
- https://github.com/mos9527/SonyHeadphonesClient (README, docs/device-support on rewrite branch)
- https://github.com/Plutoberth/SonyHeadphonesClient
- https://raw.githubusercontent.com/mos9527/SonyHeadphonesClient/rewrite/docs/device-support/WH-1000XM6.md
- https://raw.githubusercontent.com/mos9527/SonyHeadphonesClient/rewrite/docs/device-support/WF-1000XM6.md
- https://www.soundguys.com/sony-wh-1000xm6-vs-sony-wh-1000xm5-137876/
- https://www.techrepublic.com/article/news-sony-wh-1000xm6-vs-wh-1000xm5/
- https://www.tomsguide.com/audio/over-ear-headphones/sony-wh-1000xm6-vs-wh-1000xm5-whats-the-difference
- https://www.sony.ca/en/headphones/products/wf-1000xm6/spec
- https://www.sony.eu/presscentre/sony-launches-wf-1000xm6-truly-wireless-earbuds-the-best-noise-cancelling-with-premium-sound
- https://shopsavvy.com/answers/sony-wh-1000xm6-sound-connect-app-features-settings.md (third party)
- https://apps.apple.com/app/id1168502924
- https://www.sony-asia.com/electronics/support/audio-systems-other-audio-systems/articles/00346846 (compat list; not retrieved)
- https://www.sony.co.th/en/electronics/support/articles/00303494 (head tracking article; not retrieved)
