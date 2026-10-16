Receiver integration
====================

Transport is separate from the view. A receiver driver, Web Serial application,
WebSocket bridge or other data source can call ``SkyView.update`` with normalized
snapshots. Native NMEA/UBX decoding, USB access, and direct gpsd TCP connectivity
are not part of this first version.

WebSocket contract
------------------

The harness opens the explicitly entered ws:// or wss:// URL. The bridge should
start sending text messages on connection, without requiring a subscription
message from this client. Each message contains a complete JSON object, or
multiple complete newline-separated objects. Binary messages, split JSON objects
across messages, and messages over 1 MiB are rejected. Use one receiver per
connection. A minimal normalized message:

.. code-block:: json

   {"fix":"3d","satellites":[
     {"id":"8","constellation":"GPS","azimuth":120,"elevation":50,
      "cn0":42,"used":true,"signal":"L1"}
   ]}

Alternatively, a gpsd-aware bridge can forward SKY and TPV JSON. The browser does
not speak gpsd's TCP protocol. The bridge owns gpsd connection, WATCH negotiation,
authentication, and protocol-version compatibility. Consult the official
`gpsd JSON specification <https://gpsd.gitlab.io/gpsd/gpsd_json.html>`_.

.. code-block:: javascript

   import { GpsdAdapter } from './dist/index.js';
   const adapter = new GpsdAdapter('/dev/ttyACM0');
   // In your transport's message callback:
   const frame = adapter.ingest(parsedMessage);
   if (frame) sky.update(frame);

TPV mode 0/1/2/3 maps to unknown/none/2d/3d. SKY never implies lock. ``gnssid``
selects constellation, ``svid`` (or fallback PRN) becomes ID, ``sigid`` becomes
signal, ``ss`` becomes C/N0 and ``used`` becomes usage. Missing/invalid angles
omit the record; missing/invalid C/N0 becomes unknown. GPSD zero ss remains zero.
Legacy PRNs without gnssid are not guessed into constellations. IMES and unknown
GNSS IDs use the neutral Unknown constellation.

A SKY message replaces the signal list; a TPV message retains that list and
updates the fix. To clear a list explicitly, send an empty satellites array.
IDs are constellation-local: identify a signal with constellation + ID + signal,
not ID alone. Multiple signals for one satellite may overlap on the sky plot.

Disconnects and stale data
--------------------------

The harness stops simulation before accepting live or pasted data. On disconnect
it retains the last sky snapshot and changes fix to unknown. Ten seconds without
a valid frame also marks the lock unknown and resets adapter state. It does not
automatically reconnect. Reconnect or Reset demo to proceed. Production clients
should choose a timeout appropriate for their receiver's reporting rate and
handle SKY and TPV freshness separately if their bridge can stall one stream.
Use wss:// when serving the harness over HTTPS. Keep the bridge access controlled;
the demo stores no credentials and does not transmit receiver data elsewhere.
