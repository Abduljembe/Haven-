# Haven: Couple & Friends Private Sanctuary - Complete Feature & Functionality Outline

---

## 1. Executive Summary & Overview
**Haven** is a production-grade, end-to-end encrypted private sanctuary web application designed for couples and close friend squads. It combines real-time messaging, synchronized watch party cinema, high-definition audio and video calling, interactive games, and shared memories into a secure, elegant WhatsApp-inspired experience.

---

## 2. Core Architecture & Security
- **End-to-End Encryption (E2EE)**: AES-GCM client-side message encryption ensures complete data privacy across sessions.
- **WebSocket Real-Time Sync**: Socket.io powered instant message delivery, live typing indicators, online presence status, and synchronized media playback.
- **Offline Message Queueing & Sync**: Automatically queues messages locally in `localStorage` when offline and seamlessly flushes/syncs them when reconnected.
- **Vercel & AI Studio Static/Full-Stack Support**: Robust client-side localStorage authentication and stream fallbacks for seamless deployment across Vercel and preview runners.

---

## 3. Detailed Feature Breakdown

### A. Communication & Messaging
- **WhatsApp-Inspired Layout**: Clean dual-pane interface with chat history, search bar, unread badges, and status stories.
- **Rich Media Sharing**: Send photos, videos, voice notes, and encrypted files.
- **Safe Avatar Fallbacks**: Graceful WhatsApp-style initials badges and user silhouette avatars for missing or broken image links.
- **Message Management**: Reply, edit, delete (for me / for everyone), and highlight messages.
- **Audio & Video Calling**: WebRTC-powered peer-to-peer HD calling with global STUN/TURN relays, noise suppression, echo cancellation, screen sharing, floating PiP windows, and live network quality diagnostics.

### B. Watch Party Cinema & Entertainment
- **Synced Movie Streaming**: Watch movies and TV series together with real-time playback synchronization (play, pause, seek, and auto-sync).
- **Official Viduki API Integration**: Supports multi-server cinema streaming (APIs 1 through 4) with automatic fallback switching on 404 errors and watch progress persistence (`vidukinet-Progress`).
- **Native Archive Movies & YouTube Support**: Curated classic romance comedies (*His Girl Friday*, *Charade*, etc.) and direct YouTube embeds playing natively inside the app media player.

### C. Couple Games & Interactive Lounge
- **Couple Games & Sparkle Challenges**: Connect Hearts, Deep Questions, Truth or Dare, Chess, and Tic-Tac-Toe with turn indicators and intimacy sparks.
- **Shared Bonsai Tree & Memory Vault**: Grow a shared bonsai tree and store polaroid memories.
- **Music Lounge**: Synchronized background ambient music and soundboard play.

### D. Partner Management & Breakup Guard
- **Email-Based Connections**: Easy partner pairing via email invites, QR code generation, and direct invite links.
- **Permanent Breakup & Deletion Guard**: Secure mutual-consent permanent deletion process featuring a **"Breakup 💔"** reason selector and an instant **"💖 Add Another Partner"** workflow.
- **Registered Members Directory**: Browse all registered members on Haven with 1-click messaging.

---

## 4. Technical Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Real-Time Backend**: Node.js, Express, Socket.io, WebSockets.
- **Media & WebRTC**: Native RTCPeerConnection, MediaStream, Web Audio API, YouTube IFrame API.
- **Storage**: localStorage persistence for offline sync, encryption keys, and watch progress.
