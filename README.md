<<<<<<< HEAD
<<<<<<< HEAD
# gtmko2026

# ASML Plugin Marketplace
- [asml-plugin-marketplace](https://github.com/damien-xai/asml-plugin-marketplace)
=======
# Scanner imaging demo (Grok Imagine)
=======
# Ticket-to-schematic and scanner demo
>>>>>>> 33a5827 (schematics)

Open a mocked hardware ticket, inspect the developer’s Verilog pull request,
replay deterministic RTL verification, and see the failing path highlighted in
a generated schematic. Grok explains that fixed evidence; PRs that pass can
continue into the scanner imaging demo.

Built for an ASML audience: the knobs are scanner settings (system, illumination, dose, focus), not fab process settings.

## Origin mock workflow

The first screen contains three local ticket fixtures linked to three PRs. The
primary path follows:

`Ticket → Verilog PR → CI replay → failing assertion → highlighted schematic → Grok diagnosis`

PR `pr-184` fails `accumulator_holds_when_disabled` and is blocked before
lithography. Its simulator trace and Yosys-style netlist are precomputed,
versioned fixtures rather than runtime EDA execution. The other PRs continue to
the existing Grok Imagine wafer flow.

The schematic highlight is deterministic: the assertion maps to stable node and
edge IDs. Grok’s language model explains those IDs and values; Grok Imagine
does not choose or draw the error location.

## Bot web services

The mocked PR workflow is available as JSON endpoints for a Grok bot or other
server-to-server client:

- `GET /api/prs` lists PR summaries and links.
- `POST /api/prs` always returns the mocked PR #184 with HTTP `201`.
- `GET /api/prs/:id` returns the full diff, artifact metadata, and recommended
  scanner settings.
- `GET /api/tickets` and `GET /api/tickets/:id` expose mocked incoming work.
- `POST /api/prs/:id/rtl/simulate` replays deterministic RTL verification.
- `POST /api/prs/:id/rtl/explain` asks Grok to explain the fixed failure
  evidence.
- `GET /api/runs/rtl-run-pr-184-001` returns the immutable saved result.
- `/runs/rtl-run-pr-184-001` is the permanent read-only browser link.
- `POST /api/prs/:id/simulate` runs Grok Imagine for that PR and returns the
  parameters, prompt, and wafer image data URL.

The simulation endpoint accepts an optional partial `params` object. Omitted
settings use the PR's recommended values:

```bash
export BASE_URL=http://localhost:3000

curl "$BASE_URL/api/prs"
curl -X POST "$BASE_URL/api/prs"
curl "$BASE_URL/api/tickets/ticket-4821"
curl -X POST "$BASE_URL/api/prs/pr-184/rtl/simulate"
curl -X POST "$BASE_URL/api/prs/pr-184/rtl/explain"
curl "$BASE_URL/api/runs/rtl-run-pr-184-001"
curl -X POST "$BASE_URL/api/prs/pr-179/simulate" \
  -H "Content-Type: application/json" \
  -d '{"params":{"scanner":"nxe3800e","doseMJcm2":48}}'
```

PR `pr-184` returns HTTP `422` with `RTL_ASSERT_FAIL` from the RTL endpoint.
Its lithography endpoint returns HTTP `409` until that failure is fixed. The
other PRs return generated wafer images.

These demo endpoints have no authentication. Add service authentication before
deploying them with non-mocked repository data.

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
