Getting started
===============

Install Rust via rustup and Node.js 22+. From the project root::

   npm ci
   npm run dev

Open http://127.0.0.1:5173. The local server binds to loopback. The demo is
explicitly marked as simulated and begins with 24 signals. Pause the simulation
to inspect a stationary frame. Reset demo restores synthetic data; display options
remain as configured. Changing the lock dropdown affects simulation or manually
loaded snapshots, not a live bridge.

Display controls
----------------

Enable or disable compass labels, elevation rings, IDs, signal colors,
constellation outlines, callouts and the lock LED. Filter by minimum elevation or
signals used in the fix. Rotate the bearing at the top to east, south, or west;
compass labels rotate consistently with the satellites.

The circle rim represents zero elevation and the center represents 90 degrees.
Elevation rings are at 30 and 60 degrees. Fill color represents C/N0: red below
20 dB-Hz, amber from 20 to below 35, green at 35 and above, gray if unknown. These
are illustrative bands, not a universal receiver-quality threshold.

Outlines identify GPS, GLONASS, Galileo, BeiDou, QZSS, SBAS, and NavIC. Unknown
constellations receive a neutral outline. Dashed outlines indicate signals not
used in the fix. Hover or tab to a marker to inspect its parameters; Escape
hides the callout. The table provides a second, textual view of every received
signal, including signals omitted by the plot filters.

The LED reports 2D/3D position lock in green, no lock in red, and unknown in gray.
A position lock does not imply accuracy or integrity. The harness marks the
lock unknown when a bridge disconnects or produces no valid update for 10 seconds.

Build output
------------

``npm run build`` writes the WASM binary, JS modules and TypeScript declarations
to ``dist/``. Copy the entire directory to your HTTP-served application. There is
no runtime framework requirement. ``npm run dev`` builds once; restart after edits.
