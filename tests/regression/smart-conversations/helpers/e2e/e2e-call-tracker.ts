/**
 * e2e-call-tracker — Rastreo de llamadas entre EFs en simulaciones E2E.
 *
 * Reemplaza el fetch real entre Edge Functions: cada llamada simulada queda
 * registrada aquí para verificar contratos de routing, WF y outbound.
 */

export interface EfCall {
  efName:    string;
  payload:   Record<string, unknown>;
  response:  Record<string, unknown>;
  timestamp: number;
}

export class CallTracker {
  private calls: EfCall[] = [];

  record(
    efName:   string,
    payload:  Record<string, unknown>,
    response: Record<string, unknown>,
  ): void {
    this.calls.push({ efName, payload, response, timestamp: Date.now() });
  }

  wasCalled(efName: string): boolean {
    return this.calls.some(c => c.efName === efName);
  }

  getCalls(efName: string): EfCall[] {
    return this.calls.filter(c => c.efName === efName);
  }

  getCallCount(efName: string): number {
    return this.getCalls(efName).length;
  }

  getAllCalledEfs(): string[] {
    return [...new Set(this.calls.map(c => c.efName))];
  }

  getFirstCall(efName: string): EfCall | undefined {
    return this.calls.find(c => c.efName === efName);
  }

  reset(): void {
    this.calls = [];
  }
}
