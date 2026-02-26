# Portal

PWA for opening intercom gates with one tap. Save your gates (phone number + DTMF code), tap the button, done.

## How it works

Each gate stores a phone number and a DTMF code. Two interaction modes:

- **Single tap** — calls the intercom via `tel:` URL with embedded DTMF pause digits. The Phone app opens, dials, and sends the code automatically.
- **Double tap** — plays DTMF tones through the speaker via Web Audio API. Use this when you're already on a call with the intercom (speakerphone mode): the tones are picked up by the microphone.

## Setup

Add to home screen on iOS Safari for a full-screen PWA experience. No server, no build step — just static files.

To add a gate, tap the `+` button and fill in:
- **Name** — label displayed on the button
- **Phone** — intercom phone number
- **DTMF code** — digits to send (0-9, *, #)

## Tech stack

Vanilla JS, no dependencies. Service worker for offline use.

```
index.html   — single page
app.js       — gate CRUD + tel: dialing + DTMF audio engine
style.css    — dark theme, 3D push buttons
sw.js        — cache-first service worker
manifest.json — PWA manifest
```

## DTMF audio mode

The double-tap mode uses the Web Audio API to generate dual-tone multi-frequency signals per ITU-T Q.23:

| | 1209 Hz | 1336 Hz | 1477 Hz |
|---|---|---|---|
| **697 Hz** | 1 | 2 | 3 |
| **770 Hz** | 4 | 5 | 6 |
| **852 Hz** | 7 | 8 | 9 |
| **941 Hz** | * | 0 | # |

Each tone is 150ms with a 100ms gap. Two sine oscillators are summed for each digit.

This works today but requires speakerphone — the tones travel acoustically from speaker to microphone.

## Future: native iOS app with direct audio injection

iOS 26 introduced [`AVAudioSession.MicrophoneInjectionMode`](https://developer.apple.com/documentation/avfaudio/avaudiosession/microphoneinjectionmode) and [`requestMicrophoneInjectionPermission`](https://developer.apple.com/documentation/avfaudio/avaudioapplication/requestmicrophoneinjectionpermission(completionhandler:)), which allow an app to inject audio directly into the microphone stream of an active call.

A native iOS app could:
1. Detect an active call via `CXCallObserver` (CallKit)
2. If no call → dial via `tel:` as today
3. If call in progress → inject DTMF tones directly into the call's audio input via `MicrophoneInjectionMode`

This would eliminate the need for speakerphone entirely — the intercom receives the DTMF signal as if it came from the microphone, silently and reliably.

| Approach | Speakerphone required | Available |
|---|---|---|
| PWA + Web Audio (current) | Yes | Now |
| Native iOS + speaker | Yes | Always |
| Native iOS + MicrophoneInjectionMode | **No** | iOS 26+ |
