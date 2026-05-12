import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { runSimulation, type SimulationResult } from './engine';

type InitMessage = { type: 'init'; requestId: number; input: HourlyInput[]; scenario: Scenario };
type RunMessage = { type: 'run'; requestId: number; scenario: Scenario };
type WorkerMessage = InitMessage | RunMessage;
type WorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

let input: HourlyInput[] = [];

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === 'init') input = message.input;
  if (!input.length) return;

  const started = performance.now();
  const result = runSimulation(input, message.scenario);
  const response: WorkerResponse = {
    requestId: message.requestId,
    result,
    elapsedMs: performance.now() - started,
  };
  self.postMessage(response);
});
