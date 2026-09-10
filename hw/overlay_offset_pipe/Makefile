# Simulate overlay_offset_pipe: make -C hw/overlay_offset_pipe sim
IVERILOG ?= iverilog
VVP      ?= vvp
BUILD    := build

SRCS := rtl/overlay_offset_pipe.v tb/tb_overlay_offset_pipe.v

.PHONY: sim clean

sim:
	mkdir -p $(BUILD)
	$(IVERILOG) -g2005 -o $(BUILD)/overlay_offset_pipe.vvp $(SRCS)
	$(VVP) $(BUILD)/overlay_offset_pipe.vvp

clean:
	rm -rf $(BUILD)
