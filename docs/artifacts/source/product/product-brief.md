# Product brief: unofficial desktop client for Sony headphones

Status: draft v0.1 (2026-11-15). Built from research files 02-05 in `docs/artifacts/source/research/`.
The protocol deep-dive (`01-mdr-protocol.md`) was not completed, so protocol details here are not verified and need real captures.

Evidence tags used below: **[V]** verified in a fetched source, **[P]** prior knowledge, **[?]** unknown or conflicting.

## 1. Summary

A free, open-source desktop app for Windows, macOS and Linux that controls Sony headphones and earbuds over Bluetooth, replacing the phone-only Sound Connect app for everyday settings: noise cancelling and ambient sound, EQ, battery, and device status. First target is the WH-1000XM4, then two other models the owner has (not yet decided).

Sony ships no desktop app for these products [V]. Sony's phone app is the only official control surface.

## 2. Problem

- Settings live only on a phone. Changing noise cancelling, EQ or ambient level while working on a PC means picking up the phone.
- Battery level is not reliably visible on the desktop. Windows shows it only partly, through HFP [P].
- Multipoint users have no desktop control over which device the headphones talk to.
- Existing unofficial tools are fragmented: some are macOS only, some are Windows/Linux only, and the best-known cross-platform one is archived (July 2025) [V].

## 3. Competitive landscape

This is not a new idea. Others got there in 2026, so differentiation matters.

| Project | Platforms | Notes |
|---|---|---|
| Sony Sound Connect (official) | Android, iOS | Everything, including firmware. No PC version [V] |
| Plutoberth/SonyHeadphonesClient | Win, macOS, Linux | MIT, archived. XM3 full, XM4 partial [V] |
| Sony Device Center (marconvcm) | Windows, Linux | Free on GitHub, Sep 2026. Covers XM4 over the v1 protocol, 10-band EQ on newer models [V, SoundGuys] |
| Sony Bridge | macOS | Jul 2026. XM4 is ANC only, with reported crashes [V, SoundGuys] |
| mos9527 fork, sonyctl, BudsLink, Gadgetbridge | Various | Partial coverage, mixed platforms [V] |

Competitor feature claims come from news articles, not hands-on testing. Test them before positioning.

### Where this project can be better

1. One maintained codebase for all three OSes, in Python, easy for contributors.
2. XM4-first reliability: the XM4 is the awkward model competitors handle poorly.
3. Tray or menu-bar battery and quick controls.
4. A CLI and scripting hooks (hotkeys, automation, per-app profiles).
5. Capability-driven design, so each model exposes only what it supports, plus per-device profiles for people who own several.
6. Test-first with a mock headphone, so it works and stays working without hardware.
7. Auditable and private: no telemetry, no network access.

## 4. Users and stories

Primary persona: a desktop user (developer, gamer, remote worker) with Sony WH-1000XM-series headphones on a PC or Mac.

- As a user, I can switch noise cancelling / ambient mode from my computer, without the phone.
- As a user, I can see battery level in the system tray or menu bar.
- As a user, I can change EQ preset or bands and have it stored on the headphones (where the model supports it).
- As a user with multiple Sony devices, I can pick the connected one and see only its supported settings.
- As a power user, I can control the headphones from a command line or a hotkey.
- As a contributor, I can run all tests and the full UI against a fake headphone.

## 5. Scope

### Goals (v1)

- Connect to a paired headphone over Bluetooth Classic RFCOMM on Windows, Linux and macOS.
- Read: battery, current ANC/ambient mode, model and firmware info [?].
- Control: ANC/ambient mode and ambient level, plus voice passthrough where supported.
- System tray / menu-bar app with battery and quick mode switch.
- CLI with the same operations.
- Mock device and a recorded-capture replay harness.

### Later (v1.x)

- EQ presets and custom bands (full support depends on model and protocol generation).
- Speak-to-Chat, DSEE, touch and button settings, auto power-off, wear detection.
- Multipoint device switching.
- Support for the owner's two other models.

### Non-goals

- Firmware update or flashing (bricking risk, and updates only run through the phone app [V]).
- LDAC, codec selection and audio routing (OS-level, not controllable over RFCOMM; macOS limits to AAC [V]).
- Head tracking, 360 Reality Audio, find-my-device, streaming-service features (need phone sensors or cloud).
- Any telemetry, cloud features or accounts.
- Using Sony logos, fonts or trade dress.

## 6. Technical overview

### Protocol (needs verification)

- Sony's control protocol runs over a Bluetooth RFCOMM service, found through SDP. A UUID of `96CC203E-5068-46AD-B32D-E316F5E069BA` is reported by two research files [V, from the AndreasOlofsson/mdr-protocol repo]. Newer devices may use a different one [?].
- Frame format reported: start `0x3E`, end `0x3C`, escape `0x3D`, data type, sequence id, 4-byte big-endian length, payload, 1-byte sum checksum [V per mdr-protocol]. My earlier scaffold used the same layout and its escaping rule is unconfirmed.
- Protocol generations: **v1** (WH-1000XM2/3/4, WH-XB900N) is reported as ANC-only in newer apps; **v2** (XM5/XM6, WF-1000XM4/5, LinkBuds S and others) adds EQ and precise battery [V, secondary sources]. The XM4 is described as partly v1/v2-like by the community [V]. So **EQ and multipoint on the XM4 are unconfirmed** and are the first thing real captures must settle.

### Architecture (recommended by research 04, not yet validated)

- Sans-I/O protocol core: pure Python framing and command encode/decode, no sockets.
- `Transport` interface with one backend per OS:
  - Windows: stdlib `socket` RFCOMM (Python 3.9+), pyserial over the paired COM port as fallback.
  - Linux: stdlib `socket` RFCOMM, or BlueZ `Profile1` via D-Bus.
  - macOS: `pyobjc` IOBluetooth (RFCOMM channel, main run loop), Swift helper as fallback.
- Device layer: capability sets per model and protocol version.
- Engine: one I/O thread feeding an asyncio loop, with an ack and retry state machine.
- UI: PySide6 (LGPL) with tray support. CLI built on the same device API.
- Packaging: PyInstaller per OS, built in GitHub Actions. Signing and notarization when affordable.

### Testing

- Fake headphone: a scripted state machine per model, used by unit tests, UI development and CI.
- Capture replay: record sessions from the real XM4 and the other two models, then replay as fixtures.
- Opt-in hardware tests, never run in CI.
- CI matrix on Windows, macOS and Linux for everything except hardware.

## 7. Requirements

### Functional

| ID | Requirement | Priority |
|---|---|---|
| F1 | Discover paired Sony devices and let the user select one | Must |
| F2 | Connect, handshake and detect model and capabilities | Must |
| F3 | Show battery level, refreshed on change | Must |
| F4 | Get and set ANC / ambient mode and level | Must |
| F5 | Tray / menu-bar icon with battery and quick mode switch | Should |
| F6 | CLI equivalents for F1-F4 | Should |
| F7 | EQ presets and custom bands, with safe limits | Could |
| F8 | Multipoint device list and switching | Could |
| F9 | Reconnect automatically after sleep, range loss or power cycle | Should |
| F10 | Per-model feature gating from capability data | Must |

### Non-functional

- Never send unvalidated or invented commands to the device. Commands come from a reviewed table only.
- Cap EQ gains and any volume-related command to safe ranges.
- Idle CPU use near zero; app starts to tray in under 2 seconds.
- No network calls. No telemetry.
- Clear error messages for pairing, permission and "headphones connected to another device" cases.
- macOS Bluetooth permission handling and a clear first-run explanation.

## 8. Legal and naming (not legal advice)

- Interoperability exceptions exist, such as DMCA section 1201(f) in the US and Article 6 of the EU Software Directive [V in research 05]. Sony's app EULA probably prohibits reverse engineering [?], and the EULA text was not found. Using clean-room notes from public sources and our own captures lowers the risk.
- Trademark: the repository name starts with "sony". Consider renaming to a descriptive name that is not dominated by Sony's mark and keep "for Sony headphones" in the tagline only. Add a clear "not affiliated with Sony" disclaimer.
- License: MIT (compatible with the reference repos Plutoberth and Fanxingkeming, both verified MIT). The `skaka` repo's license text reads as MIT but GitHub does not recognize it, so do not copy its code without reading the file.
- Do not copy code from repositories with unstated licenses (Sony Device Center states none [V]).

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| XM4 protocol coverage turns out to be ANC only | Smaller feature set than competitors | Capture and verify early. Scope v1 to what is confirmed |
| macOS RFCOMM from Python does not work well | Third OS delayed | Early spike, Swift helper fallback |
| Windows RFCOMM channel and UUID lookup is awkward | Slower Windows support | Spike, COM-port fallback |
| Malformed commands misbehave on the device | Bad device state | Reviewed command table, no free-form sends, never touch firmware |
| Competing apps already cover this | Low adoption | Focus on XM4 reliability, tray, CLI, cross-platform, tests |
| Sony changes protocol in app or firmware updates | Breakage | Capability detection, capture-based fixtures, version notes |
| Legal or EULA challenge | Takedown risk | Rename, disclaimer, clean-room provenance, no Sony assets |
| Hearing safety | User harm | Gain and volume caps, no loud presets |

## 10. Success metrics

- Works end to end on the owner's XM4 on at least two OSes by the first milestone.
- ANC/ambient control plus battery reliable over a week of normal use, with no crashes.
- Test suite runs fully offline and in CI on three OSes.
- Other people can install it, and issues come from users on models other than the owner's.

## 11. Milestones

1. **Spikes (1-2 days each):** RFCOMM on Windows, RFCOMM on macOS, SDP discovery on Linux. Capture a real XM4 session.
2. **Protocol core and mock:** framing, handshake, battery, ANC, verified against captures.
3. **Linux and Windows transports plus CLI.**
4. **Tray UI.**
5. **macOS transport.**
6. **EQ and extras, then the other two models.**
7. **Packaging and release.**

## 12. Open questions

1. What does the real WH-1000XM4 support over the protocol: EQ, multipoint, battery details? (needs captures)
2. What are the other two Sony models? Their protocol generation changes the plan.
3. Does the XM4 use the `96CC203E-...` UUID, and does Windows expose that RFCOMM channel to Python sockets?
4. Is a distinct project name wanted, given the trademark note?
5. How do Sony Device Center and Sony Bridge behave on the XM4 in practice? (hands-on test)
6. Is the Sound Connect EULA available, and what does it say about reverse engineering?

## 13. Decisions needed from the owner

- Confirm MIT license and a rename of the project.
- Confirm v1 scope: ANC/ambient plus battery, with EQ deferred until XM4 captures show it is possible.
- Provide the other two model names.
- Decide whether to run capture sessions (needs the phone app and an HCI snoop log, or a PC capture).

## Source files

- `docs/artifacts/source/research/02-product-lineup-features.md`
- `docs/artifacts/source/research/03-official-apis-and-standards.md`
- `docs/artifacts/source/research/04-python-stack-options.md`
- `docs/artifacts/source/research/05-users-competitors-legal.md`
