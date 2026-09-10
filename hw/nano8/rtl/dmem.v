// 16 x 8 data RAM. Read is asynchronous so LD is single-cycle.
// Only imm[3:0] is decoded; the upper address bits are ignored.
module dmem (
  input  wire       clk,
  input  wire       rst_n,
  input  wire       we,
  input  wire [7:0] addr,
  input  wire [7:0] wdata,
  output wire [7:0] rdata
);
  reg [7:0] mem [0:15];
  integer i;

  assign rdata = mem[addr[3:0]];

  always @(posedge clk) begin
    if (!rst_n) begin
      for (i = 0; i < 16; i = i + 1)
        mem[i] <= 8'd0;
    end else if (we) begin
      mem[addr[3:0]] <= wdata;
    end
  end
endmodule
