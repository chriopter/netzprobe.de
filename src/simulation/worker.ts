import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { runSimulation, type SimulationContext, type SimulationResult } from './engine';

type InitMessage = { type: 'init'; input: HourlyInput[] } & SimulationContext;
type RunMessage = { type: 'run'; requestId: number; scenario: Scenario };
type WorkerMessage = InitMessage | RunMessage;
type WorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

let input: HourlyInput[] = [];
let context: SimulationContext | null = null;

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === 'init') {
    input = message.input;
    context = {
      'e100-pkw': message['e100-pkw'],
      'e100-heiz': message['e100-heiz'],
      'e100-lkw': message['e100-lkw'],
      'e100-bahn': message['e100-bahn'],
      'e100-schiff': message['e100-schiff'],
      'e100-flug': message['e100-flug'],
      'e100-ghd': message['e100-ghd'],
      'e100-industrie-waerme': message['e100-industrie-waerme'],
      'e100-stahl': message['e100-stahl'],
      'e100-chemie': message['e100-chemie'],
      'erzeugungs-modell': message['erzeugungs-modell'],
      'speicher-modell': message['speicher-modell'],
    };
    return;
  }
  if (!input.length || !context) return;

  const started = performance.now();
  const result = runSimulation(input, message.scenario, context);
  const response: WorkerResponse = {
    requestId: message.requestId,
    result,
    elapsedMs: performance.now() - started,
  };
  self.postMessage(response);
});
