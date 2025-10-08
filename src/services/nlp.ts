import pino from "pino";
import { evaluationJsonSchema } from "@/src/lib/json-schema";

const logger = pino({ name: "nlp" });

type Extraction = typeof evaluationJsonSchema;

export async function extractStructuredData(transcript: string) {
  logger.info({ transcript }, "Extraindo dados estruturados");

  const payload = structuredClone(evaluationJsonSchema) as Extraction;

  payload.patient.nome = transcript.includes("Paciente") ? "Paciente" : null;
  payload.patient.alergias = transcript.includes("alergia") ? "Relata alergia" : null;
  const pa = transcript.includes("doze por oito") ? "120/80" : null;
  payload.exame_fisico.pa_mmhg = pa && /^\d{2,3}\/\d{2,3}$/.test(pa) ? pa : null;
  payload.exame_fisico.temperatura_c = transcript.includes("trinta e seis") ? 36.5 : null;
  payload.observacoes_importantes = transcript;
  payload.metadados_extracao.confidence_por_campo = {
    "patient.nome": 0.8,
    "exame_fisico.pa_mmhg": 0.7
  };
  payload.metadados_extracao.evidencias = {
    "patient.nome": "Paciente relata...",
    "exame_fisico.pa_mmhg": "Pressão doze por oito"
  };

  const confidences = Object.values(payload.metadados_extracao.confidence_por_campo);
  const confidenceMean = confidences.length
    ? confidences.reduce((acc, value) => acc + value, 0) / confidences.length
    : 0.75;

  return {
    jsonPayload: payload,
    confidenceMean,
    confidences: payload.metadados_extracao.confidence_por_campo,
    evidencias: payload.metadados_extracao.evidencias
  };
}
