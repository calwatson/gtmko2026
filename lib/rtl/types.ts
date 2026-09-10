export type SchematicNodeKind = "input" | "operator" | "mux" | "register" | "output";

export type SchematicNode = {
  id: string;
  kind: SchematicNodeKind;
  label: string;
  detail: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SchematicEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type RtlTraceSample = {
  cycle: number;
  reset: 0 | 1;
  enable: 0 | 1;
  shiftedOperand: string;
  expectedAccumulator: string;
  actualAccumulator: string;
  status: "pass" | "fail";
};

export type RtlFailure = {
  code: "RTL_ASSERT_FAIL";
  assertionId: string;
  cycle: number;
  message: string;
  failingNodeId: string;
  expected: string;
  actual: string;
  cause: string;
};

export type RtlAnalysisFixture = {
  id: string;
  prId: string;
  topModule: string;
  sourcePath: string;
  status: "passed" | "failed";
  simulator: string;
  synthesizer: string;
  synthesizedAtRuntime: false;
  trace: RtlTraceSample[];
  log: string[];
  failure?: RtlFailure;
  schematic: {
    width: number;
    height: number;
    nodes: SchematicNode[];
    edges: SchematicEdge[];
    highlightNodeIds: string[];
    highlightEdgeIds: string[];
  };
};
