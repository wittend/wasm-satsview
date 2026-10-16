# wasm-satsview contributor instructions

This repository contains a Rust/WASM GNSS sky renderer, a framework-independent
TypeScript API, and a browser demo. Keep sky projection and SVG rendering in Rust;
keep DOM interaction and receiver transport outside the rendering core.

For behavior or API changes, update the relevant docs/ source and add a concise
entry under Unreleased in CHANGES.md in the same revision. Preserve MIT licensing.
Do not put account-specific remote URLs, tokens, or real receiver recordings in
this public project. Public hosting setup is documented in docs/publishing.rst.

Use azimuth clockwise from true north, elevation above the horizon, and C/N0 in
dB-Hz. Preserve missing signal strength as unknown, distinguish zero from missing,
and never infer position lock from satellite count. Default orientation is north-up.

Before finishing runtime changes, run npm run build, npm test, npm run check,
and npm run test:browser (Chromium required). Run the Sphinx build with warnings
as errors after documentation changes. The commands are in README.md. Include
Cargo.lock and package-lock.json when dependencies change. Generated dist/,
target/, docs/_build/, .venv/, and test-results/ must remain untracked.
