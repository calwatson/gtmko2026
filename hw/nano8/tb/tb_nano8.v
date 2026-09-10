// Self-checking testbench for the nano8 mask-ROM contract:
//   gpio_out = (gpio_in + 8'h07) ^ 8'h3C
// after 16 cycles, then held until the next reset.
`timescale 1ns/1ps

module tb_nano8;
  reg        clk;
  reg        rst_n;
  reg  [7:0] gpio_in;
  wire [7:0] gpio_out;
  wire       halted;

  integer errors;

  nano8 dut (
    .clk(clk),
    .rst_n(rst_n),
    .gpio_in(gpio_in),
    .gpio_out(gpio_out),
    .halted(halted)
  );

  initial clk = 1'b0;
  always #5 clk = ~clk;

  function [7:0] spec;
    input [7:0] sample;
    begin
      spec = (sample + 8'h07) ^ 8'h3C;
    end
  endfunction

  task apply_reset;
    begin
      rst_n = 1'b0;
      repeat (2) @(posedge clk);
      @(negedge clk);
      if (gpio_out !== 8'd0 || halted !== 1'b0) begin
        $display("FAIL reset did not clear outputs (gpio_out=%02h halted=%b)", gpio_out, halted);
        errors = errors + 1;
      end
      rst_n = 1'b1;
    end
  endtask

  task check_eq;
    input [8*48-1:0] label;
    input [7:0] actual;
    input [7:0] expect;
    begin
      if (actual !== expect) begin
        $display("FAIL %0s: got %02h expected %02h", label, actual, expect);
        errors = errors + 1;
      end
    end
  endtask

  task run_sample;
    input [7:0] sample;
    reg   [7:0] expect;
    begin
      expect  = spec(sample);
      gpio_in = sample;
      apply_reset();

      // JZ skips two words, so the success path is 16 cycles: OUT on 14, HLT on 16.
      repeat (10) @(posedge clk);
      @(negedge clk);
      if (halted !== 1'b0 || gpio_out !== 8'd0) begin
        $display("FAIL sample %02h still running at cycle 10 (gpio_out=%02h halted=%b)",
                 sample, gpio_out, halted);
        errors = errors + 1;
      end

      repeat (4) @(posedge clk);
      @(negedge clk);
      check_eq("gpio_out after OUT", gpio_out, expect);
      if (halted !== 1'b0) begin
        $display("FAIL sample %02h halted before HLT", sample);
        errors = errors + 1;
      end

      repeat (2) @(posedge clk);
      @(negedge clk);
      if (halted !== 1'b1) begin
        $display("FAIL sample %02h did not halt (pc=%0d)", sample, dut.pc);
        errors = errors + 1;
      end
      check_eq("gpio_out at halt", gpio_out, expect);
      check_eq("RAM[1]", dut.u_dmem.mem[1], expect);

      // The result is a registered pin, not a live function of gpio_in.
      gpio_in = sample ^ 8'hFF;
      repeat (4) @(posedge clk);
      @(negedge clk);
      check_eq("gpio_out held after halt", gpio_out, expect);
      if (halted !== 1'b1) begin
        $display("FAIL sample %02h left the halted state", sample);
        errors = errors + 1;
      end

      $display("PASS sample %02h -> %02h", sample, expect);
    end
  endtask

  initial begin
    errors  = 0;
    rst_n   = 1'b0;
    gpio_in = 8'd0;

    run_sample(8'h00);
    run_sample(8'h01);
    run_sample(8'h05);
    run_sample(8'h7F);
    run_sample(8'h80);
    run_sample(8'hF9);
    run_sample(8'hFE);
    run_sample(8'hFF);

    // Reset during a run must drop the previous result before the new one appears.
    gpio_in = 8'h05;
    apply_reset();
    repeat (8) @(posedge clk);
    gpio_in = 8'h10;
    apply_reset();
    repeat (18) @(posedge clk);
    @(negedge clk);
    check_eq("gpio_out after mid-run reset", gpio_out, spec(8'h10));
    if (halted !== 1'b1) begin
      $display("FAIL mid-run reset did not reach HLT");
      errors = errors + 1;
    end else begin
      $display("PASS mid-run reset -> %02h", spec(8'h10));
    end

    if (errors == 0) begin
      $display("ALL TESTS PASSED");
      $finish(0);
    end else begin
      $display("%0d TEST(S) FAILED", errors);
      $finish(1);
    end
  end

  initial begin
    #10000;
    $display("FAIL timeout");
    $finish(1);
  end
endmodule
