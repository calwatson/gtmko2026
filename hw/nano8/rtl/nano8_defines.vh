// Shared encodings for the nano8 I/O chip.
// Instruction word: {op[3:0], rd[1:0], rs[1:0], imm[7:0]}

`ifndef NANO8_DEFINES_VH
`define NANO8_DEFINES_VH

`define OP_NOP  4'h0
`define OP_LDI  4'h1
`define OP_MOV  4'h2
`define OP_ADD  4'h3
`define OP_SUB  4'h4
`define OP_AND  4'h5
`define OP_OR   4'h6
`define OP_XOR  4'h7
`define OP_LD   4'h8
`define OP_ST   4'h9
`define OP_JMP  4'hA
`define OP_JZ   4'hB
`define OP_IN   4'hC
`define OP_OUT  4'hD
`define OP_ADDI 4'hE
`define OP_HLT  4'hF

`define ALU_ADD 3'd0
`define ALU_SUB 3'd1
`define ALU_AND 3'd2
`define ALU_OR  3'd3
`define ALU_XOR 3'd4

`endif
