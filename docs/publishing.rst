Publishing and continuous documentation
=======================================

Git repositories
----------------

Create empty public repositories named wasm-satsview on GitHub and Gitea. Add
``github`` and ``gitea`` remotes using your real account/server URLs, then push
``main`` to both. Commands are in README.md. This checkout does not create hosted
repositories, set visibility, or configure credentials. Configure each service's
branch protections and runners after upload. Keep both remotes synchronized when
pushing branches and tags.

GitHub Actions
--------------

``.github/workflows/ci.yml`` builds WASM/TypeScript, runs Rust/JS/browser tests and
checks formatting/lint. A separate job builds Sphinx for every push and pull
request, uploads the resulting HTML as a downloadable artifact, and enforces the
code/docs/changelog policy on pull requests. CI verifies and packages docs;
Read the Docs hosts the documentation site through its own integration.

Read the Docs
-------------

1. Push the public repository to GitHub.
2. Sign in to Read the Docs and connect your GitHub account/app to this repository.
3. Add the repository as a Read the Docs project. Use the root
   ``.readthedocs.yaml`` configuration and main as the default branch.
4. Check that the initial build succeeds and automatic builds are enabled.
5. In the Versions dashboard, activate release tags when you publish them.

The configuration selects Python 3.12, installs docs/requirements.txt and builds
Sphinx using docs/conf.py with warnings failing the build. GitHub integration
triggers subsequent builds on pushes; a YAML file alone cannot establish that
account connection. The final documentation URL is assigned by Read the Docs
when the project is imported and may differ if the desired slug is occupied.
See the official `project import guide
<https://docs.readthedocs.com/platform/stable/intro/add-project.html>`_ and
`configuration reference
<https://docs.readthedocs.com/platform/stable/config-file/v2.html>`_.

Gitea
-----

``.gitea/workflows/ci.yml`` supplies compatible build/test/docs checks. Enable
Actions on the Gitea repository and attach a runner with an ubuntu-latest label
and an environment capable of running Node.js actions, installing Rust, Python,
and Playwright browser dependencies. The workflow fetches actions from GitHub;
the runner needs network access. It does not deploy docs to Read the Docs.

The simplest dual-host setup builds Read the Docs from the GitHub mirror. For a
Gitea-only source, manually import the public Git URL and configure the Read the
Docs webhook on Gitea following Read the Docs' manual integration instructions.

Local documentation
-------------------

From the root::

   python3 -m venv .venv
   .venv/bin/pip install -r docs/requirements.txt
   .venv/bin/sphinx-build -W --keep-going -b html docs docs/_build/html

Open docs/_build/html/index.html. No WASM or Node build is required for Sphinx.
