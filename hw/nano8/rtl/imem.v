// 32 x 16 mask ROM. Unused words are HLT so a bad jump stops the chip.
// Firmware contract, finished 16 cycles after reset is released
// (JZ skips the two-word mismatch path):
//   gpio_out = (gpio_in + 8'h07) ^ 8'h3C
// The program round-trips that byte through RAM and checks the copy.
// A mismatch drives gpio_out = 8'hEE instead.
module imem (
  input  wire [7:0]  addr,
  output wire [15:0] data
);
  `include "nano8_defines.vh"

  reg [15:0] mem [0:31];
  integer i;

  function [15:0] enc;
    input [3:0] op;
    input [1:0] rd;
    input [1:0] rs;
    input [7:0] imm;
    begin
      enc = {op, rd, rs, imm};
    end
  endfunction

  initial begin
    for (i = 0; i < 32; i = i + 1)
      mem[i] = {`OP_HLT, 2'b00, 2'b00, 8'h00};

    mem[ 0] = enc(`OP_NOP,  2'd0, 2'd0, 8'h00);
    mem[ 1] = enc(`OP_LDI,  2'd3, 2'd0, 8'h07);       // r3 = trim
    mem[ 2] = enc(`OP_IN,   2'd0, 2'd0, 8'h00);       // r0 = gpio_in
    mem[ 3] = enc(`OP_ADD,  2'd0, 2'd3, 8'h00);       // r0 = r0 + r3
    mem[ 4] = enc(`OP_LDI,  2'd2, 2'd0, 8'h3C);       // r2 = fold mask
    mem[ 5] = enc(`OP_XOR,  2'd0, 2'd2, 8'h00);       // r0 = r0 ^ r2
    mem[ 6] = enc(`OP_ST,   2'd0, 2'd0, 8'h01);       // RAM[1] = r0
    mem[ 7] = enc(`OP_LD,   2'd1, 2'd0, 8'h01);       // r1 = RAM[1]
    mem[ 8] = enc(`OP_MOV,  2'd2, 2'd1, 8'h00);       // r2 = r1
    mem[ 9] = enc(`OP_SUB,  2'd1, 2'd0, 8'h00);       // r1 = r1 - r0; expect 0
    mem[10] = enc(`OP_JZ,   2'd0, 2'd0, 8'd13);       // match -> present
    mem[11] = enc(`OP_LDI,  2'd2, 2'd0, 8'hEE);       // mismatch sentinel
    mem[12] = enc(`OP_JMP,  2'd0, 2'd0, 8'd15);
    mem[13] = enc(`OP_AND,  2'd2, 2'd0, 8'h00);       // r2 = r2 & r0
    mem[14] = enc(`OP_OR,   2'd2, 2'd1, 8'h00);       // r2 = r2 | 0
    mem[15] = enc(`OP_OUT,  2'd0, 2'd2, 8'h00);       // gpio_out = r2
    mem[16] = enc(`OP_ADDI, 2'd3, 2'd0, 8'h01);       // r3 = trim + 1
    mem[17] = enc(`OP_HLT,  2'd0, 2'd0, 8'h00);
  end

  assign data = mem[addr[4:0]];
endmodule
