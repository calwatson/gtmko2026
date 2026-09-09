# TinyTapeout GDS viewer sample

`lib/layout/tinytapeout-data.ts` contains polygon data mechanically extracted
from `public/tinytapeout.gds` in
[TinyTapeout/tinytapeout_gds_viewer](https://github.com/TinyTapeout/tinytapeout_gds_viewer)
at revision `2969b5e7b4004cc35875738ee53fa3043fd6b415`.

Changes made for this demo:

- Flattened the `spm` hierarchy.
- Cropped source coordinates `(20, 38)` through `(50, 51)` µm.
- Retained eleven SKY130 device and routing layers.
- Converted coordinates from micrometres to integer nanometres.
- Serialized the polygons as TypeScript data for SVG rendering.

The upstream work is licensed under Apache License 2.0. TinyTapeout names and
marks are used only to identify the source.
