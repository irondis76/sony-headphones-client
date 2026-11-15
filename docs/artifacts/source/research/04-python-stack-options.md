# 04 - Python stack options for an unofficial Sony headphones desktop client

Scope: Windows/macOS/Linux desktop client, Python, Bluetooth Classic RFCOMM (SPP-like) to Sony headphones (Sony "MDR" protocol).
Research date: 2026-11-15.

## Confidence legend

- [V] verified this session from a fetched page or search result (URLs in Sources).
- [M] from model memory / general knowledge, NOT re-verified. Check before committing the design.
- [?] open question.

Research limits: PyPI pages for pybluez2 failed to load; several maintenance dates (last commit, last release) were not obtainable. Treat all maintenance statuses as "check on day of decision".

---

## TL;DR recommendation

**Transport layer: a thin `Transport` abstraction with per-OS backends**, protocol core being pure, I/O-free Python (sans-IO).

| OS | Primary backend | Fallback |
|---|---|---|
| Windows | stdlib `socket.AF_BLUETOOTH`/`BTPROTO_RFCOMM` (Python >= 3.9) [V] with a ctypes SDP/service-UUID helper if channel lookup is needed [?] | pyserial on the paired Standard Serial over Bluetooth COM port [M] |
| Linux | stdlib `socket` RFCOMM (BlueZ) [V], channel found via SDP (dbus `Device1`/ `sdptool`-free approach, see below) | BlueZ D-Bus `Profile1` via dbus-fast [M] |
| macOS | `pyobjc-framework-IOBluetooth` (MIT, 13.0 released 2026-10-30, Python >= 3.11) [V] opening RFCOMM channel via `openRFCOMMChannelSync`, run loop on the main thread [M] | small Swift/Rust helper sidecar speaking stdio/JSON [M] |

**GUI: PySide6 (LGPL-3.0 Qt for Python) + asyncio bridged by `qasync`** (or a worker QThread running a pure-asyncio/thread transport). System tray, notifications, dark mode all native to Qt.
**Packaging: PyInstaller (one-dir) per OS** via GitHub Actions; Briefcase is the runner-up. Sign/notarize when budget allows (see section 3).
**Architecture: sans-IO protocol core + single I/O thread/asyncio task owning the socket; ack/retry as an explicit state machine; scripted fake-headphone transport for tests; hardware-in-the-loop as an opt-in marker.**

The riskiest unknown is **macOS RFCOMM from Python and Windows channel/UUID discovery** - prototype both first (spike, 1-2 days each).

---

## 1. RFCOMM from Python, per OS

### 1.1 Stdlib `socket` with `AF_BLUETOOTH` / `BTPROTO_RFCOMM`

- Linux (BlueZ): supported for years when CPython is built with Bluetooth headers (`bluetooth/bluetooth.h`). Distro Pythons generally have it; python.org/pyenv builds may lack it if libbluetooth-dev was missing at build time [M]. `hasattr(socket, "AF_BLUETOOTH")` is the runtime check.
- Windows: RFCOMM support added to CPython via bpo-36590 "Add Bluetooth RFCOMM Support for Windows"; only RFCOMM is supported (Winsock only supports RFCOMM, L2CAP macro exists but is not usable) [V]. Shipped in Python 3.9 [V per a SO answer in search results; exact version not confirmed on the official changelog - check `docs.python.org/3/library/socket.html` versionchanged notes].
- macOS: **not supported** in stdlib [M] (Apple does not expose BSD-style Bluetooth sockets; IOBluetooth is the API).
- Windows specifics [M/?]: `connect((bdaddr_string, channel))` needs the RFCOMM **channel number**; CPython's address tuple does not expose the Winsock `serviceClassId` field, so there is no connect-by-UUID. You must resolve the channel for the Sony service UUID yourself (SDP query via ctypes `WSALookupServiceBegin` with `NS_BTH`, or PyBluez `find_service`, or read it from the registry/paired device COM port mapping). Sony channel numbers may vary per model/firmware, so hardcoding is fragile [?].
- Windows also requires the device to be paired; opening a socket to a connected audio device generally works while A2DP/HFP are active [M].
- Pros: no third-party native dependency, works with any Python >= 3.9 on Win/Linux, blocking `socket` is trivial to wrap in a thread or `loop.sock_*`.
- Cons: no SDP in stdlib on any OS; no macOS; asyncio on Windows ProactorEventLoop does not necessarily support AF_BLUETOOTH sockets for `sock_connect` etc. (CPython issue27136 "sock_connect fails for bluetooth" is a related report) [V title only] - safest to use blocking sockets in a dedicated thread.

### 1.2 PyBluez / PyBluez2 / pybluez-updated / pybluez-edge

- Original PyBluez 0.23: effectively unmaintained for years, widely reported failing to build on modern Windows/Python (source build errors on Windows 11) [V from search result of SO question].
- PyBluez2 (0.46 per libraries.io; Windows >= 3.9 listed) and `pybluez-edge` (a 2022 cp311 win wheel; nothing for 3.12 seen) and `PyBluez-updated` (sdist only at 0.31) [V from search results, not from PyPI pages]. These are forks with unclear long-term maintenance; wheels for current Python versions (3.12-3.14) not confirmed [?].
- Value-add over stdlib: SDP (`find_service`, `advertise_service`) on Windows/Linux. Cons: native build burden, fragmented forks, no macOS support (PyBluez does have a limited macOS path via IOBluetooth through lightblue-style code, but is not reliable) [M].
- Verdict: **avoid as a hard dependency.** Optionally use as a Windows SDP helper only if a ctypes helper proves painful.

### 1.3 bleak

- BLE (GATT) only, cross-platform (WinRT, CoreBluetooth, BlueZ), MIT, actively maintained, asyncio native [M].
- Sony headphones use **Classic RFCOMM for the MDR control protocol**; bleak cannot reach it. Newer Sony models may expose BLE for pairing/LE Audio side-channels, but not the control protocol relied upon here [M/?]. Verdict: not applicable for the core; maybe future BLE discovery only.

### 1.4 pyserial over COM port (Windows)

- Windows creates outgoing "Standard Serial over Bluetooth link" COM ports for paired devices exposing SPP [M]. `pyserial` (BSD-3, mature) then opens `COMx`.
- Pros: trivial API, blocking and thread-friendly, avoids channel number discovery (Windows maps the service). Cons: port numbers must be discovered (registry / `serial.tools.list_ports` with Bluetooth hardware IDs); the Sony service UUID may not be mapped to a COM port for custom (non-SPP) UUIDs - Windows only creates ports for SPP-class services [?]. Opening can be slow/flaky; a port can hang if the device goes away.
- Verdict: **fallback only on Windows**; do not rely on it as primary until tested with real Sony hardware.

### 1.5 macOS: pyobjc + IOBluetooth

- `pyobjc-framework-IOBluetooth` 13.0 (2026-10-30), MIT, Python >= 3.11 [V]. Same family as the other pyobjc frameworks.
- Open an RFCOMM channel [M]: obtain `IOBluetoothDevice.deviceWithAddressString_(addr)`, perform SDP query (`performSDPQuery_`) / `getServiceRecordForUUID_`, read the RFCOMM channel ID (`getRFCOMMChannelID_`), then `openRFCOMMChannelAsync_withChannelID_delegate_` (or the sync variant); receive data via the delegate method `rfcommChannelData_data_length_`; write via `writeSync_length_` / `writeAsync_length_refcon_`.
- Run loop: IOBluetooth delegate callbacks are delivered on the thread's CFRunLoop; practical approach is to run IOBluetooth operations on the **main thread** (NSRunLoop) and relay bytes to the app thread, or use Qt's main thread (Qt on macOS drives a Cocoa run loop, so callbacks work while the Qt event loop runs) [M/?].
- Permissions/TCC: since macOS 11/12 Bluetooth access requires `NSBluetoothAlwaysUsageDescription` in Info.plist for bundled apps, and TCC prompts the user; unbundled `python` launched from Terminal inherits the terminal's permission (or crashes with a privacy violation on some versions) [M]. Packaged `.app` must include the plist key; hardened runtime may need the `com.apple.security.device.bluetooth` entitlement if sandboxed/hardened [M/?].
- Sync open methods can block the run loop; prefer async and delegate. Header caveat: IOBluetooth RFCOMM is a legacy-but-still-working API; there is no deprecation removal announced [M/?].
- Alternative: a Swift helper sidecar (see 1.7) removes pyobjc quirks at the cost of a second build target. The mos9527 fork claims "Full Support" on macOS through its `libmdr-bt` backend (C++/Objective-C++ presumably calling IOBluetooth) [V claim; backend internals not shown] - a useful reference implementation to read.

### 1.6 Linux: BlueZ via D-Bus (dbus-fast / dbus-next)

- `dbus-fast` (Bluetooth-Devices org, used by bleak) is the maintained fork; `dbus-next` is stagnant [M].
- Two paths: (a) stdlib RFCOMM socket after finding the channel through D-Bus `org.bluez.Device1` `UUIDs` (does not give channel) or by parsing `sdptool`/`bluetoothctl` output - clumsy; (b) register a `org.bluez.Profile1` for the Sony service UUID via `ProfileManager1.RegisterProfile` with `Role=client`; call `Device1.ConnectProfile(uuid)`; BlueZ then calls `Profile1.NewConnection(device, fd, props)` handing you a connected RFCOMM **file descriptor**, wrap it in a socket. This avoids channel lookup entirely and cooperates with bluetoothd [M]. Recommended for Linux. Caveat: Flatpak sandbox needs `--system-talk-name=org.bluez` and `--allow=bluetooth` [M].
- `ConnectProfile` for non-registered UUID should be done after registration; a profile registered under a UUID makes bluetoothd also *accept* incoming connections - set `RequireAuthentication` appropriately [M/?].

### 1.7 Helper sidecar (Rust/Go/Swift)

- A native sidecar owning Bluetooth (e.g. Rust `bluer` on Linux, `windows-rs` on Windows, IOBluetooth on macOS via objc2) speaking line-delimited JSON/length-prefixed frames over stdio to the Python app.
- Pros: avoids per-OS Python binding quirks, crash isolation, fits Tauri-style UIs. Cons: second toolchain, three more build artifacts, CI complexity; defeats "Python only" simplicity. Rust crates (`bluer` for Linux; macOS RFCOMM coverage in Rust is thin, would need objc2 bindings) [M/?].
- Verdict: keep as **escape hatch for macOS only** if pyobjc proves unworkable. Keep the `Transport` interface process-agnostic so a sidecar backend can drop in.

### 1.8 Backend summary

| Option | Win | mac | Linux | Maintained | License | Notes |
|---|---|---|---|---|---|---|
| stdlib socket | Y (3.9+) | N | Y | CPython | PSF | No SDP; no UUID connect on Windows |
| PyBluez forks | partial | weak | Y | unclear | GPL-2 (orig) [M] | Build pain; forks fragmented |
| bleak | Y | Y | Y | active | MIT | BLE only; not usable |
| pyserial | Y (COM) | /dev/cu.* only if SPP [M] | rfcomm bind [M] | active | BSD-3 | Windows fallback |
| pyobjc IOBluetooth | N | Y | N | active (13.0 Oct 2026) [V] | MIT | Main-thread/run-loop constraints |
| BlueZ dbus-fast | N | N | Y | active | MIT | Profile1 gives fd |
| native sidecar | Y | Y | Y | n/a | any | Most robust, most work |

---

## 2. GUI options

| Toolkit | License | Tray | Notifications | Dark mode | Packaging | Notes |
|---|---|---|---|---|---|---|
| **PySide6** (Qt for Python) | LGPL-3.0 / GPL / commercial [M] | `QSystemTrayIcon` all 3 OSes (Linux depends on StatusNotifier/AppIndicator support in the DE [M]) | `QSystemTrayIcon.showMessage` (basic); richer via `desktop-notifier` lib [M] | Qt 6.5+ follows OS scheme; `QStyleHints.colorScheme` [M] | PyInstaller works well; ~100-200 MB bundles | Official Qt binding, LGPL permits closed or MIT app if dynamically linked and replacement possible. Best match. |
| PyQt6 | GPL-3 or commercial (Riverbank) [M] | same | same | same | same | GPL forces the app to be GPL (or buy license). Fine if project is GPL; otherwise PySide6. |
| Tkinter / CustomTkinter | PSF/MIT | no native tray (needs `pystray` thread; mac conflicts with Tk main loop [M]) | none native | CustomTkinter has dark themes, not OS-following reliably | small | Light, but tray/notifications weak, looks dated |
| Dear PyGui | MIT | none | none | custom | small | Immediate-mode, game-tool look; no native tray/accessibility |
| Flet | Apache-2.0 [M] | limited/community | limited | yes (Flutter) | Flutter-based packaging `flet pack/build` | Flutter runtime + Python; young; Bluetooth via Python still OS-specific |
| Toga / BeeWare | BSD | tray: limited/experimental [M/?] | basic | native widgets | Briefcase native | Native widgets; tray/menu-bar support immature; pyobjc/WinRT backends available |
| Web UI + local server (FastAPI/NiceGUI) | permissive | via `pystray` or browser tab | browser notifications | CSS | tiny UI, but needs browser/webview (`pywebview`) | Good for remote/headless; weak "native app" feel, tray still requires a native helper |
| Tauri + Python sidecar | MIT/Apache | native tray in Tauri 2 [M] | native | native | Small shell, but 3 toolchains (Rust, web, Python) + sidecar bundling | Best polish/size, highest complexity; mixed-language maintenance burden |

Recommendation: **PySide6**. Tray + notifications + dark mode with one dependency and strong docs. If the maintainers prefer a minimal-footprint daemon, a tray-only app with `pystray` + a small settings window is a lighter alternative but weaker on macOS.

Mitigations for PySide6 size: exclude unused Qt modules via PyInstaller spec; use `pyside6-deploy`/Nuitka only if needed.

---

## 3. Packaging and distribution

| Tool | Win | mac | Linux | Pros | Cons |
|---|---|---|---|---|---|
| **PyInstaller** (GPL-2 with bootloader exception) [M] | exe/one-dir | .app via spec | binary | Most mature; large community hooks incl. PySide6, pyobjc | AV false positives for one-file exes on Windows; manual signing/notarization |
| Nuitka | yes | yes | yes | Faster startup, fewer false positives (arguably), can obfuscate | Longer builds, C compiler needed, PySide6 plugin works but edge cases; commercial features optional |
| **Briefcase** (BeeWare, BSD) | MSI (WiX) | .app/.dmg, signing/notarization built in | AppImage, deb/rpm, Flatpak [M] | Single tool producing native installers with signing flow; works with PySide6 template (community) [M/?] | Opinionated; PySide6 support less polished than Toga; Flatpak output is newer |
| py2app | no | yes | no | Standard mac bundler | mac only; fiddly with Qt |
| AppImage / Flatpak / deb | | | yes | Flatpak is the best Linux sandboxed route (Flathub); requires `--allow=bluetooth` and `--system-talk-name=org.bluez` | Flatpak review effort; AppImage lacks update story unless AppImageUpdate |
| Windows installer | Inno Setup / WiX / MSIX | | | Inno Setup simplest; MSIX good for Store/auto-update, requires signing | MSIX needs cert; unsigned installers trigger SmartScreen warnings |

Code signing/notarization [M]:

- Windows: unsigned works but triggers SmartScreen; options are OV/EV certificate, Azure Trusted Signing (Microsoft's service, availability limited by region/entity - check), or SignPath Foundation (free for OSS) [?].
- macOS: Apple Developer ID ($99/yr) + notarization is effectively required for a smooth install; unsigned apps need right-click-open or `xattr -d`. Hardened runtime + Bluetooth usage string required (see 1.5). This is the one recurring cost.
- Linux: none required; Flathub builds and signs for you.

Auto-update [M]: Windows/macOS - roll your own "check GitHub releases and notify" (simple, low risk) rather than silent updaters; options: `tufup` (TUF-based, PyInstaller friendly), `pyupdater` (stale), Sparkle on macOS (needs native glue), MSIX auto-update. Flatpak and distro packages update via their stores. Recommendation: **notify-only update check at v1**.

Recommendation: **PyInstaller one-dir + Inno Setup (Win), `.app` + `.dmg` via create-dmg (mac), AppImage and Flatpak (Linux)** from GitHub Actions matrix. Re-evaluate Briefcase if maintainers want one tool.

---

## 4. Architecture patterns

### 4.1 asyncio vs threads

The Sony MDR protocol is a framed byte stream with sequence numbers and ACK frames; commands must be ACKed, retried on timeout, and notifications arrive unsolicited [M from SonyHeadphonesClient protocol notes; v1 vs v2 protocol variants exist per the linkdow fork and SoundGuys, V].

- Blocking RFCOMM sockets on Windows stdlib and pyobjc's run-loop delegate model do not fit asyncio natively. **Pattern:** one **reader thread** (or main-thread run loop on macOS) per connection pushing parsed frames into a thread-safe queue, and a **single protocol-driver** (asyncio task or a Qt-signal-driven object) that owns state and timers.
- Keep the protocol engine **sans-IO**: `engine.feed(bytes) -> events`, `engine.send(command) -> bytes_to_write`, `engine.tick(now) -> actions`. Time is injected, so retry/timeout logic is deterministically testable with no sleeps.
- asyncio benefits: timers (`asyncio.timeout`), cancellation, clean concurrent request/response with `Future` per sequence number. Use `loop.run_in_executor` or `asyncio.to_thread` for blocking send/recv, or `qasync`/`QtAsyncio` for Qt integration [M].
- Pure threads are acceptable but make retry timers and shutdown harder; prefer asyncio engine + thread-bridged transport.

### 4.2 State machine

States: `Disconnected -> Connecting -> Handshake(init/capabilities) -> Ready -> Reconnecting`. Within Ready, a per-command sub-machine: `Queued -> Sent(awaiting ACK, deadline) -> Acked -> AwaitingResponse(optional) -> Done | Retry(n) | Failed`. Use an explicit enum + transition table (or `transitions`/hand-rolled) so tests can enumerate transitions. Treat headphones as source of truth: after every set, expect a notify/ret frame and reconcile UI state from it; model unsolicited state changes (e.g. ANC changed on-device).

### 4.3 Testing without hardware

- Pure-unit tests for framing (escape bytes, checksum, sequence numbers) using golden byte fixtures captured from real devices/other clients (record via btsnoop HCI logs on Android, Wireshark, or from the protocol docs) [M].
- A `FakeTransport` (in-memory duplex pipe) plus a **scripted fake headphone** that implements the device side of the protocol (ack, drops, delays, malformed frames, unsolicited notifications) for property/fuzz tests (`hypothesis`) of the decoder and retry logic [M].
- Contract tests: the same suite run against FakeTransport and (opt-in) real hardware to keep the fake honest.
- Socket-pair or `socat`/pty-based loopback test for the real transport code paths on Linux CI [M].
- Hardware-in-the-loop: pytest marker `hardware`, skipped by default (the repo already has a skipped placeholder test for the pre-push gate per git history); run manually on a dev machine or a self-hosted runner with a headphone/adapter. Bluetooth hardware in GitHub-hosted CI is not available [M].

### 4.4 CI on three OSes (GitHub Actions)

- Matrix `ubuntu-latest`, `windows-latest`, `macos-latest` (Apple Silicon) x Python 3.11-3.13 [M]; run lint, type-check (mypy/pyright), unit tests with fakes; GUI tests with `pytest-qt` and `QT_QPA_PLATFORM=offscreen` (Linux needs `xvfb` only for some widgets) [M].
- Import-smoke test per OS that the platform transport backend imports and `hasattr(socket, "AF_BLUETOOTH")` behaves as expected.
- Separate release workflow: build PyInstaller artifacts per OS, sign (secrets), notarize (mac), upload to GitHub Releases.
- Note macOS runners cannot grant Bluetooth TCC; do not attempt integration tests there.

---

## 5. Existing similar open-source projects and lessons

| Project | Language / stack | Relevant lessons |
|---|---|---|
| **Plutoberth/SonyHeadphonesClient** | C++ / CMake, Dear ImGui-style UI [M], MIT; Windows/macOS/Linux; archived July 2025 [V] | The seminal Sony client; protocol knowledge was reverse-engineered statically/dynamically (README says so) [V]. Primarily WH-1000XM3-era (v1 protocol). Archive means no upstream for new models. |
| **mos9527/SonyHeadphonesClient** (+ `libmdr`, `libmdr-bt`, `client`) | C/C++ / CMake, MIT [V] | Best-maintained fork; supports XM5/XM6 (v2 protocol) [V search]; clean split: protocol library (platform agnostic) / Bluetooth backend / UI [V]. Mirror this layering in Python. Platforms listed as Windows, Linux, macOS, iOS, Android, Web (WASM) [V]. |
| **linkdow fork / protocol docs, AndreasOlofsson/mdr-protocol** | docs | v1 vs v2 protocol split; use as spec sources (check licenses before copying) [V titles] |
| **juliusbroomfield/sony-headphones-client**, **whitebeard10/SonyCompanionApp** | misc (C++ per README claim) [V from search; unverified] | Other prior art; quality unknown [?] |
| **Oppzippy/OpenSCQ30** | Rust core + libcosmic GUI (GTK4/COSMIC) + Kotlin/Compose Android + CLI, GPL-3.0; Flathub, Windows packaging, GPG-signed releases, Weblate translations [V] | For Anker Soundcore, not Sony. Lessons: a shared core library with multiple front ends (CLI + GUI + mobile) via bindings (uniffi), CI/releases on GitHub only, early Flathub presence, device model registry for per-model features. Windows/Linux/Android "ready"; macOS only a build guide [V]. Indicates cross-platform Bluetooth is the long pole. |
| **Gadgetbridge** (Android, AGPL) [M] | Java/Kotlin | Per-device "coordinator" abstraction, protocol decoupled from UI, large community of device modules; relevant pattern: capability flags per device |
| AirPods tools (e.g. LibrePods, MagicPods-style, AirStatus) [M/?] | Mixed | Mostly L2CAP/BLE advertising; show that Linux/Windows support is hard; not directly comparable for RFCOMM |
| BudsLink (Linux earbud controls) [V title] | - | Same problem space for another brand; not examined |

Key lessons:
1. Separate **protocol (sans-IO) / transport / UI**, as mos9527 does.
2. Treat v1 vs v2 protocol and per-model capabilities as data (device registry/capability flags).
3. macOS and Windows transport are where bugs and permission issues cluster.
4. Archived upstream (Plutoberth) shows the bus-factor risk; keep docs of the protocol in-repo.
5. Legal/IP: reverse-engineered interoperability; do not bundle Sony assets; pick licensing compatible with copied protocol docs (several upstreams MIT; OpenSCQ30 GPL-3 - do not copy code from it into a non-GPL project).

---

## Decision matrix

Scores 1-5 (5 best). Weights reflect an OSS, small-team, three-OS desktop app.

### Transport stack

| Criterion (weight) | stdlib + platform glue (win socket / pyobjc / BlueZ Profile1) | PyBluez fork everywhere | Native sidecar (Rust/Swift) | pyserial-centric |
|---|---|---|---|---|
| Works on all 3 OS (5) | 4 | 2 | 5 | 2 |
| Dependency/maintenance risk (4) | 4 | 2 | 3 | 4 |
| Build/packaging simplicity (4) | 4 | 2 | 2 | 4 |
| Contributor accessibility (Python-only) (3) | 5 | 4 | 2 | 5 |
| Robustness (macOS run loop, Win channel lookup) (4) | 3 | 2 | 5 | 2 |
| Weighted total (/100 max 100) | **~80** | ~48 | ~70 | ~58 |

(Weighted = sum(score x weight) normalized by 100 [20 weight points x 5]; computed: stdlib 4*5+4*4+4*4+5*3+3*4=79 -> 79; PyBluez 10+8+8+12+8=46; sidecar 25+12+8+6+20=71; pyserial 10+16+16+15+8=65. Shown values approximate; ordering is the point.)

### GUI

| Criterion (weight) | PySide6 | PyQt6 | Tkinter/CTk | Flet | Toga | Web UI | Tauri+sidecar |
|---|---|---|---|---|---|---|---|
| Tray + notifications (5) | 5 | 5 | 2 | 2 | 2 | 2 | 5 |
| Dark mode/native look (3) | 4 | 4 | 3 | 4 | 4 | 4 | 5 |
| License fit for OSS (3) | 5 | 3 | 5 | 4 | 5 | 5 | 5 |
| Packaging maturity (4) | 4 | 4 | 4 | 3 | 3 | 3 | 3 |
| Single-language simplicity (4) | 5 | 5 | 5 | 4 | 5 | 3 | 1 |
| Total (max 95) | **90** | 85 | 68 | 58 | 63 | 53 | 66 |

### Packaging

| Criterion | PyInstaller | Nuitka | Briefcase |
|---|---|---|---|
| Maturity with PySide6/pyobjc | 5 | 3 | 3 |
| Installer/signing automation | 3 | 3 | 4 |
| Build time/simplicity | 4 | 2 | 4 |
| AV false-positive risk | 3 | 4 | 4 |
| Recommendation | **primary** | alternative | runner-up |

---

## Proposed layout (for the next doc)

```
sonyclient/
  protocol/   # sans-IO: framing, checksum, commands, v1/v2, model capability registry
  engine/     # state machine, ack/retry, subscriptions (asyncio)
  transport/  # base.py (Protocol), win_socket.py, win_serial.py, linux_bluez.py, macos_iobluetooth.py, fake.py
  ui/         # PySide6, tray, notifications
tests/        # golden vectors, fake headphone, hypothesis, @hardware marker
```

## Spikes to do first

1. Windows: connect to Sony service via stdlib socket; find channel for Sony UUID without PyBluez; compare against COM port route. [?]
2. macOS: pyobjc IOBluetooth RFCOMM open/read/write inside a Qt run loop, in a signed `.app` with `NSBluetoothAlwaysUsageDescription`; confirm TCC behavior. [?]
3. Linux: BlueZ `Profile1` + `ConnectProfile` with dbus-fast; test inside Flatpak. [?]
4. Confirm Sony service UUIDs per protocol version from the mos9527 / Plutoberth sources (do not rely on memory).

## Uncertainties / gaps

- pybluez2 / pybluez-updated / pybluez-edge PyPI pages not retrievable; wheel coverage for Python 3.12+ and last release dates unknown.
- Exact Python release that added Windows RFCOMM (stated as 3.9) not confirmed from official docs.
- Windows channel lookup approach and whether Sony's UUID maps to a COM port are untested.
- macOS TCC/entitlement behavior and main-thread constraints are from memory.
- Licenses and details marked [M] (PyInstaller, Briefcase output types, dbus-fast status, tufup, Azure Trusted Signing availability) need verification.
- Did not review in depth: Gadgetbridge Sony code, AirPods tooling, Tauri/Flet Bluetooth integration.

## Sources

- CPython bpo-36590 Windows RFCOMM: https://mail.python.org/pipermail/new-bugs-announce/2019-April/035386.html and https://www.python.org/pipermail/python-bugs-list/2019-August/414116.html
- Microsoft, Bluetooth and sockets: https://learn.microsoft.com/en-us/windows/win32/bluetooth/bluetooth-and-socket
- CPython issue27136 (sock_connect bluetooth): https://www.python.org/pipermail/python-bugs-list/2016-June/300877.html
- PyBluez docs install: https://pybluez.readthedocs.io/en/latest/install.html
- pybluez2 (PyPI search listing): https://pypi.org/project/pybluez2 ; libraries.io: https://libraries.io/pypi/pybluez2
- PyBluez-updated: https://pypi.org/project/PyBluez-updated/
- pyobjc-framework-IOBluetooth: https://pypi.org/project/pyobjc-framework-IOBluetooth/
- Plutoberth/SonyHeadphonesClient: https://github.com/Plutoberth/SonyHeadphonesClient
- mos9527/SonyHeadphonesClient: https://github.com/mos9527/SonyHeadphonesClient
- Sony MDR protocol notes: https://github.com/AndreasOlofsson/mdr-protocol
- OpenSCQ30: https://github.com/Oppzippy/OpenSCQ30
- SoundGuys on Sony headphone control on macOS: https://www.soundguys.com/sony-bluetooth-headphone-control-mac-os-160060/
- Other Sony clients seen in search: https://github.com/juliusbroomfield/sony-headphones-client , https://github.com/whitebeard10/SonyCompanionApp
- BudsLink: https://www.linuxjournal.com/node/1341427
