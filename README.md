<<<<<<< HEAD
# gtmko2026

# ASML Plugin Marketplace
- [asml-plugin-marketplace](https://github.com/damien-xai/asml-plugin-marketplace)
=======
# Scanner imaging demo (Grok Imagine)

Load a mocked Cursor Origin pull request, inspect its RTL diff and CI-generated
layout artifact, then render what the scanner prints with
`grok-imagine-image-2.0`.

Built for an ASML audience: the knobs are scanner settings (system, illumination, dose, focus), not fab process settings.

## Origin mock workflow

The first screen contains three local PR fixtures. Each PR has mocked review
metadata, source diffs, checks, and a deterministic GDS or layout-recipe
payload. Loading a PR follows this demo path:

`RTL change → mocked synthesis/place-and-route → layout artifact → scanner simulation`

No live Origin account, repository, auth, synthesis, or place-and-route service
is used. The TinyTapeout PR loads the authentic SKY130 crop; the other PRs load
clearly labeled synthetic 5 nm layouts.

## What is computed vs generated

The numbers are real first-order optics, recomputed on every edit:

- `k₁ = half-pitch · NA / λ`, with 0.25 as the hard single-exposure limit
- Rayleigh resolution `k₁ · λ / NA` per illumination pupil
- Depth of focus `k₂ · λ / NA²`
- Absorbed photon density, which is why EUV shows stochastic defectivity and ArF does not

These are Rayleigh scaling estimates, not a Hopkins/Abbe imaging simulation or ILT.

The wafer image is generative. It is driven by those numbers, but it is an illustration, not a printability result. Do not treat a PNG as a process window.

## Scanners

| System | Platform | λ | NA |
| --- | --- | --- | --- |
| PAS 5500/750E | KrF DUV | 248 nm | 0.70 |
| TWINSCAN NXE:3800E | EUV | 13.5 nm | 0.33 |
| TWINSCAN EXE:5200 | High-NA EUV | 13.5 nm | 0.55 |
| TWINSCAN NXT:2100i | ArF immersion | 193 nm | 1.35 |

The synthetic 25 nm gate half-pitch resolves on EUV and falls below the k₁ = 0.25 limit on ArF immersion, which is the demo's sharpest scanner comparison.

## Layout recipe

`row` places abutted standard cells; each poly gate crossing a diffusion band is one transistor.

```
node 5nm
row id=r0 y=0 cells=inv,nand2,nor2,inv,dff
opc serifs=on hammerheads=off
```

Library: `inv`, `buf`, `nand2`, `nor2`, `aoi21`, `mux2`, `dff`. `line` and `via` still place hand-drawn features.

## Authentic TinyTapeout example

The `TinyTapeout SKY130` preset is a mechanically extracted 30 × 13 µm crop of
the `spm` cell from the sample GDS bundled with
[`TinyTapeout/tinytapeout_gds_viewer`](https://github.com/TinyTapeout/tinytapeout_gds_viewer).
It contains 1,783 polygons across eleven device and routing layers and 29
placed logic-cell instances. It starts on the ASML PAS 5500/750E, a 248 nm,
0.70 NA KrF scanner introduced for 130 nm production.

The data is Apache-2.0 licensed. Exact provenance and extraction details are in
[`third_party/tinytapeout_gds_viewer/NOTICE.md`](third_party/tinytapeout_gds_viewer/NOTICE.md);
the extractor is [`scripts/extract_tinytapeout_gds.py`](scripts/extract_tinytapeout_gds.py).

## Setup

```bash
cp .env.example .env.local   # then set XAI_API_KEY
npm run dev
npm test
```

Quality `low` is the default (~$0.04/image); `medium` is slower and finer.
>>>>>>> 59984c1 (Initial commit)
