# Changes

All notable user-visible changes are recorded here. Dates use YYYY-MM-DD.
The initial development version is 0.1.0; no release has been published yet.

## Unreleased

### Added

- Harness screenshot in the README, captured with simulated GNSS signals.
- Rust/WASM sky projection and SVG rendering with north-up orientation and
  optional compass labels, grid, IDs, rotation, and elevation/use filters.
- Constellation outlines, C/N0 fills, and explicit 2D/3D/no-fix/unknown LEDs.
- Typed JavaScript/TypeScript API with snapshot updates, hover and keyboard
  inspection, validation, and control destruction.
- Responsive demo harness with simulated data, JSON snapshots, WebSocket input,
  stale lock handling, and received-signal table.
- gpsd SKY/TPV adapter with per-device selection and missing-data handling.
- MIT license, tests, Sphinx documentation, Read the Docs configuration,
  and GitHub/Gitea CI workflows.
