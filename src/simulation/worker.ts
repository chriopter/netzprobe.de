import type { E100PkwData, E100HeizData, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { runSimulation, type SimulationResult } from './engine';

type InitMessage = { type: 'init'; input: HourlyInput[]; 'e100-pkw': E100PkwData; 'e100-heiz': E100HeizData };
type RunMessage = { type: 'run'; requestId: number; scenario: Scenario };
type WorkerMessage = InitMessage | RunMessage;
type WorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

let input: HourlyInput[] = [];
let e100Pkw: E100PkwData | null = null;
let e100Heiz: E100HeizData | null = null;

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === 'init') {
    input = message.input;
    e100Pkw = message['e100-pkw'];
    e100Heiz = message['e100-heiz'];
    return;
  }
  if (!input.length || !e100Pkw || !e100Heiz) return;

  const started = performance.now();
  const result = runSimulation(input, message.scenario, e100Pkw, e100Heiz);
  const response: WorkerResponse = {
    requestId: message.requestId,
    result,
    elapsedMs: performance.now() - started,
  };
  self.postMessage(response);
});
