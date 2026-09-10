# Simulate the nano8 chip: make -C hw/nano8 sim
IVERILOG ?= iverilog
VVP      ?= vvp
BUILD    := build

SRCS := rtl/alu.v rtl/regfile.v rtl/dmem.v rtl/imem.v rtl/nano8.v tb/tb_nano8.v

.PHONY: sim clean

sim:
	mkdir -p $(BUILD)
	$(IVERILOG) -I rtl -o $(BUILD)/nano8.vvp $(SRCS)
	$(VVP) $(BUILD)/nano8.vvp

clean:
	rm -rf $(BUILD)
