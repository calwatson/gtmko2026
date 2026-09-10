// Self-checking bench for overlay_offset_pipe.
// Scoreboard records every accepted input and checks every accepted output.
// Covers reset, saturation, bubbles, backpressure, and simultaneous fire.
`timescale 1ns/1ps

module tb_overlay_cfg #(
  parameter DATA_W      = 16,
  parameter PIPE_STAGES = 2
);
  reg                          clk;
  reg                          rst_n;
  reg  signed [DATA_W-1:0]     correction;
  reg  signed [DATA_W-1:0]     measured;
  reg                          in_valid;
  reg                          out_ready;
  wire signed [DATA_W-1:0]     adjusted;
  wire                         out_valid;
  wire                         in_ready;
  wire                         sat_flag;

  integer errors;
  integer done;
  integer seed;

  localparam QDEPTH = 1024;
  integer                 mon_count;
  integer                 mon_wr;
  integer                 mon_rd;
  reg signed [DATA_W-1:0] mon_adj [0:QDEPTH-1];
  reg                     mon_sat [0:QDEPTH-1];

  reg prev_ov;
  reg prev_or;
  reg signed [DATA_W-1:0] prev_adj;
  reg prev_sat;

  overlay_offset_pipe #(
    .DATA_W(DATA_W),
    .PIPE_STAGES(PIPE_STAGES)
  ) dut (
    .clk(clk),
    .rst_n(rst_n),
    .correction(correction),
    .measured(measured),
    .in_valid(in_valid),
    .out_ready(out_ready),
    .adjusted(adjusted),
    .out_valid(out_valid),
    .in_ready(in_ready),
    .sat_flag(sat_flag)
  );

  initial clk = 1'b0;
  always #5 clk = ~clk;

  task fail;
    input [8*96-1:0] msg;
    begin
      $display("FAIL W%0d/S%0d: %0s", DATA_W, PIPE_STAGES, msg);
      errors = errors + 1;
    end
  endtask

  function signed [DATA_W-1:0] ref_adj;
    input signed [DATA_W-1:0] m;
    input signed [DATA_W-1:0] c;
    reg   signed [DATA_W:0]   s;
    begin
      s = {m[DATA_W-1], m} + {c[DATA_W-1], c};
      if (s[DATA_W] != s[DATA_W-1])
        ref_adj = s[DATA_W] ? {1'b1, {(DATA_W-1){1'b0}}}
                            : {1'b0, {(DATA_W-1){1'b1}}};
      else
        ref_adj = s[DATA_W-1:0];
    end
  endfunction

  function ref_sat;
    input signed [DATA_W-1:0] m;
    input signed [DATA_W-1:0] c;
    reg   signed [DATA_W:0]   s;
    begin
      s = {m[DATA_W-1], m} + {c[DATA_W-1], c};
      ref_sat = (s[DATA_W] != s[DATA_W-1]);
    end
  endfunction

  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      mon_count = 0;
      mon_wr    = 0;
      mon_rd    = 0;
    end else begin
      if (in_valid && in_ready) begin
        mon_adj[mon_wr] = ref_adj(measured, correction);
        mon_sat[mon_wr] = ref_sat(measured, correction);
        mon_wr          = (mon_wr + 1) % QDEPTH;
        mon_count       = mon_count + 1;
      end
      if (out_valid && out_ready) begin
        if (mon_count == 0) begin
          fail("output with empty monitor");
        end else begin
          if (adjusted !== mon_adj[mon_rd] || sat_flag !== mon_sat[mon_rd]) begin
            $display("FAIL W%0d/S%0d: beat adj=%0h sat=%b exp adj=%0h sat=%b",
                     DATA_W, PIPE_STAGES, adjusted, sat_flag,
                     mon_adj[mon_rd], mon_sat[mon_rd]);
            errors = errors + 1;
          end
          mon_rd    = (mon_rd + 1) % QDEPTH;
          mon_count = mon_count - 1;
        end
      end
    end
  end

  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      prev_ov  <= 1'b0;
      prev_or  <= 1'b0;
      prev_adj <= {DATA_W{1'b0}};
      prev_sat <= 1'b0;
    end else begin
      if (prev_ov && !prev_or) begin
        if (out_valid !== 1'b1)
          fail("out_valid dropped without ready");
        if (adjusted !== prev_adj)
          fail("adjusted changed under backpressure");
        if (sat_flag !== prev_sat)
          fail("sat_flag changed under backpressure");
      end
      prev_ov  <= out_valid;
      prev_or  <= out_ready;
      prev_adj <= adjusted;
      prev_sat <= sat_flag;
    end
  end

  task apply_reset;
    begin
      rst_n      = 1'b0;
      in_valid   = 1'b0;
      out_ready  = 1'b1;
      measured   = {DATA_W{1'b0}};
      correction = {DATA_W{1'b0}};
      repeat (2) @(posedge clk);
      #1;
      if (out_valid !== 1'b0)
        fail("out_valid high during reset");
      rst_n = 1'b1;
      @(posedge clk);
      #1;
      if (out_valid !== 1'b0)
        fail("out_valid high after reset release");
      if (in_ready !== 1'b1)
        fail("in_ready low on empty pipe");
    end
  endtask

  task send_beat;
    input signed [DATA_W-1:0] m;
    input signed [DATA_W-1:0] c;
    integer guard;
    begin
      @(negedge clk);
      measured   = m;
      correction = c;
      in_valid   = 1'b1;
      guard      = 0;
      @(posedge clk);
      while (in_ready !== 1'b1) begin
        @(posedge clk);
        guard = guard + 1;
        if (guard > 2000) begin
          fail("input handshake timeout");
          disable send_beat;
        end
      end
      @(negedge clk);
      in_valid = 1'b0;
    end
  endtask

  task drain;
    integer guard;
    begin
      in_valid  = 1'b0;
      out_ready = 1'b1;
      guard     = 0;
      @(negedge clk);
      while (out_valid === 1'b1 || mon_count > 0) begin
        @(negedge clk);
        guard = guard + 1;
        if (guard > 2000) begin
          fail("drain timeout");
          disable drain;
        end
      end
    end
  endtask

  task check_latency;
    input signed [DATA_W-1:0] m;
    input signed [DATA_W-1:0] c;
    integer i;
    begin
      @(negedge clk);
      out_ready  = 1'b1;
      measured   = m;
      correction = c;
      in_valid   = 1'b1;
      @(posedge clk);
      if (in_ready !== 1'b1)
        fail("empty pipe rejected first beat");
      @(negedge clk);
      in_valid = 1'b0;
      for (i = 0; i < PIPE_STAGES - 1; i = i + 1) begin
        if (out_valid !== 1'b0)
          fail("result appeared before PIPE_STAGES");
        @(posedge clk);
        @(negedge clk);
      end
      if (out_valid !== 1'b1)
        fail("result missing at PIPE_STAGES");
      if (adjusted !== ref_adj(m, c) || sat_flag !== ref_sat(m, c))
        fail("latency-path data mismatch");
    end
  endtask

  task test_directed;
    reg signed [DATA_W-1:0] maxv;
    reg signed [DATA_W-1:0] minv;
    begin
      maxv = {1'b0, {(DATA_W-1){1'b1}}};
      minv = {1'b1, {(DATA_W-1){1'b0}}};
      send_beat({DATA_W{1'b0}}, {DATA_W{1'b0}});
      send_beat(100, 20);
      send_beat(maxv, {DATA_W{1'b0}});
      send_beat(maxv, 1);
      send_beat(minv, -1);
      send_beat(minv, {DATA_W{1'b0}});
      send_beat(maxv, maxv);
      send_beat(minv, minv);
      send_beat(1, -1);
      send_beat(-1, {DATA_W{1'b0}});
      drain();
    end
  endtask

  task test_backpressure;
    integer n;
    integer i;
    reg signed [DATA_W-1:0] m;
    reg signed [DATA_W-1:0] c;
    reg signed [DATA_W-1:0] hold_a;
    reg                     hold_s;
    begin
      out_ready = 1'b0;
      for (n = 0; n < PIPE_STAGES; n = n + 1) begin
        m = $random(seed);
        c = $random(seed);
        send_beat(m, c);
      end
      @(negedge clk);
      if (in_ready !== 1'b0)
        fail("in_ready high on full stalled pipe");
      if (out_valid !== 1'b1)
        fail("out_valid low on full stalled pipe");
      hold_a = adjusted;
      hold_s = sat_flag;
      for (i = 0; i < 6; i = i + 1) begin
        @(negedge clk);
        if (in_ready !== 1'b0)
          fail("in_ready rose while out_ready low");
        if (out_valid !== 1'b1)
          fail("out_valid dropped during stall");
        if (adjusted !== hold_a || sat_flag !== hold_s)
          fail("pipe output moved during stall");
      end
      out_ready = 1'b1;
      drain();
    end
  endtask

  task test_bubbles;
    begin
      out_ready = 1'b1;
      send_beat(7, 9);
      in_valid = 1'b0;
      repeat (4) @(posedge clk);
      send_beat(-20, 4);
      in_valid = 1'b0;
      repeat (2) @(posedge clk);
      send_beat(1, -1);
      drain();
    end
  endtask

  task test_simultaneous;
    integer n;
    begin
      for (n = 0; n < 40; n = n + 1) begin
        @(negedge clk);
        out_ready  = 1'b1;
        in_valid   = 1'b1;
        measured   = $random(seed);
        correction = $random(seed);
        @(posedge clk);
        if (in_ready !== 1'b1)
          fail("in_ready low with out_ready held high");
      end
      @(negedge clk);
      in_valid = 1'b0;
      drain();
    end
  endtask

  task test_random;
    integer n;
    integer rv;
    begin
      for (n = 0; n < 250; n = n + 1) begin
        @(negedge clk);
        if (!in_valid || in_ready) begin
          rv = $random(seed);
          in_valid   = (rv[2:0] != 3'b000);
          measured   = $random(seed);
          correction = $random(seed);
        end
        rv        = $random(seed);
        out_ready = (rv[1:0] != 2'b00);
      end
      in_valid = 1'b0;
      drain();
    end
  endtask

  task test_async_reset_kills_valid;
    begin
      out_ready = 1'b1;
      send_beat(55, 11);
      begin : wait_valid
        integer guard;
        guard = 0;
        while (out_valid !== 1'b1) begin
          @(negedge clk);
          guard = guard + 1;
          if (guard > 200) begin
            fail("expected valid beat before mid-stream reset");
            disable wait_valid;
          end
        end
      end
      rst_n = 1'b0;
      #1;
      if (out_valid !== 1'b0)
        fail("async reset left out_valid asserted");
      @(posedge clk);
      #1;
      if (out_valid !== 1'b0)
        fail("out_valid returned during reset");
      rst_n = 1'b1;
      @(posedge clk);
      #1;
      if (out_valid !== 1'b0)
        fail("stale valid after mid-stream reset");
      send_beat(3, 5);
      drain();
    end
  endtask

  initial begin
    errors     = 0;
    done       = 0;
    seed       = 32'hA500 + DATA_W * 17 + PIPE_STAGES * 31;
    in_valid   = 1'b0;
    out_ready  = 1'b1;
    rst_n      = 1'b0;
    measured   = {DATA_W{1'b0}};
    correction = {DATA_W{1'b0}};

    apply_reset();
    check_latency(12, 34);
    drain();
    test_directed();
    test_backpressure();
    test_bubbles();
    test_simultaneous();
    test_random();
    test_async_reset_kills_valid();

    if (mon_count !== 0)
      fail("beats left in monitor");

    if (errors == 0)
      $display("PASS W%0d/S%0d", DATA_W, PIPE_STAGES);
    else
      $display("%0d FAIL(S) W%0d/S%0d", errors, DATA_W, PIPE_STAGES);
    done = 1;
  end

  initial begin
    #200000;
    if (!done) begin
      fail("timeout");
      $display("FAIL W%0d/S%0d timeout", DATA_W, PIPE_STAGES);
      done = 1;
    end
  end
endmodule

module tb_overlay_offset_pipe;
  integer total_errors;

  tb_overlay_cfg #(.DATA_W(16), .PIPE_STAGES(1)) u1();
  tb_overlay_cfg #(.DATA_W(16), .PIPE_STAGES(2)) u2();
  tb_overlay_cfg #(.DATA_W(16), .PIPE_STAGES(3)) u3();
  tb_overlay_cfg #(.DATA_W(16), .PIPE_STAGES(4)) u4();
  tb_overlay_cfg #(.DATA_W(8),  .PIPE_STAGES(2)) u8();

  initial begin
    total_errors = 0;
    wait (u1.done && u2.done && u3.done && u4.done && u8.done);
    total_errors = u1.errors + u2.errors + u3.errors + u4.errors + u8.errors;
    if (total_errors == 0) begin
      $display("ALL TESTS PASSED");
      $finish(0);
    end else begin
      $display("%0d TEST(S) FAILED", total_errors);
      $finish(1);
    end
  end
endmodule
