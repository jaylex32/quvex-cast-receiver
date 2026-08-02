# Quvex Cast Receiver

Production Google Cast Web Receiver for the Quvex music player.

The receiver uses Google Cast Application Framework v3 and provides Quvex-branded
now-playing UI for music, Plex, cloud tracks, and live radio. Live radio includes
bounded reconnection backoff, while an explicit sender stop always cancels recovery.

## Deployment

GitHub Actions deploys only the runtime receiver files to GitHub Pages:

- `index.html`
- `receiver.css`
- `receiver.js`
- `assets/`

The workflow deliberately excludes Android source, signing material, credentials,
and development files.

Live receiver URL:

`https://jaylex32.github.io/quvex-cast-receiver/`

Register that exact HTTPS URL as a Custom Receiver in the Google Cast SDK Developer
Console, then configure the issued application ID in the Quvex Android sender.
