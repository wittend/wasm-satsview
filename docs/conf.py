from pathlib import Path
import tomllib

project = "wasm-satsview"
author = "Dave Witten"
copyright = "2026, Dave Witten"
release = tomllib.loads((Path(__file__).parents[1] / "Cargo.toml").read_text())["package"]["version"]
version = release
extensions = ["myst_parser"]
html_theme = "sphinx_rtd_theme"
exclude_patterns = ["_build"]
html_title = f"{project} {release}"
