/**
 * MIPS Program Data Module - Optimized for 3-Page Premium Simulation
 * Based on the User's Interactive Menu Program
 */

export const instructions = [
  {
    id: 'I1',
    label: 'LI',
    opcode: 'LI',
    rt: 'V0',
    immediate: 4,
    description: 'LI $V0, 4        ; Load System Call (Print String)',
    category: 'arith'
  },
  {
    id: 'I2',
    label: 'LA',
    opcode: 'LA',
    rt: 'A0',
    description: 'LA $A0, title    ; Load Title Address',
    category: 'mem'
  },
  {
    id: 'I3',
    label: 'SYSCALL',
    opcode: 'SYSCALL',
    description: 'SYSCALL          ; Display Project Title',
    category: 'sys'
  },
  {
    id: 'I4',
    label: 'ADDI',
    opcode: 'ADDI',
    rs: 'R1',
    rt: 'R1',
    immediate: 1,
    description: 'ADDI R1, R1, 1   ; Increment Cycle Counter',
    category: 'arith'
  },
  {
    id: 'I5',
    label: 'LW',
    opcode: 'LW',
    rs: 'R1',
    rt: 'R2',
    immediate: 0,
    description: 'LW R2, 0(R1)     ; Data Load (Potential RAW Hazard)',
    category: 'mem'
  },
  {
    id: 'I6',
    label: 'ADD',
    opcode: 'ADD',
    rs: 'R2',
    rt: 'R3',
    rd: 'R4',
    description: 'ADD R4, R2, R3   ; ALU Operation (RAW on R2)',
    category: 'arith'
  },
  {
    id: 'I7',
    label: 'BEQ',
    opcode: 'BEQ',
    rs: 'R4',
    rt: 'R0',
    immediate: -3,
    description: 'BEQ R4, R0, LOOP ; Branch Control Hazard',
    category: 'branch'
  }
];

export const programInfo = {
  title: 'Interactive Pipeline Simulation',
  description: 'Simulating the execution of the User\'s Menu-Driven MIPS Program',
  totalInstructions: instructions.length,
  stages: ['IF', 'ID', 'EX', 'MEM', 'WB']
};

export const hazardLegend = [
  {
    type: 'RAW',
    description: 'Read-After-Write: Data dependency detected',
    colorClass: 'hazard-raw'
  },
  {
    type: 'CTRL',
    description: 'Control Hazard: Program branch detected',
    colorClass: 'hazard-ctrl'
  }
];