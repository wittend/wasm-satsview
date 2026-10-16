Architecture and development
============================

``src/lib.rs`` owns projection, validation, colors and SVG generation. It uses an
equidistant polar projection: r = R * (90 - elevation) / 90; x = cx + r sin(azimuth
- rotation), y = cy - r cos(azimuth - rotation). Compass labels use the same angle
convention and a radius outside the sky. SVG text is escaped before interpolation.

``web/index.ts`` loads the WASM binary, transfers JSON over a small synchronous
allocation ABI, and mounts SVG. Every allocation is freed in a finally block,
including failed input validation. Rust's alloc/dealloc/render_json exports are
internal implementation details: arbitrary pointers or double frees are unsafe.
Use the supported TypeScript wrapper. This avoids a separate wasm-bindgen CLI.

``web/gpsd.ts`` adapts receiver messages. ``demo/`` owns its simulation, input
transports, controls, table, connection lifetime and stale-data policy. The
reusable control does not own receiver transports. Files in ``dist/`` are generated
and excluded from Git.

Validation
----------

``npm run build`` builds the actual WASM binary and typed browser modules.
``npm test`` covers projection, rendering, escaping, invalid data, filtering,
colors, gpsd mapping, and the compiled WASM ABI. ``npm run test:browser`` runs
Chromium against the local harness for rendering, controls, keyboard/hover,
JSON input, WebSocket data and lock state. Install Chromium once with
``npx playwright install chromium``. ``npm run check`` runs Rust formatting,
Clippy and TypeScript checks. Sphinx builds with warnings treated as errors.

Documentation policy
--------------------

Update docs alongside behavior changes. Add a CHANGES.md Unreleased entry for
user-visible changes. Pull-request CI checks for both when runtime source changes.
Documentation is version-controlled with the code; Sphinx derives the version
from Cargo.toml and includes the root changelog rather than a duplicate copy.
See CONTRIBUTING.md for the release procedure.
