// nano8: a small synchronous 8-bit I/O chip.
//
// Pinout
//   clk        rising-edge clock
//   rst_n      synchronous active-low reset
//   gpio_in    sampled by the IN instruction
//   gpio_out   registered output, updated by OUT, cleared by reset
//   halted     set by HLT and held until reset
//
// Single-cycle Harvard machine. Four registers, 16-byte data RAM, 32-word
// mask ROM. Flags Z and C update on ADD, SUB, AND, OR, XOR, and ADDI, and
// are read by the following instruction (JZ uses the registered Z flag).
//
// Instruction word {op[3:0], rd[1:0], rs[1:0], imm[7:0]}:
//   NOP              no effect
//   LDI  rd, imm     rd <- imm
//   MOV  rd, rs      rd <- rs
//   ADD  rd, rs      rd <- rd + rs
//   SUB  rd, rs      rd <- rd - rs
//   AND  rd, rs      rd <- rd & rs
//   OR   rd, rs      rd <- rd | rs
//   XOR  rd, rs      rd <- rd ^ rs
//   LD   rd, addr    rd <- RAM[addr[3:0]]
//   ST   rs, addr    RAM[addr[3:0]] <- rs
//   JMP  addr        PC <- addr
//   JZ   addr        PC <- addr if Z else PC + 1
//   IN   rd          rd <- gpio_in
//   OUT  rs          gpio_out <- rs
//   ADDI rd, imm     rd <- rd + imm
//   HLT              freeze PC and assert halted
//
// The mask ROM computes gpio_out = (gpio_in + 7) ^ 0x3C, checks a RAM
// copy of that byte, and halts. See imem.v.
module nano8 (
  input  wire       clk,
  input  wire       rst_n,
  input  wire [7:0] gpio_in,
  output reg  [7:0] gpio_out,
  output reg        halted
);
  `include "nano8_defines.vh"

  reg  [7:0] pc;
  reg        zero_r;
  reg        carry_r;

  wire [15:0] instr;
  wire [3:0]  op  = instr[15:12];
  wire [1:0]  rd  = instr[11:10];
  wire [1:0]  rs  = instr[9:8];
  wire [7:0]  imm = instr[7:0];

  wire [7:0] rd_data;
  wire [7:0] rs_data;
  wire [7:0] ram_rdata;
  wire [7:0] alu_y;
  wire       alu_zero;
  wire       alu_carry;

  wire is_ldi  = (op == `OP_LDI);
  wire is_mov  = (op == `OP_MOV);
  wire is_add  = (op == `OP_ADD);
  wire is_sub  = (op == `OP_SUB);
  wire is_and  = (op == `OP_AND);
  wire is_or   = (op == `OP_OR);
  wire is_xor  = (op == `OP_XOR);
  wire is_ld   = (op == `OP_LD);
  wire is_st   = (op == `OP_ST);
  wire is_jmp  = (op == `OP_JMP);
  wire is_jz   = (op == `OP_JZ);
  wire is_in   = (op == `OP_IN);
  wire is_out  = (op == `OP_OUT);
  wire is_addi = (op == `OP_ADDI);
  wire is_hlt  = (op == `OP_HLT);

  wire flag_write = is_add | is_sub | is_and | is_or | is_xor | is_addi;
  wire take_jump  = is_jmp | (is_jz & zero_r);

  wire [2:0] alu_op =
      is_sub ? `ALU_SUB :
      is_and ? `ALU_AND :
      is_or  ? `ALU_OR  :
      is_xor ? `ALU_XOR :
               `ALU_ADD;
  wire [7:0] alu_b = is_addi ? imm : rs_data;

  reg [7:0] wdata;
  reg       we;

  always @* begin
    we    = 1'b0;
    wdata = 8'd0;
    if (is_ldi) begin
      we    = 1'b1;
      wdata = imm;
    end else if (is_mov) begin
      we    = 1'b1;
      wdata = rs_data;
    end else if (is_add | is_sub | is_and | is_or | is_xor | is_addi) begin
      we    = 1'b1;
      wdata = alu_y;
    end else if (is_ld) begin
      we    = 1'b1;
      wdata = ram_rdata;
    end else if (is_in) begin
      we    = 1'b1;
      wdata = gpio_in;
    end
    if (halted)
      we = 1'b0;
  end

  imem u_imem (
    .addr(pc),
    .data(instr)
  );

  regfile u_regfile (
    .clk(clk),
    .rst_n(rst_n),
    .we(we),
    .waddr(rd),
    .wdata(wdata),
    .raddr_a(rd),
    .raddr_b(rs),
    .rdata_a(rd_data),
    .rdata_b(rs_data)
  );

  alu u_alu (
    .a(rd_data),
    .b(alu_b),
    .op(alu_op),
    .y(alu_y),
    .zero(alu_zero),
    .carry(alu_carry)
  );

  dmem u_dmem (
    .clk(clk),
    .rst_n(rst_n),
    .we(is_st & ~halted),
    .addr(imm),
    .wdata(rs_data),
    .rdata(ram_rdata)
  );

  always @(posedge clk) begin
    if (!rst_n) begin
      pc       <= 8'd0;
      halted   <= 1'b0;
      gpio_out <= 8'd0;
      zero_r   <= 1'b0;
      carry_r  <= 1'b0;
    end else if (!halted) begin
      if (is_hlt)
        halted <= 1'b1;
      else if (take_jump)
        pc <= imm;
      else
        pc <= pc + 8'd1;

      if (is_out)
        gpio_out <= rs_data;

      if (flag_write) begin
        zero_r  <= alu_zero;
        carry_r <= alu_carry;
      end
    end
  end
endmodule
