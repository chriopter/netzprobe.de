import type { BevPkwElectrificationLoad, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { runSimulation, type SimulationResult } from './engine';

type InitMessage = { type: 'init'; requestId: number; input: HourlyInput[]; scenario: Scenario; bevPkwElectrification: BevPkwElectrificationLoad };
type RunMessage = { type: 'run'; requestId: number; scenario: Scenario };
type WorkerMessage = InitMessage | RunMessage;
type WorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

let input: HourlyInput[] = [];
let bevPkwElectrification: BevPkwElectrificationLoad | null = null;

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === 'init') {
    input = message.input;
    bevPkwElectrification = message.bevPkwElectrification;
  }
  if (!input.length || !bevPkwElectrification) return;

  const started = performance.now();
  const result = runSimulation(input, message.scenario, bevPkwElectrification);
  const response: WorkerResponse = {
    requestId: message.requestId,
    result,
    elapsedMs: performance.now() - started,
  };
  self.postMessage(response);
});
