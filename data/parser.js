/**
 * MIPS Instruction Parser
 * Converts user-written MIPS assembly code into simulation-compatible instruction objects
 */

export class MIPSParser {
  constructor() {
    this.validOpcodes = [
      'ADD', 'SUB', 'AND', 'OR', 'NOR', 'XOR', 'SLT', 'SLTU', 'ADDI', 'ANDI', 'ORI', 'XORI', 'SLTI',
      'LW', 'SW', 'LH', 'LHU', 'LBU', 'LB', 'SH', 'SB', 'LUI', 'BEQ', 'BNE', 'BLTZ', 'BGTZ', 'BLEZ', 'BGEZ', 'J', 'JR', 'JAL'
    ];

    this.registerPattern = /^R\d+$/;
    this.labelPattern = /^[a-zA-Z_][a-zA-Z0-9_]*:$/;
  }

  /**
   * Parse MIPS assembly code into instruction objects
   * @param {string} code - MIPS assembly code
   * @returns {Array} Array of instruction objects
   */
  parse(code) {
    const lines = code.split('\n');
    const instructions = [];
    let instructionId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#') || line.startsWith(';')) {
        continue;
      }

      // Skip labels
      if (this.labelPattern.test(line)) {
        continue;
      }

      try {
        const instruction = this.parseLine(line, instructionId);
        if (instruction) {
          instructions.push(instruction);
          instructionId++;
        }
      } catch (error) {
        console.warn(`Warning: Could not parse line ${i + 1}: ${line} - ${error.message}`);
      }
    }

    return instructions;
  }

  /**
   * Parse a single MIPS instruction line
   * @param {string} line - Single instruction line
   * @param {number} id - Instruction ID
   * @returns {Object} Parsed instruction object
   */
  parseLine(line, id) {
    // Remove comments
    const cleanLine = line.split(/[;#]/)[0].trim();
    if (!cleanLine) return null;

    // Split by whitespace and commas, then filter empty strings
    const parts = cleanLine.split(/[\s,\(\)]+/).filter(part => part !== '');

    if (parts.length < 2) {
      throw new Error('Insufficient instruction parts');
    }

    const opcode = parts[0].toUpperCase();

    if (!this.validOpcodes.includes(opcode)) {
      throw new Error(`Unknown opcode: ${opcode}`);
    }

    const instruction = {
      id: `I${id}`,
      label: opcode,
      opcode: opcode,
      description: cleanLine,
      category: this.getCategory(opcode)
    };

    // Parse operands based on instruction type
    this.parseOperands(instruction, opcode, parts.slice(1));

    return instruction;
  }

  /**
   * Determine instruction category
   * @param {string} opcode - Instruction opcode
   * @returns {string} Category
   */
  getCategory(opcode) {
    const arithOps = ['ADD', 'SUB', 'AND', 'OR', 'NOR', 'XOR', 'SLT', 'SLTU', 'ADDI', 'ANDI', 'ORI', 'XORI', 'SLTI'];
    const memOps = ['LW', 'SW', 'LH', 'LHU', 'LBU', 'LB', 'SH', 'SB', 'LUI'];
    const branchOps = ['BEQ', 'BNE', 'BLTZ', 'BGTZ', 'BLEZ', 'BGEZ'];
    const jumpOps = ['J', 'JR', 'JAL'];

    if (arithOps.includes(opcode)) return 'arith';
    if (memOps.includes(opcode)) return 'mem';
    if (branchOps.includes(opcode)) return 'branch';
    if (jumpOps.includes(opcode)) return 'jump';

    return 'unknown';
  }

  /**
   * Parse operands for an instruction
   * @param {Object} instruction - Instruction object to update
   * @param {string} opcode - Instruction opcode
   * @param {Array} operands - Array of operand strings
   */
  parseOperands(instruction, opcode, operands) {
    if (operands.length === 0) return;

    // Handle different instruction formats
    switch (opcode) {
      case 'ADD':
      case 'SUB':
      case 'AND':
      case 'OR':
      case 'NOR':
      case 'XOR':
      case 'SLT':
      case 'SLTU':
        // R-type: RD, RS, RT
        if (operands.length >= 3) {
          instruction.rd = operands[0];
          instruction.rs = operands[1];
          instruction.rt = operands[2];
        }
        break;

      case 'ADDI':
      case 'ANDI':
      case 'ORI':
      case 'XORI':
      case 'SLTI':
        // I-type: RT, RS, IMMEDIATE
        if (operands.length >= 3) {
          instruction.rt = operands[0];
          instruction.rs = operands[1];
          instruction.immediate = parseInt(operands[2]) || 0;
        }
        break;

      case 'LW':
      case 'SW':
      case 'LH':
      case 'LHU':
      case 'LBU':
      case 'LB':
      case 'SH':
      case 'SB':
        // I-type: RT, IMMEDIATE(RS) or RT, BASE_OFFSET(RS)
        if (operands.length >= 2) {
          instruction.rt = operands[0];

          // Handle offset(register) format
          if (operands.length >= 3) {
            instruction.rs = operands[2]; // Register in parentheses
            instruction.immediate = parseInt(operands[1]) || 0; // Offset
          } else {
            // Handle immediate(register) format like "4(R2)"
            const fullOp = operands[1];
            const match = fullOp.match(/(-?\d+)\s*\(\s*(\w+)\s*\)/);
            if (match) {
              instruction.immediate = parseInt(match[1]);
              instruction.rs = match[2];
            } else {
              instruction.immediate = parseInt(operands[1]) || 0;
            }
          }
        }
        break;

      case 'LUI':
        // I-type: RT, IMMEDIATE
        if (operands.length >= 2) {
          instruction.rt = operands[0];
          instruction.immediate = parseInt(operands[1]) || 0;
        }
        break;

      case 'BEQ':
      case 'BNE':
        // I-type: RS, RT, OFFSET
        if (operands.length >= 3) {
          instruction.rs = operands[0];
          instruction.rt = operands[1];
          instruction.immediate = parseInt(operands[2]) || 0;
        }
        break;

      case 'BLTZ':
      case 'BGTZ':
      case 'BLEZ':
      case 'BGEZ':
        // I-type: RS, OFFSET
        if (operands.length >= 2) {
          instruction.rs = operands[0];
          instruction.immediate = parseInt(operands[1]) || 0;
        }
        break;

      case 'J':
      case 'JAL':
        // J-type: TARGET_ADDRESS
        if (operands.length >= 1) {
          instruction.target = operands[0];
        }
        break;

      case 'JR':
        // R-type: RS
        if (operands.length >= 1) {
          instruction.rs = operands[0];
        }
        break;

      default:
        // For unknown opcodes, just store the operands
        instruction.operands = operands;
        break;
    }
  }
}

// Export a default instance for easy use
export const mipsParser = new MIPSParser();