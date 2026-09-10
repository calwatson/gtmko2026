// 4 x 8 register file. Reads are asynchronous; writes are synchronous.
// A same-cycle read returns the pre-write value.
module regfile (
  input  wire       clk,
  input  wire       rst_n,
  input  wire       we,
  input  wire [1:0] waddr,
  input  wire [7:0] wdata,
  input  wire [1:0] raddr_a,
  input  wire [1:0] raddr_b,
  output wire [7:0] rdata_a,
  output wire [7:0] rdata_b
);
  reg [7:0] mem [0:3];

  assign rdata_a = mem[raddr_a];
  assign rdata_b = mem[raddr_b];

  always @(posedge clk) begin
    if (!rst_n) begin
      mem[0] <= 8'd0;
      mem[1] <= 8'd0;
      mem[2] <= 8'd0;
      mem[3] <= 8'd0;
    end else if (we) begin
      mem[waddr] <= wdata;
    end
  end
endmodule
