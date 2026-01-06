/**
 * Pipeline Simulator - Main Engine
 * Manages 5-stage pipeline execution, hazard detection, and state transitions
 */

// Import the existing instructions as default, but allow dynamic loading
import { instructions as defaultInstructions } from './data/program.js';
import { mipsParser } from './data/parser.js';

// Global variable to hold current instructions (default to hardcoded ones)
let currentInstructions = [...defaultInstructions];

// Function to load custom instructions (called from sandbox)
window.loadCustomInstructions = function(customCode) {
  try {
    const parsedInstructions = mipsParser.parse(customCode);
    if (parsedInstructions.length > 0) {
      currentInstructions = parsedInstructions;
      console.log(`Loaded ${parsedInstructions.length} custom instructions`);
      // Reset simulation with new instructions
      resetSimulation();
      // Update UI to reflect new program
      updateInstructionList();
      updateTimelineTable();
      return true;
    } else {
      console.warn('No valid instructions parsed from custom code');
      return false;
    }
  } catch (error) {
    console.error('Error parsing custom instructions:', error);
    return false;
  }
};

// Function to get current instructions
window.getCurrentInstructions = function() {
  return currentInstructions;
};

// Simulation State
let simulationState = {
  cycle: 0,
  status: 'idle',
  stageSlots: [
    { stage: 'IF', instructionId: null, hazardTag: null, stalled: false },
    { stage: 'ID', instructionId: null, hazardTag: null, stalled: false },
    { stage: 'EX', instructionId: null, hazardTag: null, stalled: false },
    { stage: 'MEM', instructionId: null, hazardTag: null, stalled: false },
    { stage: 'WB', instructionId: null, hazardTag: null, stalled: false }
  ],
  instructionPointer: 0,
  stallCounter: 0,
  pipelineHistory: [],
  hazardEvents: [],
  cycleTrace: []
};

// Animation Control
let animationFrameId = null;
let lastUpdateTime = 0;
const CYCLE_INTERVAL = 1500; // milliseconds between cycles

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getRegisterDependencies(inst) {
  if (!inst) return { reads: [], writes: [] };

  const reads = [];
  const writes = [];

  // Add source registers (rs, rt)
  if (inst.rs) reads.push(inst.rs);
  if (inst.rt) reads.push(inst.rt);

  // Add destination register (rd)
  if (inst.rd) writes.push(inst.rd);

  // For load instructions, rt is written to
  if (inst.opcode === 'LW' || inst.opcode === 'LH' || inst.opcode === 'LHU' || inst.opcode === 'LB' || inst.opcode === 'LBU') {
    if (inst.rt) writes.push(inst.rt);
  }

  // For store instructions, no register is written
  if (inst.opcode === 'SW' || inst.opcode === 'SH' || inst.opcode === 'SB') {
    // Only reads (rt has data to store, rs has address)
    reads.push(inst.rt);
    reads.push(inst.rs);
  }

  return {
    reads: reads.filter(Boolean),
    writes: writes.filter(Boolean)
  };
}

function detectRAWHazard(consumerId, state) {
  const consumer = currentInstructions.find(i => i.id === consumerId);
  if (!consumer) return { needsStall: false, canForward: false };

  const consumerDeps = getRegisterDependencies(consumer);
  if (!consumerDeps.reads || consumerDeps.reads.length === 0) {
    return { needsStall: false, canForward: false };
  }

  // Check all instructions currently in pipeline
  for (const slot of state.stageSlots) {
    if (!slot.instructionId || slot.instructionId === consumerId) continue;

    const producer = currentInstructions.find(i => i.id === slot.instructionId);
    if (!producer) continue;

    const producerDeps = getRegisterDependencies(producer);

    // Check if consumer reads what producer writes (RAW hazard)
    const hasRAW = consumerDeps.reads.some(readReg =>
      producerDeps.writes.some(writeReg => readReg === writeReg)
    );

    if (hasRAW) {
      // Check if data is available for forwarding
      const dataAvailableForForwarding = ['MEM', 'WB'].includes(slot.stage);

      if (dataAvailableForForwarding) {
        return {
          needsStall: false,
          canForward: true,
          producerStage: slot.stage,
          producerId: producer.id
        };
      } else {
        // Need to stall - depends on instruction type
        const isLoadInstruction = producer.opcode === 'LW';
        const stallCycles = isLoadInstruction ? 2 : 1; // Loads cause 2-cycle stall

        return {
          needsStall: true,
          canForward: false,
          producerStage: slot.stage,
          producerId: producer.id,
          stallCycles: stallCycles
        };
      }
    }
  }

  return { needsStall: false, canForward: false };
}

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

/**
 * Advance simulation by one cycle
 */
function advanceCycle() {
  if (simulationState.status === 'idle' || simulationState.status === 'complete') {
    return;
  }

  // Decrement stall counter if active
  if (simulationState.stallCounter > 0) {
    simulationState.stallCounter--;
    if (simulationState.stallCounter === 0) {
      // Stall completed, clear stall flags
      simulationState.stageSlots.forEach(slot => {
        if (slot.stalled) slot.stalled = false;
      });
    }
    simulationState.cycle++;
    updateUI();
    return;
  }

  // Save current state for trace
  const currentState = JSON.parse(JSON.stringify(simulationState));
  simulationState.cycleTrace.push(currentState);

  // Shift instructions through pipeline (WB stage exits, others advance)
  const wbExit = simulationState.stageSlots[4].instructionId; // Instruction leaving WB
  simulationState.stageSlots[4].instructionId = simulationState.stageSlots[3].instructionId;
  simulationState.stageSlots[4].hazardTag = simulationState.stageSlots[3].hazardTag;

  simulationState.stageSlots[3].instructionId = simulationState.stageSlots[2].instructionId;
  simulationState.stageSlots[3].hazardTag = simulationState.stageSlots[2].hazardTag;

  simulationState.stageSlots[2].instructionId = simulationState.stageSlots[1].instructionId;
  simulationState.stageSlots[2].hazardTag = simulationState.stageSlots[1].hazardTag;

  simulationState.stageSlots[1].instructionId = simulationState.stageSlots[0].instructionId;
  simulationState.stageSlots[1].hazardTag = simulationState.stageSlots[0].hazardTag;

  // Check for hazards before moving new instruction to IF
  let newInstructionId = null;
  let hazardInfo = null;

  if (simulationState.instructionPointer < currentInstructions.length) {
    newInstructionId = currentInstructions[simulationState.instructionPointer].id;

    // Check for RAW hazard with instruction moving to ID stage
    if (simulationState.stageSlots[1].instructionId) {
      const rawHazard = detectRAWHazard(simulationState.stageSlots[1].instructionId, simulationState);
      if (rawHazard.needsStall) {
        // Stall the pipeline
        simulationState.stallCounter = rawHazard.stallCycles;
        simulationState.stageSlots[1].stalled = true;
        simulationState.stageSlots[1].hazardTag = 'STALL';

        // Record hazard event
        simulationState.hazardEvents.push({
          cycle: simulationState.cycle,
          type: 'RAW',
          instructionId: simulationState.stageSlots[1].instructionId,
          description: `RAW hazard: ${rawHazard.producerId} → ${simulationState.stageSlots[1].instructionId}`,
          resolution: 'Stall inserted'
        });

        // Don't advance instruction pointer during stall
        newInstructionId = simulationState.stageSlots[0].instructionId; // Keep same instruction in IF
      }
    }
  }

  // Move new instruction to IF stage (or keep previous if stalling)
  simulationState.stageSlots[0].instructionId = newInstructionId;
  simulationState.stageSlots[0].hazardTag = null;
  simulationState.stageSlots[0].stalled = false;

  // Update instruction pointer if we successfully fetched a new instruction
  if (newInstructionId &&
      newInstructionId !== simulationState.stageSlots[0].instructionId && // Not same as previous
      !simulationState.stageSlots[1].stalled) { // Not in stall
    simulationState.instructionPointer++;
  }

  // Check if simulation is complete
  if (simulationState.instructionPointer >= currentInstructions.length &&
      simulationState.stageSlots.every(slot => slot.instructionId === null)) {
    simulationState.status = 'complete';
  }

  simulationState.cycle++;
  updateUI();
}

/**
 * Initialize simulation with current instructions
 */
function initSimulation() {
  simulationState = {
    cycle: 0,
    status: 'idle',
    stageSlots: [
      { stage: 'IF', instructionId: null, hazardTag: null, stalled: false },
      { stage: 'ID', instructionId: null, hazardTag: null, stalled: false },
      { stage: 'EX', instructionId: null, hazardTag: null, stalled: false },
      { stage: 'MEM', instructionId: null, hazardTag: null, stalled: false },
      { stage: 'WB', instructionId: null, hazardTag: null, stalled: false }
    ],
    instructionPointer: 0,
    stallCounter: 0,
    pipelineHistory: [],
    hazardEvents: [],
    cycleTrace: []
  };

  updateUI();
}

/**
 * Reset simulation to initial state
 */
function resetSimulation() {
  initSimulation();
}

/**
 * Start automatic simulation
 */
function startSimulation() {
  if (simulationState.status === 'running') return;

  simulationState.status = 'running';
  updateUI();

  function runLoop(timestamp) {
    if (simulationState.status !== 'running') {
      animationFrameId = null;
      return;
    }

    if (timestamp - lastUpdateTime >= CYCLE_INTERVAL) {
      advanceCycle();
      lastUpdateTime = timestamp;
    }

    animationFrameId = requestAnimationFrame(runLoop);
  }

  animationFrameId = requestAnimationFrame(runLoop);
}

/**
 * Pause simulation
 */
function pauseSimulation() {
  simulationState.status = 'paused';
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  updateUI();
}

/**
 * Execute single cycle
 */
function stepSimulation() {
  if (simulationState.status === 'running') {
    pauseSimulation();
  }
  advanceCycle();
}

// ============================================================================
// UI UPDATES
// ============================================================================

/**
 * Update all UI elements to reflect current simulation state
 */
function updateUI() {
  updateStageDisplays();
  updateControlPanel();
  updateTimelineTable();
  updatePerformanceMetrics();
}

/**
 * Update pipeline stage displays
 */
function updateStageDisplays() {
  for (const slot of simulationState.stageSlots) {
    const element = document.getElementById(`stage-${slot.stage}`);
    if (element) {
      if (slot.instructionId) {
        const instruction = currentInstructions.find(i => i.id === slot.instructionId);
        if (instruction) {
          element.textContent = `${instruction.label} ${instruction.id}`;

          // Apply styling based on hazard tags with enhanced visual feedback
          element.className = `stage-instruction ${slot.hazardTag ? `hazard-${slot.hazardTag.toLowerCase()}` : ''}`;
          if (slot.stalled) {
            element.classList.add('stalled');
          }

          // Add entrance animation when instruction enters stage
          if (instruction && element.textContent !== `${instruction.label} ${instruction.id}`) {
            element.style.animation = 'none';
            element.offsetHeight; // Trigger reflow
            element.style.animation = 'fadeInScale 0.3s ease-out';
          }
        } else {
          element.textContent = 'ERR';
          element.className = 'stage-instruction error';
        }
      } else {
        element.textContent = '';
        element.className = 'stage-instruction';
      }
    }
  }
}

/**
 * Update control panel status
 */
function updateControlPanel() {
  const statusText = document.getElementById('statusText');
  const cycleText = document.getElementById('cycleText');
  const progressText = document.getElementById('progressText');

  if (statusText) {
    statusText.textContent = simulationState.status.toUpperCase();
  }

  if (cycleText) {
    cycleText.textContent = simulationState.cycle;
  }

  if (progressText) {
    const completed = currentInstructions.length - simulationState.instructionPointer;
    progressText.textContent = `${completed} / ${currentInstructions.length} instructions`;
  }
}

/**
 * Update pipeline timeline table
 */
function updateTimelineTable() {
  const tbody = document.getElementById('pipeline-table-body');
  if (!tbody) return;

  // Clear existing rows
  tbody.innerHTML = '';

  // Create a row for each instruction
  for (let i = 0; i < currentInstructions.length; i++) {
    const instruction = currentInstructions[i];
    const row = document.createElement('tr');

    // Instruction column
    const instCell = document.createElement('td');
    instCell.textContent = instruction.description || `${instruction.opcode} ${instruction.rd || ''}${instruction.rs ? ', ' + instruction.rs : ''}${instruction.rt ? ', ' + instruction.rt : ''}`;
    row.appendChild(instCell);

    // Cycle columns (create up to 15 cycles to show timeline)
    for (let cycle = 0; cycle < 15; cycle++) {
      const cycleCell = document.createElement('td');

      // Check if this instruction was in any stage during this cycle
      let stageInCycle = null;
      if (simulationState.cycleTrace.length > cycle) {
        const cycleState = simulationState.cycleTrace[cycle];
        for (const slot of cycleState.stageSlots) {
          if (slot.instructionId === instruction.id) {
            stageInCycle = slot.stage;
            break;
          }
        }
      }

      if (stageInCycle) {
        cycleCell.textContent = stageInCycle;
        cycleCell.className = `stage-${stageInCycle.toLowerCase()}`;
      } else {
        // Check if instruction hadn't started yet
        if (cycle < i) { // Assuming simple in-order execution for visualization
          cycleCell.textContent = '';
        } else {
          cycleCell.textContent = '';
        }
      }

      row.appendChild(cycleCell);
    }

    tbody.appendChild(row);
  }
}

/**
 * Update performance metrics display
 */
function updatePerformanceMetrics() {
  const totalCycles = simulationState.cycle;
  const totalInstructions = currentInstructions.length;
  const stallCount = simulationState.hazardEvents.filter(h => h.resolution === 'Stall inserted').length;

  // Calculate CPI (Cycles Per Instruction)
  const cpi = totalInstructions > 0 ? (totalCycles / totalInstructions).toFixed(2) : '-';
  const nonPipelinedCPI = 5.00; // Fixed 5 cycles per instruction for non-pipelined
  const speedup = cpi !== '-' ? (nonPipelinedCPI / parseFloat(cpi)).toFixed(2) : '-';

  // Update metric displays
  const cpiPipelinedEl = document.getElementById('cpi-pipelined');
  const cpiNonPipelinedEl = document.getElementById('cpi-nonpipelined');
  const speedupEl = document.getElementById('speedup');
  const totalCyclesEl = document.getElementById('total-cycles');
  const stallCountEl = document.getElementById('stall-count');
  const hazardCountEl = document.getElementById('hazard-count');

  if (cpiPipelinedEl) cpiPipelinedEl.textContent = cpi;
  if (cpiNonPipelinedEl) cpiNonPipelinedEl.textContent = nonPipelinedCPI.toFixed(2);
  if (speedupEl) speedupEl.textContent = speedup;
  if (totalCyclesEl) totalCyclesEl.textContent = totalCycles;
  if (stallCountEl) stallCountEl.textContent = stallCount;
  if (hazardCountEl) hazardCountEl.textContent = simulationState.hazardEvents.length;
}

/**
 * Update instruction list display
 */
function updateInstructionList() {
  const listElement = document.getElementById('instruction-list');
  if (!listElement) return;

  listElement.innerHTML = '';

  for (const instruction of currentInstructions) {
    const item = document.createElement('div');
    item.className = 'instruction-item';

    const idSpan = document.createElement('span');
    idSpan.className = 'instruction-id';
    idSpan.textContent = instruction.id;

    const descSpan = document.createElement('span');
    descSpan.className = 'instruction-desc';
    descSpan.textContent = instruction.description || `${instruction.label} ${instruction.rd || ''}${instruction.rs ? ', ' + instruction.rs : ''}${instruction.rt ? ', ' + instruction.rt : ''}`;

    item.appendChild(idSpan);
    item.appendChild(descSpan);
    listElement.appendChild(item);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Control buttons
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stepBtn = document.getElementById('stepBtn');
  const resetBtn = document.getElementById('resetBtn');
  const loadCodeBtn = document.getElementById('load-code-btn');

  if (startBtn) startBtn.addEventListener('click', startSimulation);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseSimulation);
  if (stepBtn) stepBtn.addEventListener('click', stepSimulation);
  if (resetBtn) resetBtn.addEventListener('click', resetSimulation);
  if (loadCodeBtn) loadCodeBtn.addEventListener('click', loadCustomCode);

  // Initialize instruction list
  updateInstructionList();
}

/**
 * Load custom MIPS code from the input textarea
 */
function loadCustomCode() {
  const codeInput = document.getElementById('mips-code-input');
  if (codeInput) {
    const customCode = codeInput.value;
    if (customCode.trim()) {
      const success = window.loadCustomInstructions(customCode);
      if (success) {
        console.log('Successfully loaded custom MIPS code');
        // Update UI to reflect new program
        updateInstructionList();
        updateTimelineTable();
        // Reset simulation with new instructions
        resetSimulation();
      } else {
        alert('Failed to parse the MIPS code. Please check the syntax and try again.');
      }
    } else {
      alert('Please enter some MIPS code to load.');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initEventListeners();
  updateUI();
});

// Export functions for use in other modules if needed
window.pipelineSimulator = {
  initSimulation,
  startSimulation,
  pauseSimulation,
  stepSimulation,
  resetSimulation,
  advanceCycle,
  updateUI,
  getCurrentInstructions,
  loadCustomInstructions
};