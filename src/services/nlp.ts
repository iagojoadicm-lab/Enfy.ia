import pino from "pino";
import {
  createEmptyEvaluationPayload,
  evaluationSchema
} from "@/src/lib/json-schema";

const logger = pino({ name: "nlp" });

type ExtractionResult = {
  jsonPayload: ReturnType<typeof createEmptyEvaluationPayload>;
  confidenceMean: number;
  confidences: Record<string, number>;
  evidencias: Record<string, string>;
};

const numberWords: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  "três": 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100
};

function wordsToNumber(input: string): number | null {
  const parts = input
    .normalize("NFD")
    .replace(/[^\w\s]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  for (const word of parts) {
    if (word === "meio") {
      return total + 0.5;
    }
    const value = numberWords[word];
    if (value == null) {
      return null;
    }
    total += value;
  }
  return total || null;
}

function extractBloodPressure(transcript: string) {
  const numericMatch = transcript.match(/(\d{2,3})\s*(?:\/|por)\s*(\d{2,3})/i);
  if (numericMatch) {
    const systolic = numericMatch[1].padStart(3, "0");
    const diastolic = numericMatch[2].padStart(2, "0");
    return {
      value: `${systolic}/${diastolic}`,
      evidence: numericMatch[0]
    };
  }

  const textMatch = transcript.match(/([a-zçãéêõô\s]+) por ([a-zçãéêõô\s]+)/i);
  if (textMatch) {
    const systolic = wordsToNumber(textMatch[1].trim());
    const diastolic = wordsToNumber(textMatch[2].trim());
    if (systolic && diastolic) {
      return {
        value: `${Math.round(systolic * 10)}/${Math.round(diastolic * 10)}`,
        evidence: textMatch[0]
      };
    }
  }

  return null;
}

function extractTemperature(transcript: string) {
  const numericMatch = transcript.match(/(\d{2}(?:[\.,]\d)?)\s*(?:°c|graus|c)/i);
  if (numericMatch) {
    const normalized = Number(numericMatch[1].replace(",", "."));
    return {
      value: normalized,
      evidence: numericMatch[0]
    };
  }

  const textMatch = transcript.match(/trinta e seis e meio|trinta e sete/i);
  if (textMatch) {
    const mapping: Record<string, number> = {
      "trinta e seis e meio": 36.5,
      "trinta e sete": 37
    };
    return {
      value: mapping[textMatch[0].toLowerCase()],
      evidence: textMatch[0]
    };
  }

  return null;
}

function detectNegation(transcript: string, term: string) {
  const negationPatterns = [
    new RegExp(`nega\\s+${term}`, "i"),
    new RegExp(`sem\\s+${term}`, "i"),
    new RegExp(`não possui\\s+${term}`, "i"),
    new RegExp(`nao possui\\s+${term}`, "i")
  ];

  return negationPatterns.some((pattern) => pattern.test(transcript));
}

function detectAffirmation(transcript: string, term: string) {
  const pattern = new RegExp(`${term}`, "i");
  return pattern.test(transcript);
}

export async function extractStructuredData(transcript: string): Promise<ExtractionResult> {
  logger.info({ transcript }, "Extraindo dados estruturados");

  const payload = createEmptyEvaluationPayload() as any;
  // Preserve schema metadata container.
  if (
    typeof payload.metadados_extracao !== "object" ||
    payload.metadados_extracao === null
  ) {
    payload.metadados_extracao = {
      confidence_por_campo: {},
      evidencias: {}
    };
  }

  const confidencePorCampo: Record<string, number> = {};
  const evidencias: Record<string, string> = {};

  const pa = extractBloodPressure(transcript);
  if (pa) {
    payload.exame_fisico.pa_mmhg = pa.value;
    confidencePorCampo["exame_fisico.pa_mmhg"] = 0.85;
    evidencias["exame_fisico.pa_mmhg"] = pa.evidence;
  }

  const temperatura = extractTemperature(transcript);
  if (temperatura) {
    payload.exame_fisico.temperatura_c = temperatura.value;
    confidencePorCampo["exame_fisico.temperatura_c"] = 0.8;
    evidencias["exame_fisico.temperatura_c"] = temperatura.evidence;
  }

  if (detectNegation(transcript, "alergia")) {
    payload.patient.alergias = "nega alergias";
    confidencePorCampo["patient.alergias"] = 0.75;
    evidencias["patient.alergias"] = "nega alergias";
  } else if (detectAffirmation(transcript, "alergia")) {
    payload.patient.alergias = "relata alergias";
    confidencePorCampo["patient.alergias"] = 0.6;
    evidencias["patient.alergias"] = "relata alergias";
  }

  const comorbidityMap: Record<string, string[]> = {
    "comorbidades.diabetes": ["diabetes", "dm"],
    "comorbidades.has": ["hipertens", "has"],
    "comorbidades.cardiopatia": ["cardiopatia", "doença cardíaca"],
    "comorbidades.neoplasia": ["câncer", "neoplasia"],
    "comorbidades.insuficiencia_venosa": ["insuficiência venosa"],
    "comorbidades.insuficiencia_arterial": ["insuficiência arterial"],
    "comorbidades.insuficiencia_renal": ["insuficiência renal"],
    "comorbidades.anemia": ["anemia"],
    "comorbidades.dislipidemias": ["dislipidemia", "colesterol"]
  };

  for (const [field, keywords] of Object.entries(comorbidityMap)) {
    const negated = keywords.some((keyword) => detectNegation(transcript, keyword));
    const affirmed = keywords.some((keyword) => detectAffirmation(transcript, keyword));
    if (negated || affirmed) {
      const [section, prop] = field.split(".");
      // @ts-expect-error index signature ensured by schema instantiation
      payload[section][prop] = affirmed && !negated;
      confidencePorCampo[field] = negated ? 0.8 : 0.7;
      evidencias[field] = negated
        ? `nega ${keywords[0]}`
        : `relata ${keywords[0]}`;
    }
  }

  if (transcript.trim().length) {
    payload.observacoes_importantes = transcript;
    confidencePorCampo["observacoes_importantes"] = 0.6;
    evidencias["observacoes_importantes"] = transcript.slice(0, 120);
  }

  payload.metadados_extracao = {
    confidence_por_campo: confidencePorCampo,
    evidencias
  };

  const values = Object.values(confidencePorCampo);
  const confidenceMean = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0.75;

  return {
    jsonPayload: payload,
    confidenceMean,
    confidences: confidencePorCampo,
    evidencias
  };
}

export type EvaluationSchema = typeof evaluationSchema;
