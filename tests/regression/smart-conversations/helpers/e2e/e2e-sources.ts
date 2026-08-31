/**
 * e2e-sources — Helper de carga de fuentes para tests E2E conversacionales.
 *
 * Proporciona rutas absolutas y loaders de source files de las EFs del pipeline.
 * Todos los tests E2E son análisis estático — no ejecutan Deno.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Raíz de las EFs */
export const EF_ROOT     = resolve(__dirname, '../../../../../supabase/functions');
export const SHARED_DIR  = resolve(EF_ROOT, '_shared/smart-conversations');
export const RUNTIME_DIR = resolve(SHARED_DIR, 'runtime');

/** Carga source de una EF por nombre */
export function loadEf(efName: string): string {
  return readFileSync(resolve(EF_ROOT, `${efName}/index.ts`), 'utf-8');
}

/** Carga source de un helper de runtime */
export function loadRuntime(fileName: string): string {
  return readFileSync(resolve(RUNTIME_DIR, fileName), 'utf-8');
}

/** Carga source de un fichero shared */
export function loadShared(fileName: string): string {
  return readFileSync(resolve(SHARED_DIR, fileName), 'utf-8');
}

/** Mapa de EFs del pipeline completo */
export interface PipelineSources {
  // Ingesta
  ingest:        string;
  // Dispatch
  dispatch:      string;
  // Routing
  routing:       string;
  // WFs de negocio
  wf20:          string;
  wf30:          string;
  wf40:          string;
  // Outbound
  sendWa:        string;
  webDeliver:    string;
  // Core helpers
  createIncident: string;
  createLead:    string;
  createTicket:  string;
  queryListings: string;
  queryKb:       string;
  // Shared runtime
  dispatchRouter:  string;
  dispatchMapper:  string;
  dispatchOutbound: string;
  dispatchIdemp:   string;
  // Auth / logger
  efAuth:  string;
  efLogger: string;
}

/** Carga todas las fuentes del pipeline de una vez */
export function loadPipeline(): PipelineSources {
  return {
    ingest:           loadEf('conv-ingest'),
    dispatch:         loadEf('conv-dispatch-message'),
    routing:          loadEf('conv-routing-engine'),
    wf20:             loadEf('conv-wf20-incidents'),
    wf30:             loadEf('conv-wf30-listings'),
    wf40:             loadEf('conv-wf40-help'),
    sendWa:           loadEf('conv-send-wa'),
    webDeliver:       loadEf('conv-web-deliver'),
    createIncident:   loadEf('conv-core-create-incident'),
    createLead:       loadEf('conv-core-create-lead'),
    createTicket:     loadEf('conv-core-create-help-ticket'),
    queryListings:    loadEf('conv-core-query-listings'),
    queryKb:          loadEf('conv-core-query-help-kb'),
    dispatchRouter:   loadRuntime('dispatch-service-router.ts'),
    dispatchMapper:   loadRuntime('dispatch-response-mapper.ts'),
    dispatchOutbound: loadRuntime('dispatch-outbound-router.ts'),
    dispatchIdemp:    loadRuntime('dispatch-idempotency.ts'),
    efAuth:           loadShared('ef-auth.ts'),
    efLogger:         loadShared('ef-logger.ts'),
  };
}

/** Lista de todos los sources del pipeline para checks globales */
export function allPipelineSources(p: PipelineSources): string[] {
  return Object.values(p);
}
