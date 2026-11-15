# 03 - Official APIs, SDKs and Standards for Sony Headphone Integration

Research date: 2026-11-15. Scope: what Sony officially offers, what Bluetooth standards expose without the proprietary protocol, OS-level capabilities for a Python desktop client, how the official app connects, and firmware update risks.

Confidence legend: **H** = confirmed by a primary/official source fetched or seen in results; **M** = consistent secondary sources or partial primary; **L** = single weak source, or from background knowledge not verified in this session (marked "unverified").

---

## 1. Executive summary

- **No public Sony SDK or documented API exists for controlling headphones/earbuds** (ANC, ambient sound, EQ, battery, etc.) from a third-party desktop app. (Confidence: M-H. Absence of evidence after several searches; cannot prove a negative, and partner programs may be private.)
- Sony's only official third-party hook is **"Service Link"** (partner services such as Endel) — a cloud/app-to-app integration surfaced in the Sony Sound/Headphones Connect app, not a device-control SDK. Access terms are not public. (H for existence, L for terms.)
- The **"Audio Control API"** (2017) is HTTP/JSON for home audio (AV receivers, soundbars, speakers) — **not headphones**. (H)
- The practical route for a desktop client is the **reverse-engineered "MDR" protocol over Bluetooth Classic RFCOMM**, discovered by service UUID `96CC203E-5068-46AD-B32D-E316F5E069BA` via SDP. Community projects (Plutoberth/SonyHeadphonesClient, AndreasOlofsson/mdr-protocol) are the de-facto reference; none is official. (H)
- **Standards-only features** (audio, media keys, volume, battery via HFP/GATT) work on all OSes without the proprietary protocol, with caveats per OS (section 3).
- Sony's companion app was renamed **"Headphones Connect" -> "Sound Connect"** (Oct 2024). Newer models (WH-1000XM6, WF-1000XM6) use Sound Connect; protocol compatibility of the newest models with older community docs is **unverified** (see gaps).

---

## 2. Official Sony developer programs: what exists / is gated / does not exist

### 2.1 Exists (public)
| Item | What it is | Relevance to headphone control | Confidence |
|---|---|---|---|
| Audio Control API (2017) | HTTP/JSON API for STR-DN1080 AV receiver, HT-CT800 soundbar, SRS-ZR5 speaker | None for headphones | H |
| Service Link / partner services | Partner apps (e.g. Endel) link to headphones through the Services tab of the Sony app; "see sony.net/servicelink" (redirects to a Sony partner page). Availability varies by region; "specifications may change without notice" | Integration happens inside Sony's app; no documented local/desktop API | H (existence), L (developer terms) |
| 360 Reality Audio licensing | Licensing program for certified devices, content creation, playback-app SDK (a "360 Reality Audio playback app SDK" is mentioned in a Japanese content creation guideline), Gaming Virtualizer plug-in for game developers (Aug 2024), Creative Suite (Virtual Sonics) | About spatial audio content/playback, not headphone control | M |
| Sony Help Guides (helpguide.sony.net/mdr/...) | User docs per model: features, app usage, LE Audio setup | Useful for feature inventory, not protocol | H |
| Firmware release notes (Sony support "Software/Downloads" pages) | Per-model change logs | Feature inventory/timeline | H |

### 2.2 Gated / partner-only (existence inferred, terms not public)
- 360 Reality Audio licensing inquiry (device certification, playback SDK) - via Sony's licensing page. Entry point is an inquiry form. (M)
- Service Link partner onboarding - no public sign-up found. (L)
- Chipset-vendor SDKs (e.g. Airoha, Qualcomm) used inside the headphones are under vendor NDA; not Sony-provided. (M, general knowledge; Airoha SDK patch referenced in the 2025 vulnerability reports)

### 2.3 Not found / does not appear to exist
- A public "Sony Headphones SDK" / "Headphones Connect SDK" for third parties. Not found.
- A public INZONE Hub API for PC (INZONE Hub is a closed Windows/macOS app). Searches returned nothing; treat as **not public**. (L)
- Public protocol specification for the headphones' control channel. Not published by Sony.
- A Sony desktop app for the WH/WF line on Windows/macOS/Linux: not found (official app is Android/iOS only; "Sound Connect" is mobile). (M)

**Legal/ethics note**: community projects disclaim affiliation and liability; reverse-engineering for interoperability varies by jurisdiction. A desktop client should be labeled "unofficial", avoid Sony trademarks/logos, and not ship Sony firmware or assets. (general guidance)

---

## 3. Bluetooth standards and what a desktop app can read without the proprietary protocol

### 3.1 Profiles in play
| Profile | Role for headphones | Desktop-readable without proprietary protocol |
|---|---|---|
| A2DP (SBC mandatory; AAC, LDAC, aptX variants optional) | Audio stream | Yes: OS audio endpoint. Active codec selection is OS/stack-dependent (see 5.3). |
| AVRCP | Media keys, absolute volume, metadata | Yes: OS maps button events to media keys; absolute volume handled by OS. |
| HFP / HSP | Calls, mic, voice assistant, battery indicator | Yes, partly: battery via HFP extensions (3.2). Mic usage forces narrowband/wideband (CVSD/mSBC) with quality drop. |
| GATT Battery Service (0x180F) | Battery level for BLE/LE Audio devices | Yes, if the device exposes it over LE; Classic-only devices may not. |
| LE Audio (LC3, TMAP, PBP, BAP, Auracast) | Newer audio transport and broadcast sharing | Support in desktop stacks is uneven (see 3.3). |
| Vendor RFCOMM SPP-like service (Sony MDR) | Control: ANC, EQ, settings, detailed battery | Only via the reverse-engineered protocol. |

### 3.2 Battery without the proprietary protocol
- **HFP 1.7 HF Indicators** (AT+BIEV) can report battery; optional, many devices don't implement it. (M, from PulseAudio/PipeWire discussion)
- **Vendor AT extensions** widely used by headsets: Apple `AT+XAPL` / `AT+IPHONEACCEV`, Plantronics/Poly `AT+XEVENT=BATTERY`. BlueZ-side projects parse these on the RFCOMM socket and publish `org.bluez.Battery1` for UPower. (H for existence; exact per-device behavior of Sony units is **unverified**.)
- On Linux: PulseAudio merge request !482 and PipeWire MRs 504/1598 implement HFP battery -> BlueZ Battery Provider -> UPower. Native HFP backend only (oFono/hsphfpd own the RFCOMM socket themselves). BlueZ's battery-provider/`Battery1` side historically required `bluetoothd -E` (experimental); current requirement **unverified**. (M)
- On Windows: BLE devices expose the GATT Battery Service via `Windows.Devices.Bluetooth.GenericAttributeProfile` (`GattServiceUuids.Battery`; bluetooth capability required). Windows' Settings shows battery for devices it understands; Microsoft's accessory guidelines require classic audio accessories to support the battery level indicator. A Classic-HFP battery reader exists as a community project (`bluetooth_classic_battery_windows`), noting WinRT has no built-in classic battery API. The `DEVPKEY` for battery (commonly cited `{104EA319-6EE2-4701-BD47-8DDBF425BBE5}` pid 2) was **not confirmed** by docs in this session. (M/L)
- On macOS: `IOBluetoothDevice` exposes battery for some devices via private/undocumented keys (e.g. `system_profiler SPBluetoothDataType` shows battery for connected devices). Unverified in this session. (L)

**Practical conclusion**: battery percent is the one standard feature likely available cross-platform without the MDR protocol, but it is coarse and device/OS-dependent; MDR gives per-earbud and case values and is more reliable for Sony devices once the protocol works.

### 3.3 LE Audio / Auracast
- Sony help guides: LE Audio supports LC3; setup via Sound Connect "LE Audio connection setting"; Sony warns **some headset functions cannot be used when connected via LE Audio** (H). A later firmware made Digital Assistant and head tracking available with LE Audio, requiring re-pairing (M).
- Sony shipped Auracast-based Audio Sharing (with Fast Pair) via firmware to WF-1000XM5 / WH-1000XM6 (M, press via The Verge mirror). A low-authority source claims no Auracast on iOS devices (L).
- Implication: if headphones are on an LE Audio connection, the **classic RFCOMM control service may be unavailable or behave differently** on the desktop (unverified; test needed).
- Bluetooth SIG specs (BAP, PBP, TMAP, Auracast) are public; desktop OS support: Windows 11 has LE Audio support (since 22H2, H/M from general knowledge); BlueZ + PipeWire LC3 support is maturing (unverified current state).

---

## 4. The proprietary control channel (what the official app uses)

Source: AndreasOlofsson/mdr-protocol (community, "very incomplete / WIP"), Plutoberth/SonyHeadphonesClient (community, archived read-only 2025-07-19).

- **Transport**: Bluetooth Classic **RFCOMM**. The official Sony app opens an RFCOMM connection to the channel that advertises SDP service UUID **`96CC203E-5068-46AD-B32D-E316F5E069BA`** (case-insensitive). The channel number varies by device/firmware (examples: ch 9 on WF-3000XM3, ch 15 on WH-3000XM3), so **SDP lookup is required**; don't hardcode channels. (H for XM3-era; confidence for newest models: M/L.)
- **Framing ("Tandem")**: frames start with `0x3E` and end with `0x3C`; escape byte `0x3D` followed by the byte AND `0xEF` for values 0x3C/0x3D/0x3E; frame fields: DataType(1), SequenceId(1; alternates 0/1), PayloadLength(4, big-endian), Payload(N), Checksum(1, wrapping sum). Receiver ACKs each non-ACK frame with an empty ACK of the opposite sequence ID; unacked frames are resent with the same sequence ID. DataTypes: Ack 0x01, DataMdr 0x0C, DataMdrNo2 0x0E (others listed but unexplained). (H as documented by that repo; checksum details ambiguous - verify against source.)
- **Documented devices**: mdr-protocol: WF-3000XM3, WH-3000XM3. SonyHeadphonesClient: WH-1000XM3 (full), WH-1000XM4 (partial), MDR-XB950BT (full); forks claim WF-1000XM5, WH-1000XM4 etc. (unverified by the author). (H)
- Features implemented by SonyHeadphonesClient: ambient sound/ANC control, virtual sound (VPT / sound position), battery and settings retrieval, equalizer. (H)
- A small tool `btuuider` states it was used to extract UUIDs from WH-ULT900N, WH-1000XM5 and WH-1000XM6 for reverse engineering. Contents not verified. (L)
- Head tracking (XM5 firmware 2.0.2, Android 13+ / certain apps) is a feature; its transport (BLE GATT vs RFCOMM) was **not** found in public docs. (L)
- Plutoberth client stack hint: C++ with Dear ImGui (GLEW/GLFW), D-Bus/Bluetooth dev libs on Linux, CMake/VS on Windows, Xcode on macOS. Which BT API per platform not confirmed from the README. (M)

### 4.1 Android/iOS app side (what is published)
- Help guides state: pair in OS Bluetooth settings first, then the app auto-detects; app features list (ANC, EQ, Adaptive Sound Control, DSEE, Speak-to-Chat, multipoint, Service Link tab, firmware update, auto power-off settings, LE Audio settings).
- Sony does **not** publish the service UUID or command set; the UUID above comes from community reverse engineering.
- The app was renamed to "Sony | Sound Connect" (App Store note: Oct 2024). Older devices still use "Headphones Connect" guides.

---

## 5. OS-level capabilities for a Python desktop client

### 5.1 Windows
- **Winsock Bluetooth** (`AF_BTH`, `BTHPROTO_RFCOMM`): Python's `socket` module supports `AF_BTH` on Windows (Python docs; **unverified here**, background knowledge). Needs the RFCOMM channel (from SDP) or `SOCKADDR_BTH.serviceClassId` to let Windows resolve it. PyBluez-style libs have installation friction on modern Python.
- **WinRT** `Windows.Devices.Bluetooth.Rfcomm`: `RfcommServiceId.FromUuid()` + `RfcommDeviceService.GetDeviceSelector()` / `FromIdAsync()`, then `StreamSocket` connect via `ConnectionHostName`/`ConnectionServiceName`. Declares capability `bluetooth` (`bluetooth.rfcomm` in manifest for packaged apps with device-capability). `RequestAccessAsync()` invokes device consent (paired devices prompt on `FromIdAsync`), must run on UI thread. `GetSdpRawAttributesAsync()` lets you read SDP records. (H, Microsoft Learn.) From Python, use `winrt-*` projection packages (`winrt-Windows.Devices.Bluetooth.Rfcomm` etc.).
- **Audio endpoints**: standard A2DP/HFP endpoints appear as MMDevice endpoints; a client can read/set default device and volume via Core Audio (`pycaw`) (unverified). Windows exposes **HFP (hands-free) and A2DP as separate endpoints**; opening the mic switches to HFP quality. Sony ships no Windows driver for WH/WF (INZONE gaming products use their own app/dongle) (M).
- Windows Settings shows battery for devices it understands (H/M).

### 5.2 macOS
- **IOBluetooth** (Objective-C) provides RFCOMM: `IOBluetoothDevice performSDPQuery:`, `openRFCOMMChannelAsync:withChannelID:delegate:`, `IOBluetoothRFCOMMChannel`. Python access via PyObjC (`pyobjc-framework-IOBluetooth`). (H for API existence; exact signatures not re-fetched. The Apple doc URL tried returned 404.)
- **CoreBluetooth** is BLE-only (GATT); it cannot open Classic RFCOMM. Useful only for GATT battery/LE services. (H, general knowledge/consistent with bleak docs.)
- **Permissions**: `NSBluetoothAlwaysUsageDescription` in Info.plist is the well-supported requirement; apps without it can be killed by TCC when touching Bluetooth. Parent-process attribution applies (a script run from Terminal/IDE needs that host app to have the key; a bundled app should have its own). Since Sonoma, IOBluetooth access is TCC-gated and daemons can't reach it. For sandboxed apps, `com.apple.security.device.bluetooth` entitlement is expected (not confirmed by Apple docs in this session). (M)
- **Known issue**: forum report of RFCOMM channel-open failures (error 911) with a classic headset on Sequoia 15.5. Treat RFCOMM on recent macOS as needing real-device testing. (M/L)
- Distribution: packaged .app (py2app/PyInstaller) needs the plist key, code signing, and notarization to avoid prompts being attributed to Terminal.

### 5.3 Linux
- **BlueZ D-Bus**: `org.bluez.ProfileManager1.RegisterProfile(profile_path, uuid, options)` and the app implements `org.bluez.Profile1` (`NewConnection(device, fd, fd_properties)`, `RequestDisconnection`, `Release`). BlueZ hands the app an RFCOMM socket FD after connection. Client role: set `Role="client"`, `AutoConnect`, etc. The docs moved to `org.bluez.Profile.rst` / `org.bluez.ProfileManager.rst` in Oct 2023. Gotcha: D-Bus policy must allow the app on the system bus; a user-reported case where registration succeeded but the profile was invisible. (H)
- **Raw sockets**: Python `socket.AF_BLUETOOTH` + `BTPROTO_RFCOMM` with `connect((addr, channel))` works on Linux after you determine the channel from SDP (`sdptool browse`/`bluetoothctl info`/D-Bus `Device1.UUIDs` doesn't give channel numbers; use SDP query). This competes with BlueZ's own profile handling but is commonly used. (M, background knowledge)
- **Audio**: PipeWire + WirePlumber handle A2DP/HFP. `bluez5.codecs` lists enabled codecs (sbc, sbc_xq, aac, aptx, aptx_hd, ldac, ...); `bluez5.a2dp.ldac.quality` = auto/hq/sq. Runtime codec switching is done by selecting a card profile (e.g. via pavucontrol or `pactl set-card-profile`/WirePlumber API); no official `pactl set-codec` found. LDAC availability depends on distro packaging (libldac) and one user report cites breakage with PipeWire 1.6.2. (H docs, M/L anecdotes)
- **Battery**: HFP battery -> BlueZ Battery1 -> UPower, see 3.2.

---

## 6. Firmware update mechanisms and risks

- Updates are delivered **only through Sony's mobile app** (Sound Connect/Headphones Connect) over Bluetooth, downloading from Sony's servers. No public desktop/PC update tool was found for the WH/WF consumer line. (M)
- Sony guidance: after an error, dismiss it, restart the headset, relaunch app and retry; the update may report failure although it succeeded, so **check the version**; set **Automatic Power Off to "Do not turn off"** during update. Firmware **cannot be rolled back** once updated. (H, Sony support pages)
- Community reports: update failures when other BLE devices are connected, low battery, app crashes on iOS. No confirmed "bricking" reports found, but no official recovery procedure found either. (L)
- Security context: 2025 ERNW disclosures of Airoha Bluetooth SoC flaws (CVE-2025-20700/20701/20702 as publicly reported; CVE numbers **unverified here**) affect several Sony models (WH-1000XM5, WH-1000XM6, WF-1000XM5, etc.); vendors rolled out patches slowly. (M)
- **Recommendation for this project**: do **not** implement firmware upload/flashing. The protocol commands for firmware transfer (if reverse-engineered) carry bricking risk and legal/warranty issues; limit scope to read/settings commands, and clearly document that firmware updates must be done in the official app. Consider surfacing the installed firmware version (read-only) if the protocol supports it.

---

## 7. Implications for the Python client design

1. Make the transport layer pluggable per OS: Windows (WinRT or AF_BTH), macOS (PyObjC IOBluetooth), Linux (BlueZ Profile1 via D-Bus, or AF_BLUETOOTH sockets).
2. Always **SDP-discover** the RFCOMM channel for UUID `96CC203E-...`; never hardcode.
3. Treat byte-stream framing per the Tandem spec (escape, checksum, ACK/sequence toggling, resend).
4. Gate features by model via a capability table; newest models (XM6, WF-1000XM6, ULT line) must be **tested on real hardware** because only XM3-era docs are public.
5. Provide a **standards-based fallback** (battery via OS/GATT/HFP, media keys via OS) when the control channel is unavailable (e.g. LE Audio connection).
6. Safe-by-default: read-only operations first; no firmware commands; log protocol traffic for debugging; unofficial disclaimer.
7. macOS bundle: Info.plist `NSBluetoothAlwaysUsageDescription`, signing/notarization; Windows: ensure the paired device and consent.

---

## 8. Gaps and open questions (to verify with real hardware or further research)

- Whether XM5/XM6/WF-1000XM5/XM6 use the same UUID and Tandem/MDR framing (likely, **unverified**; community forks claim partial support).
- Whether the RFCOMM control service stays available when the headphones are connected via LE Audio, and how that differs per OS.
- Exact GATT services (if any) used for head tracking, multipoint, or other newer features.
- Exact battery property keys on Windows; macOS battery access method; current BlueZ battery-provider flag requirement.
- Apple's current entitlement requirements for sandboxed RFCOMM.
- Sony Service Link developer terms; INZONE Hub interfaces.
- Python `socket` support for `AF_BTH` / `BTPROTO_RFCOMM` per platform was stated from background knowledge and not verified in this session.
- Copyright/legal status of reverse-engineering in target jurisdictions; no legal review done.

---

## Sources

- AndreasOlofsson/mdr-protocol: https://github.com/AndreasOlofsson/mdr-protocol
- Plutoberth/SonyHeadphonesClient: https://github.com/Plutoberth/SonyHeadphonesClient
- juliusbroomfield/sony-headphones-client: https://github.com/juliusbroomfield/sony-headphones-client
- btuuider (UUID extraction tool, via ecosyste.ms): https://awesome.ecosyste.ms/projects/github.com%2Fsheikyon%2Fbtuuider
- Sony help guide: partner services (WH-1000XM5): https://helpguide.sony.net/mdr/wh1000xm5/v1/en/contents/TP1000562273.html
- Sony help guide: partner services (other models): https://helpguide.sony.net/mdr/2963/v1/en/contents/TP1000784824.html , https://helpguide.sony.net/mdr/2982/v1/en/contents/TP1001615250.html
- Sony help guide: Headphones Connect app features: https://helpguide.sony.net/mdr/2963/v1/en/contents/TP1000781980.html
- Sony help guide: LE Audio with Android: https://helpguide.sony.net/mdr/2985/v1/en/contents/F025_Connecting_with_an_Android_smartphone_using_LE_Audio.html , https://helpguide.sony.net/mdr/2984/v1/en/contents/TP1001872731.html
- Sony Sound Connect (App Store, rename note): https://apps.apple.com/DE/app/id1168502924
- Sony Canada support article on updates: https://www.sony.ca/en/electronics/support/articles/00355257
- Sony WH-1000XM5 software/firmware pages: https://www.sony.ca/en/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/software/00278246 , https://www.sony.co.in/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/software/00278245
- Audio Control API announcement: https://appdevelopermagazine.com/audio-control-api-announced-by-sony/
- Sony 360 Reality Audio licensing: https://sony.co.jp/en/Products/360RA/licensing ; creator page: https://www.sony.co.jp/en/Products/create360RA/ ; Gaming Virtualizer release: https://www.sony.co.jp/en/news-release/202408/24-023E
- Microsoft Learn, RfcommDeviceService: https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.rfcomm.rfcommdeviceservice
- Microsoft Learn, GATT client: https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/gatt-client
- Microsoft Learn, Bluetooth accessory guidelines (classic audio): https://learn.microsoft.com/en-us/windows-hardware/design/accessory-guidelines/bluetooth-accessory-guidelines/bluetooth-accessory-guidelines-classic-audio
- Windows classic battery community project: https://github.com/SpartanX1/bluetooth_classic_battery_windows
- BlueZ Profile API docs: https://bluez.readthedocs.io/en/latest/profile-api/ ; https://www.mankier.com/5/org.bluez.ProfileManager ; https://mankier.com/5/org.bluez.Profile
- BlueZ Battery1: https://mankier.com/5/org.bluez.Battery
- PulseAudio HFP battery MR: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/merge_requests/482
- PipeWire battery MRs: https://gitlab.freedesktop.org/pipewire/pipewire/-/merge_requests/504 , https://gitlab.freedesktop.org/pipewire/pipewire/-/merge_requests/1598
- WirePlumber Bluetooth configuration: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/bluetooth.html
- LDAC quality in PipeWire: https://www.guyrutenberg.com/2025/01/09/configuring-ldac-quality-in-pipewire/
- macOS Bluetooth permissions: https://developer.apple.com/forums/thread/675773 , https://developer.apple.com/forums/thread/738748 , https://eclecticlight.co/2025/03/03/managing-privacy-protected-devices/ , https://bugreports-test.qt.io/browse/QTCREATORBUG-26710 , https://developer.apple.com/forums/tags/iobluetooth?page=2
- Airoha Bluetooth vulnerabilities coverage: https://www.malwarebytes.com/blog/news/2025/07/bluetooth-vulnerability-in-audio-devices-can-be-exploited-to-spy-on-users
- WH-1000XM5 head tracking/multipoint LDAC update: https://www.notebookcheck.net/Sony-WH-1000XM5-receives-Multipoint-LDAC-and-head-tracking-support-via-new-update.736850.0.html
- Sony Auracast/firmware update coverage: https://www.notebookcheck.net/Sony-releases-major-updates-to-WF-1000XM5-and-WH-1000XM6-with-Bluetooth-and-pairing-improvements.1129084.0.html
- Update troubleshooting (third-party): https://seekingtech.com/how-to-fix-sony-wh-1000xm5-firmware-update-issues/
