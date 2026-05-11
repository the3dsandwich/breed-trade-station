# Platform Architecture

Status: decided

---

## Decision

**Breed Trade Station is a React web application wrapped in platform-specific native shells.**

The product ships as a native app on each target platform. The web app is an implementation detail — users see a proper installed application, not a browser tab. This is the same model used by VS Code, Discord, Notion, and Figma's desktop app.

---

## Target Surfaces

| Surface | Wrapper | User experience |
|---------|---------|----------------|
| Linux / Steam Deck | Tauri | Native `.AppImage` or Steam game |
| Android | Capacitor | Play Store app |
| iPhone | Browser / PWA | Pinned to home screen, full-screen |
| Web (anyone else) | None | Hosted URL |
| Windows | Tauri | Native `.exe` (future) |
| Mac | Tauri | Native `.app` (future) |

One React codebase powers all surfaces. Wrappers handle OS integration only — window management, notifications, auto-update, system tray.

---

## Usage Pattern

- **Primary**: Desktop / Steam Deck, windowed alongside other apps, mouse and keyboard, idle management style — set things up, let Puffs work, check back periodically
- **Secondary**: Mobile check-in on the go — quick glance, light interactions, not the main play surface

This is the standard idle/incremental game pattern: depth lives on desktop, mobile is the dashboard.

---

## Why Tauri over Electron for desktop

Both wrap a web app in a native window. The difference:

| | Tauri | Electron |
|--|-------|---------|
| Bundles own browser | No — uses system webview | Yes — ships Chromium |
| Binary size | Small (few MB) | Large (100MB+) |
| Memory usage | Lower | Higher |
| Backend language | Rust | Node.js |
| Maturity | Newer, stable v2 | Very mature |
| React compatibility | Full | Full |

For an idle game running in a side window, Electron's memory overhead is not a dealbreaker — but Tauri is the better default. The Rust backend is only touched when native OS features are needed (notifications, file system, system tray). Game logic and UI are entirely in React and never interact with Rust directly.

---

## Why not native-first (React Native / Flutter)

| | Web + Tauri/Capacitor | React Native | Flutter |
|--|----------------------|-------------|---------|
| Uses existing React skills | Yes, directly | Partially | No |
| Steam Deck / Linux desktop | Natural | Awkward | Awkward |
| iPhone without Apple dev account | PWA works | Requires account | Requires account |
| Android Play Store | Via Capacitor | Native | Native |
| Time to first playable | Fast | Slower | Slower |
| One codebase for all surfaces | Yes | No (separate desktop story) | Partial |

React Native and Flutter are strong for mobile-first products. This game is desktop-primary with mobile check-ins — the web + wrapper model fits that shape better and leverages existing React skills directly.

---

## Why not PWA-only

PWA was considered and rejected as the primary framing. The game will be presented and distributed as a native application on each platform — not as a website. The underlying technology being web-based is an implementation detail, not a user-facing property.

PWA mechanics (home screen install, offline support, push notifications) are still used on iPhone as the distribution mechanism, since App Store distribution requires an Apple developer account the developer does not currently have.

---

## Android Distribution

Developer has an existing Google Play developer account. Android distribution via Capacitor wrapping the React app into an APK. This is a future step — not needed for initial development.

---

## Server

A backend server is required for persistence, the market system, and eventual multiplayer. Server language and framework are deferred — this document covers platform and client architecture only. The client communicates with the server over standard HTTP/WebSocket regardless of which surface it runs on.

---

## Deferred

- Server language and framework
- State management library choice (React side)
- Game loop approach (canvas, DOM, or game framework)
- Asset pipeline and sprite format
- Steam distribution specifics
- Windows and Mac builds (future platforms)
- Apple developer account and App Store distribution (future)
