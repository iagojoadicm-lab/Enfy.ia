export const evaluationJsonSchema = {
  patient: {
    nome: null,
    id_externo: null,
    sexo: null,
    religiao: null,
    data_nascimento: null,
    ocupacao: null,
    escolaridade: null,
    endereco: null,
    telefone: null,
    responsavel: null,
    alergias: null
  },
  admissao: {
    data_admissao: null,
    habitos: {
      tabagista: "desconhecido",
      etilista: "desconhecido",
      atividade_fisica: "desconhecido",
      sedentario: "desconhecido",
      sono_horas_dia: null,
      pet_estimacao: "desconhecido"
    },
    antiparasitarias_dt: {
      dose1: null,
      dose2: null,
      dose3: null,
      ultima: null
    },
    peso_kg: null,
    altura_m: null,
    imc: null
  },
  comorbidades: {
    diabetes: false,
    has: false,
    cardiopatia: false,
    neoplasia: false,
    anemia: false,
    insuficiencia_venosa: false,
    insuficiencia_arterial: false,
    insuficiencia_renal: false,
    dislipidemias: false,
    outros: null
  },
  medicacoes: {
    lista_livres: null,
    anticoagulante: false,
    antibioticos: false,
    corticoides: false,
    outras: null
  },
  exame_fisico: {
    pa_mmhg: null,
    temperatura_c: null,
    pulso_bpm: null,
    respiracao_irpm: null,
    sapo2_percent: null,
    htg: null,
    pulso_pedioso: null,
    pulso_tibial_posterior: null
  },
  avaliacao_sistemas: {
    neurologico: [],
    sensitivo_motor: [],
    respiratorio: [],
    pele_mucosas: [],
    cardiovascular_perfusao: [],
    incontinencias: {
      fecal: "desconhecido",
      urinaria: "desconhecido"
    },
    mecanica_corporal: [],
    limitacao_fisica: [],
    nutricao: [],
    dieta: null,
    hidratacao: null,
    ingestao_liquidos: null,
    suporte_nutricional: []
  },
  fatores_sociais: [],
  exames_laboratoriais: {
    data_exame: null,
    hemograma: null,
    hemoglobina_glicada: null,
    glicemia_jejum: null,
    pcr: null,
    sodio: null,
    potassio: null,
    calcio: null,
    ureia: null,
    creatinina: null,
    albumina: null,
    proteinas_totais_fracoes: null,
    colesterol_total: null,
    triglicerides: null,
    cultura_antibiograma: null,
    anexos: []
  },
  lesoes: [],
  observacoes_importantes: null,
  hipotese_etiologica_intervencoes: [],
  encaminhamentos: null,
  conduta_prescricao: null,
  alteracoes_prescricao: [],
  metadados_extracao: {
    confidence_por_campo: {},
    evidencias: {}
  }
} as const;

export type EvaluationJson = typeof evaluationJsonSchema;
