import type { ExampleId } from "@/lib/layout/examples";
import type { LithoParams } from "@/lib/layout/types";

export type MockDiffFile = {
  path: string;
  language: "systemverilog" | "tcl";
  additions: number;
  deletions: number;
  patch: string;
};

export type MockGdsArtifact = {
  filename: string;
  buildId: string;
  process: string;
  generator: string;
  polygonCount: number;
  layerCount: number;
};

export type MockOriginPr = {
  id: string;
  number: number;
  title: string;
  repository: string;
  author: string;
  authorInitials: string;
  branch: string;
  baseBranch: string;
  updated: string;
  status: "ready" | "draft";
  summary: string;
  ticketId: string;
  checks: {
    passed: number;
    total: number;
  };
  files: MockDiffFile[];
  artifact: MockGdsArtifact;
  rtlAnalysis?: {
    fixtureId: string;
    expectedOutcome: "pass" | "fail";
  };
  simulation: {
    exampleId: ExampleId;
    expectedOutcome: "nominal" | "defective";
    recipe?: string;
    params?: Partial<LithoParams>;
  };
};

const MAC_ARRAY_RECIPE = `# Mock GDS extracted from CI place-and-route
node 5nm
row id=r0 y=0 cells=dff,mux2,nand2,aoi21,dff,buf
row id=r1 y=210 cells=nand2,nor2,mux2,inv,dff,nand2
row id=r2 y=420 cells=dff,aoi21,nand2,mux2,nor2,buf
row id=r3 y=630 cells=inv,nand2,dff,aoi21,mux2,dff
opc serifs=on hammerheads=on
`;

const SCAN_FANOUT_RECIPE = `# Mock GDS extracted from CI place-and-route
node 5nm
row id=r0 y=0 cells=buf,buf,dff,dff,nand2,inv
row id=r1 y=210 cells=dff,mux2,buf,nor2,dff,buf
row id=r2 y=420 cells=inv,nand2,dff,buf,mux2,inv
opc serifs=on hammerheads=off
`;

export const MOCK_ORIGIN_PRS: MockOriginPr[] = [
  {
    id: "pr-184",
    number: 184,
    title: "Pipeline the serial-parallel multiplier",
    repository: "asml-labs/litho-accelerator",
    author: "Maya Chen",
    authorInitials: "MC",
    branch: "maya/pipeline-spm",
    baseBranch: "main",
    updated: "12 min ago",
    status: "ready",
    summary:
      "Adds a registered accumulation stage to improve timing, but the hold behavior now fails when enable is low.",
    ticketId: "ticket-4821",
    checks: { passed: 5, total: 6 },
    files: [
      {
        path: "src/spm.sv",
        language: "systemverilog",
        additions: 7,
        deletions: 2,
        patch: `@@ -18,9 +18,14 @@ module spm (
   logic [15:0] partial_sum;
+  logic [15:0] next_sum;
 
-  assign partial_sum = accumulator + shifted_operand;
+  always_comb begin
+    next_sum = accumulator + shifted_operand;
+  end
+
   always_ff @(posedge clk) begin
-    if (enable) accumulator <= partial_sum;
+    if (reset) accumulator <= '0;
+    else accumulator <= next_sum;
   end
 endmodule`,
      },
    ],
    artifact: {
      filename: "spm_pr184.gds",
      buildId: "pnr-8f31a2",
      process: "SKY130",
      generator: "Mock Yosys + OpenROAD",
      polygonCount: 1783,
      layerCount: 11,
    },
    rtlAnalysis: {
      fixtureId: "rtl-pr-184-v1",
      expectedOutcome: "fail",
    },
    simulation: {
      exampleId: "tinytapeout-sky130",
      expectedOutcome: "nominal",
    },
  },
  {
    id: "pr-179",
    number: 179,
    title: "Add a second MAC lane to the edge filter",
    repository: "asml-labs/litho-accelerator",
    author: "Jon Bell",
    authorInitials: "JB",
    branch: "jon/dual-mac-lane",
    baseBranch: "main",
    updated: "43 min ago",
    status: "ready",
    summary:
      "Duplicates the multiply-accumulate datapath and balances the output register stage.",
    ticketId: "ticket-4796",
    checks: { passed: 6, total: 6 },
    files: [
      {
        path: "rtl/edge_filter.sv",
        language: "systemverilog",
        additions: 9,
        deletions: 3,
        patch: `@@ -31,8 +31,14 @@ module edge_filter (
-  logic signed [15:0] mac_result;
+  logic signed [15:0] mac_result_a;
+  logic signed [15:0] mac_result_b;
 
-  mac_lane lane(.sample(sample), .weight(weight), .result(mac_result));
+  mac_lane lane_a(
+    .sample(sample_a), .weight(weight_a), .result(mac_result_a)
+  );
+  mac_lane lane_b(
+    .sample(sample_b), .weight(weight_b), .result(mac_result_b)
+  );
 
-  assign filtered = mac_result;
+  assign filtered = mac_result_a + mac_result_b;
 endmodule`,
      },
      {
        path: "constraints/floorplan.tcl",
        language: "tcl",
        additions: 2,
        deletions: 1,
        patch: `@@ -6,4 +6,5 @@
-set CORE_UTILIZATION 45
+set CORE_UTILIZATION 52
+set PLACE_DENSITY 0.58
 set ASPECT_RATIO 1.0`,
      },
    ],
    artifact: {
      filename: "edge_filter_pr179.gds",
      buildId: "pnr-d20c74",
      process: "5 nm demo PDK",
      generator: "Mock synthesis + place-and-route",
      polygonCount: 916,
      layerCount: 5,
    },
    simulation: {
      exampleId: "synthetic-5nm",
      expectedOutcome: "nominal",
      recipe: MAC_ARRAY_RECIPE,
      params: {
        scanner: "exe5200",
        illumination: "dipole",
        doseMJcm2: 45,
      },
    },
  },
  {
    id: "pr-172",
    number: 172,
    title: "Buffer scan-enable across the register bank",
    repository: "asml-labs/litho-accelerator",
    author: "Priya Nair",
    authorInitials: "PN",
    branch: "priya/scan-fanout",
    baseBranch: "main",
    updated: "2 hr ago",
    status: "draft",
    summary:
      "Adds a balanced scan-enable tree to reduce fanout on the control path before sign-off.",
    ticketId: "ticket-4772",
    checks: { passed: 4, total: 5 },
    files: [
      {
        path: "rtl/register_bank.sv",
        language: "systemverilog",
        additions: 7,
        deletions: 1,
        patch: `@@ -22,7 +22,12 @@ module register_bank (
   logic [7:0] q;
+  logic scan_en_lo;
+  logic scan_en_hi;
 
+  assign scan_en_lo = scan_enable;
+  assign scan_en_hi = scan_enable;
+
   always_ff @(posedge clk) begin
-    if (scan_enable) q <= scan_data;
+    if (scan_en_lo) q[3:0] <= scan_data[3:0];
+    if (scan_en_hi) q[7:4] <= scan_data[7:4];
   end
 endmodule`,
      },
    ],
    artifact: {
      filename: "register_bank_pr172.gds",
      buildId: "pnr-41ee09",
      process: "5 nm demo PDK",
      generator: "Mock synthesis + place-and-route",
      polygonCount: 704,
      layerCount: 5,
    },
    simulation: {
      exampleId: "synthetic-5nm",
      expectedOutcome: "nominal",
      recipe: SCAN_FANOUT_RECIPE,
      params: {
        scanner: "nxe3800e",
        illumination: "quadrupole",
        doseMJcm2: 42,
      },
    },
  },
];

export function getMockOriginPr(id: string): MockOriginPr | undefined {
  return MOCK_ORIGIN_PRS.find((pr) => pr.id === id);
}
