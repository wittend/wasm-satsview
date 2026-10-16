# Contributing

Use the stable Rust toolchain and Node.js 22+. Run `npm ci` and `npm run build`.
Run `npm test`, `npm run check`, `npm run test:browser`, and the Sphinx build
from README.md before submitting changes. Format Rust with `cargo fmt`.

Every behavior or public API revision must include:

1. A relevant test, when the behavior warrants one.
2. Updated `docs/` source explaining the new behavior and migration, if needed.
3. An entry under `Unreleased` in `CHANGES.md`.

GitHub pull-request CI enforces that code changes also touch `docs/` and
`CHANGES.md`. On Gitea run `node scripts/check-docs.mjs BASE_REF` locally;
all pushes still build documentation. Configure branch protection to require
passing CI before merging. Never store receiver credentials, private endpoint
URLs, or personal receiver recordings in fixtures.

To release: finalize `Unreleased` with the version/date, create a new Unreleased
section, update Cargo.toml/package.json (and lockfiles), run all checks, commit,
then tag `vX.Y.Z` and push the branch and tag to both remotes. Sphinx reads the
version from Cargo.toml and includes the root changelog, keeping them in sync.
Read the Docs can activate tagged versions in its dashboard.
