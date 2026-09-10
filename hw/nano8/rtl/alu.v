// Combinational 8-bit ALU. Carry is the adder carry-out.
// For SUB, carry is 1 when there is no borrow.
module alu (
  input  wire [7:0] a,
  input  wire [7:0] b,
  input  wire [2:0] op,
  output reg  [7:0] y,
  output reg        zero,
  output reg        carry
);
  `include "nano8_defines.vh"

  reg [8:0] sum;

  always @* begin
    case (op)
      `ALU_ADD: sum = {1'b0, a} + {1'b0, b};
      `ALU_SUB: sum = {1'b0, a} + {1'b0, ~b} + 9'd1;
      `ALU_AND: sum = {1'b0, a & b};
      `ALU_OR:  sum = {1'b0, a | b};
      `ALU_XOR: sum = {1'b0, a ^ b};
      default:  sum = 9'd0;
    endcase
    y     = sum[7:0];
    carry = sum[8];
    zero  = (sum[7:0] == 8'd0);
  end
endmodule
