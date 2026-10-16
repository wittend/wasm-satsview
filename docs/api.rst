JavaScript and TypeScript API
=============================

Import from ``dist/index.js`` after building. A minimal example:

.. code-block:: javascript

   import { loadRenderer, SkyView } from './dist/index.js';
   const renderer = await loadRenderer();
   const sky = new SkyView(document.querySelector('#sky'), renderer);
   sky.update({ fix: '3d', satellites: [
     { id: '12', constellation: 'Galileo', azimuth: 70, elevation: 42,
       cn0: 39, used: true, signal: 'E1' }
   ] });
   sky.setOptions({ showLock: false });
   // sky.destroy() when unmounting

``loadRenderer(url?)``
----------------------

Returns a Promise of an isolated WASM renderer. The optional URL points to the
WASM asset; by default it resolves beside the JS module. Fetch or instantiation
errors reject the promise. The renderer has a synchronous ``render(frame,
options)`` method returning SVG. Normal callers use ``SkyView``. A custom renderer
supplied to SkyView is trusted code; its SVG is inserted into the DOM.

``SkyView(host, renderer, options?)``
-------------------------------------

Creates an independent control inside an existing HTMLElement. The view fills
the host's width using an SVG viewBox, with no resize listener required. Give the
host a useful width. Multiple views may share a renderer because calls are
synchronous. Defaults are exported as the immutable ``defaultOptions`` object.

``update(frame)`` replaces the entire frame and validates it in WASM. Bad frames
throw TypeError and preserve the preceding view. Updates are copied so subsequent
caller mutation cannot alter hover details. The frame has ``satellites`` and an
optional ``fix`` (unknown, none, 2d, 3d; absent means unknown). A signal includes:

.. list-table:: Satellite fields
   :header-rows: 1
   :widths: 20 80

   * - Field
     - Meaning
   * - id
     - Nonempty string, maximum 64 UTF-8 bytes; PRN or constellation-local SV ID.
   * - constellation
     - Nonempty string, maximum 64 UTF-8 bytes; known names select outline colors.
   * - azimuth
     - Finite degrees clockwise from true north, 0 inclusive to 360 exclusive.
   * - elevation
     - Finite degrees from -90 to 90 inclusive. Negative signals are not plotted.
   * - cn0
     - Optional number/null, 0 to 100 dB-Hz. Omitted/null means unknown.
   * - used
     - Optional boolean, default false; used in the receiver's position solution.
   * - signal
     - Optional string, maximum 64 UTF-8 bytes, e.g. E1 or L1.

There is a limit of 512 signal records and 1 MiB encoded input per render. Unknown
frame/satellite metadata is ignored. Non-JSON values (e.g. NaN) are unsupported.
A satellite observed on two frequencies may appear as two signals at the same
position. Identical positions can overlap; the table preserves all records.

``setOptions(partial)`` merges options, validates and redraws. Defaults:

.. list-table:: Options
   :header-rows: 1

   * - Name
     - Default
     - Meaning
   * - compass / grid / labels
     - true
     - Show compass labels, elevation rings, satellite IDs.
   * - signalColors / constellationColors
     - true
     - Use C/N0 fills and constellation outline colors.
   * - showLock / tooltips
     - true
     - Show lock indicator and hover/focus callouts.
   * - usedOnly
     - false
     - Omit signals not used in fix.
   * - minElevation
     - 0
     - Minimum displayed elevation, finite 0..90 degrees.
   * - rotation
     - 0
     - Bearing at the top, finite degrees clockwise from north.

``destroy()`` removes the view and event handlers. Calling it again is harmless;
updates and option changes after destruction throw. The host and its other
children remain. The core has no internal timer or transport; applications own
staleness policy and should update the lock to unknown after a receiver outage.

``GpsdAdapter(device?)``
------------------------

``ingest(object)`` accepts parsed gpsd SKY/TPV objects and returns a complete
SkyFrame, or null for unrelated messages/devices. An explicit device path filters
input. Without one, the adapter binds to the first device path received. Use one
adapter per device. ``reset()`` clears satellites and fix status while retaining
that device binding; create a new adapter to select a different device.
