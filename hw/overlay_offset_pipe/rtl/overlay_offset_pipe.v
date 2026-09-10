// Elastic pipeline: adjusted = sat(measured + correction), latency PIPE_STAGES.
// Ready bubbles backward so a full pipe + !out_ready stalls in_ready without
// dropping a valid beat. sat_flag is qualified by out_valid.
module overlay_offset_pipe #(
  parameter DATA_W      = 16,
  parameter PIPE_STAGES = 2
) (
  input  wire                     clk,
  input  wire                     rst_n,
  input  wire signed [DATA_W-1:0] correction,
  input  wire signed [DATA_W-1:0] measured,
  input  wire                     in_valid,
  input  wire                     out_ready,
  output wire signed [DATA_W-1:0] adjusted,
  output wire                     out_valid,
  output wire                     in_ready,
  output wire                     sat_flag
);
  generate
    if ((PIPE_STAGES < 1) || (PIPE_STAGES > 4)) begin : gen_illegal
      illegal_PIPE_STAGES_must_be_1_to_4 u_illegal();
    end
  endgenerate

  wire signed [DATA_W:0]   sum;
  wire                     ovf;
  wire signed [DATA_W-1:0] sat_val;

  assign sum = {measured[DATA_W-1], measured} + {correction[DATA_W-1], correction};
  // Top two bits of the wide sum differ iff the DATA_W result does not fit.
  assign ovf = (sum[DATA_W] != sum[DATA_W-1]);
  assign sat_val = ovf
      ? {sum[DATA_W], {(DATA_W-1){~sum[DATA_W]}}}
      : sum[DATA_W-1:0];

  wire                    rdy   [0:PIPE_STAGES-1];
  reg                     vld_q [0:PIPE_STAGES-1];
  reg                     sat_q [0:PIPE_STAGES-1];
  reg signed [DATA_W-1:0] adj_q [0:PIPE_STAGES-1];

  assign rdy[PIPE_STAGES-1] = ~vld_q[PIPE_STAGES-1] | out_ready;

  generate
    genvar gi;
    if (PIPE_STAGES > 1) begin : gen_rdy
      for (gi = 0; gi < PIPE_STAGES - 1; gi = gi + 1) begin : hop
        assign rdy[gi] = ~vld_q[gi] | rdy[gi+1];
      end
    end
  endgenerate

  assign in_ready  = rdy[0];
  assign out_valid = vld_q[PIPE_STAGES-1];
  assign adjusted  = adj_q[PIPE_STAGES-1];
  assign sat_flag  = out_valid & sat_q[PIPE_STAGES-1];

  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      vld_q[0] <= 1'b0;
      sat_q[0] <= 1'b0;
      adj_q[0] <= {DATA_W{1'b0}};
    end else if (rdy[0]) begin
      vld_q[0] <= in_valid;
      if (in_valid) begin
        sat_q[0] <= ovf;
        adj_q[0] <= sat_val;
      end
    end
  end

  generate
    genvar gk;
    for (gk = 1; gk < PIPE_STAGES; gk = gk + 1) begin : gen_st
      always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
          vld_q[gk] <= 1'b0;
          sat_q[gk] <= 1'b0;
          adj_q[gk] <= {DATA_W{1'b0}};
        end else if (rdy[gk]) begin
          vld_q[gk] <= vld_q[gk-1];
          if (vld_q[gk-1]) begin
            sat_q[gk] <= sat_q[gk-1];
            adj_q[gk] <= adj_q[gk-1];
          end
        end
      end
    end
  endgenerate
endmodule
