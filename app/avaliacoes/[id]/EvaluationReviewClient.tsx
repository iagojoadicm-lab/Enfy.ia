"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { FieldCard } from "@/components/FieldCard";
import { LesionCard } from "@/components/LesionCard";
import { evaluationSchema } from "@/src/lib/json-schema";
import {
  formatTimestamp,
  isValidBloodPressure,
  isValidDateInput,
  normalizeDecimalInput,
  parseDecimalInput,
  parseEvidence
} from "@/src/lib/validation";
import { cn } from "@/src/lib/utils";

type EvaluationJson = any;

type EvidenceInfo = ReturnType<typeof parseEvidence> extends infer R
  ? R extends { text: string; startSeconds: number | null; endSeconds: number | null }
    ? R
    : never
  : never;

interface EvaluationVersionLite {
  id: string;
  createdAt: string;
  createdBy: string | null;
  jsonPayload: EvaluationJson;
  transcript: string | null;
  confidenceMean: number | null;
}

interface EvaluationReviewClientProps {
  evaluationId: string;
  patientId: string;
  transcript: string | null;
  jsonPayload: EvaluationJson;
  confidenceMean: number | null;
  evidences: Record<string, string>;
  confidences: Record<string, number>;
  versions: EvaluationVersionLite[];
}

type FlattenValue = string | number | boolean | null | string[] | number[] | boolean[] | Record<string, unknown>;

type TranscriptSegment = {
  id: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

function flattenPayload(payload: any, prefix = ""): Record<string, FlattenValue> {
  if (payload == null) return {};
  if (typeof payload !== "object") {
    return { [prefix]: payload } as Record<string, FlattenValue>;
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        Object.assign(acc, flattenPayload(item, `${path}.${index}`));
      });
      if (value.length === 0) {
        acc[path] = [];
      }
      return acc;
    }
    if (value && typeof value === "object") {
      Object.assign(acc, flattenPayload(value, path));
    } else {
      acc[path] = value as FlattenValue;
    }
    return acc;
  }, {} as Record<string, FlattenValue>);
}

function setValueAtPath(payload: any, path: string, value: unknown): any {
  const clone = structuredClone(payload);
  const parts = path.split(".");
  let current: any = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    const isNextIndex = /^\d+$/.test(nextKey);

    if (Array.isArray(current)) {
      const index = Number(key);
      if (!current[index]) {
        current[index] = isNextIndex ? [] : {};
      }
      current = current[index];
    } else {
      if (!(key in current) || current[key] == null) {
        current[key] = isNextIndex ? [] : {};
      }
      current = current[key];
    }
  }

  const finalKey = parts[parts.length - 1];
  const isIndex = /^\d+$/.test(finalKey);
  if (isIndex && Array.isArray(current)) {
    current[Number(finalKey)] = value;
  } else {
    current[finalKey] = value;
  }
  return clone;
}

function getValueAtPath(payload: any, path: string) {
  return path.split(".").reduce((acc: any, part) => {
    if (acc == null) return null;
    if (Array.isArray(acc)) {
      const index = Number(part);
      return Number.isNaN(index) ? null : acc[index];
    }
    return acc?.[part] ?? null;
  }, payload);
}

function createTranscriptSegments(transcript: string | null): TranscriptSegment[] {
  if (!transcript) return [];
  const sentences = transcript.split(/(?<=[.!?])\s+/);
  return sentences.map((sentence, index) => {
    const startSeconds = index * 6;
    const endSeconds = startSeconds + Math.max(4, Math.ceil(sentence.length / 8));
    return {
      id: `segment-${index}`,
      startSeconds,
      endSeconds,
      text: sentence.trim()
    };
  });
}

export function EvaluationReviewClient({
  evaluationId,
  patientId,
  transcript,
  jsonPayload,
  confidenceMean,
  evidences,
  confidences,
  versions
}: EvaluationReviewClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<EvaluationJson>(() => structuredClone(jsonPayload));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [compareReference, setCompareReference] = useState<EvaluationJson | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const flattenedReference = useMemo(() => flattenPayload(compareReference ?? {}), [compareReference]);
  const flattenedCurrent = useMemo(() => flattenPayload(formData), [formData]);

  const evidenceLookup = useMemo(() => {
    return Object.entries(evidences ?? {}).reduce(
      (acc, [path, value]) => {
        const parsed = parseEvidence(value ?? null);
        if (parsed) {
          acc[path] = parsed as EvidenceInfo;
        }
        return acc;
      },
      {} as Record<string, EvidenceInfo>
    );
  }, [evidences]);

  const transcriptSegments = useMemo(() => createTranscriptSegments(transcript), [transcript]);

  const highlightSegmentId = useMemo(() => {
    if (!focusedPath) return null;
    const evidence = evidenceLookup[focusedPath];
    if (!evidence) return null;
    if (evidence.startSeconds == null) {
      const segment = transcriptSegments.find((candidate) =>
        candidate.text.toLowerCase().includes(evidence.text.toLowerCase())
      );
      return segment?.id ?? null;
    }
    return (
      transcriptSegments.find(
        (segment) =>
          evidence.startSeconds != null &&
          evidence.endSeconds != null &&
          segment.startSeconds <= evidence.startSeconds &&
          segment.endSeconds >= evidence.endSeconds
      )?.id ?? null
    );
  }, [evidenceLookup, focusedPath, transcriptSegments]);

  const scrollToEvidence = useCallback(
    (path: string) => {
      setFocusedPath(path);
      const container = transcriptRef.current;
      if (!container) return;
      const evidence = evidenceLookup[path];
      if (!evidence) return;
      const segment = transcriptSegments.find((candidate) =>
        evidence.startSeconds != null && evidence.endSeconds != null
          ? candidate.startSeconds <= (evidence.startSeconds ?? 0) && candidate.endSeconds >= (evidence.endSeconds ?? 0)
          : candidate.text.toLowerCase().includes(evidence.text.toLowerCase())
      );
      if (!segment) return;
      const element = container.querySelector<HTMLDivElement>(`[data-segment-id="${segment.id}"]`);
      if (element) {
        container.scrollTo({
          top: element.offsetTop - container.clientHeight / 3,
          behavior: "smooth"
        });
      }
    },
    [evidenceLookup, transcriptSegments]
  );

  const handleInputChange = useCallback((path: string, value: unknown) => {
    setFormData((prev) => setValueAtPath(prev, path, value));
  }, []);

  const handleNumberChange = useCallback(
    (path: string, rawValue: string) => {
      const normalized = normalizeDecimalInput(rawValue);
      const parsed = parseDecimalInput(normalized);
      handleInputChange(path, parsed);
    },
    [handleInputChange]
  );

  const handleDateChange = useCallback(
    (path: string, rawValue: string) => {
      const trimmed = rawValue.trim();
      handleInputChange(path, trimmed || null);
    },
    [handleInputChange]
  );

  const handleTextChange = useCallback(
    (path: string, rawValue: string) => {
      handleInputChange(path, rawValue.length ? rawValue : null);
    },
    [handleInputChange]
  );

  const handleToggleArrayValue = useCallback(
    (path: string, option: string) => {
      setFormData((prev) => {
        const current = getValueAtPath(prev, path) as string[] | null;
        const next = new Set(current ?? []);
        if (next.has(option)) {
          next.delete(option);
        } else {
          next.add(option);
        }
        return setValueAtPath(prev, path, Array.from(next));
      });
    },
    []
  );

  const handleToggleBoolean = useCallback(
    (path: string, value: boolean) => {
      handleInputChange(path, value);
    },
    [handleInputChange]
  );

  const handleAddLesion = () => {
    setFormData((prev: EvaluationJson) => {
      const current = Array.isArray(prev.lesoes) ? [...prev.lesoes] : [];
      if (current.length >= 6) return prev;
      current.push({
        rotulo: `L${current.length + 1}`,
        historia: null,
        exames_complementares: null,
        caracteristicas: {
          perilesao: [],
          borda: [],
          leito: [],
          exsudato: [],
          odor: { grau: null }
        }
      });
      return { ...prev, lesoes: current };
    });
  };

  const handleRemoveLesion = (index: number) => {
    setFormData((prev: EvaluationJson) => {
      const current = Array.isArray(prev.lesoes) ? [...prev.lesoes] : [];
      current.splice(index, 1);
      return { ...prev, lesoes: current };
    });
  };

  const handleAddHypothesis = () => {
    setFormData((prev: EvaluationJson) => {
      const current = Array.isArray(prev.hipotese_etiologica_intervencoes)
        ? [...prev.hipotese_etiologica_intervencoes]
        : [];
      current.push({
        numero: current.length + 1,
        etiologia: "Outro",
        intervencoes_enfermagem: ""
      });
      return { ...prev, hipotese_etiologica_intervencoes: current };
    });
  };

  const handleRemoveHypothesis = (index: number) => {
    setFormData((prev: EvaluationJson) => {
      const current = Array.isArray(prev.hipotese_etiologica_intervencoes)
        ? [...prev.hipotese_etiologica_intervencoes]
        : [];
      current.splice(index, 1);
      return { ...prev, hipotese_etiologica_intervencoes: current };
    });
  };

  const handleAddPrescriptionChange = () => {
    setFormData((prev: EvaluationJson) => {
      const current = Array.isArray(prev.alteracoes_prescricao) ? [...prev.alteracoes_prescricao] : [];
      current.push({ data: "", descricao: "" });
      return { ...prev, alteracoes_prescricao: current };
    });
  };

  const handleRemovePrescriptionChange = (index: number) => {
    setFormData((prev: EvaluationJson) => {
      const current = Array.isArray(prev.alteracoes_prescricao) ? [...prev.alteracoes_prescricao] : [];
      current.splice(index, 1);
      return { ...prev, alteracoes_prescricao: current };
    });
  };

  const handleSave = useCallback(async () => {
    const nextErrors: Record<string, string> = {};
    const pa = formData.exame_fisico?.pa_mmhg ?? null;
    if (pa && !isValidBloodPressure(pa)) {
      nextErrors["exame_fisico.pa_mmhg"] = "Pressão arterial deve estar no formato NNN/NN";
    }

    const datePaths = [
      "admissao.data_admissao",
      "patient.data_nascimento",
      "exames_laboratoriais.data_exame",
      ...((formData.alteracoes_prescricao ?? []).map((_: any, index: number) => `alteracoes_prescricao.${index}.data`) as string[])
    ];

    datePaths.forEach((path) => {
      const value = getValueAtPath(formData, path);
      if (typeof value === "string" && value && !isValidDateInput(value)) {
        nextErrors[path] = "Data inválida. Use o formato YYYY-MM-DD";
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage("Há erros de validação. Corrija antes de salvar.");
      return;
    }

    setErrorMessage(null);
    setLoadingAction("save");
    try {
      const response = await fetch(`/api/evaluations/${evaluationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonPayload: formData,
          confidenceMean,
          transcript,
          lesoes: formData.lesoes ?? []
        })
      });
      if (!response.ok) {
        throw new Error("Falha ao salvar a avaliação");
      }
      await router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido ao salvar");
    } finally {
      setLoadingAction(null);
    }
  }, [confidenceMean, evaluationId, formData, router, transcript]);

  const handleExport = useCallback((type: "json" | "pdf") => {
    const url = `/api/export/${evaluationId}.${type}`;
    window.open(url, "_blank");
  }, [evaluationId]);

  const handleSelectVersion = useCallback((value: string) => {
    if (value === "current") {
      setCompareReference(null);
      setIsComparing(false);
      return;
    }
    const version = versions.find((item) => item.id === value);
    if (version) {
      setCompareReference(version.jsonPayload);
      setIsComparing(false);
    }
  }, [versions]);

  const handleCompareWithPrevious = useCallback(() => {
    const previous = versions[0];
    if (previous) {
      setCompareReference(previous.jsonPayload);
      setIsComparing(true);
    }
  }, [versions]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;
      if (event.key === "s") {
        event.preventDefault();
        handleSave();
      }
      if (event.key === "j") {
        event.preventDefault();
        handleExport("json");
      }
      if (event.key === "p") {
        event.preventDefault();
        handleExport("pdf");
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleExport, handleSave]);

  const renderMultiSelect = (path: string, options: string[]) => {
    const current = (getValueAtPath(formData, path) as string[]) ?? [];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = current.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleToggleArrayValue(path, option)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              {option.replaceAll("_", " ")}
            </button>
          );
        })}
      </div>
    );
  };

  const lesionCards = Array.isArray(formData.lesoes) ? formData.lesoes : [];

  const isDiff = (path: string) => {
    if (!isComparing) return false;
    const referenceValue = flattenedReference[path];
    const currentValue = flattenedCurrent[path];
    return JSON.stringify(referenceValue) !== JSON.stringify(currentValue);
  };

  const getConfidence = (path: string) => confidences?.[path];
  const getEvidence = (path: string) => evidences?.[path];

  const isDiffGroup = (prefix: string) => {
    if (!isComparing) return false;
    const keys = new Set([
      ...Object.keys(flattenedCurrent).filter((key) => key.startsWith(prefix)),
      ...Object.keys(flattenedReference).filter((key) => key.startsWith(prefix))
    ]);
    for (const key of keys) {
      if (JSON.stringify(flattenedCurrent[key]) !== JSON.stringify(flattenedReference[key])) {
        return true;
      }
    }
    return false;
  };

  const avaliacaoSistemasSchema = evaluationSchema.avaliacao_sistemas as any;
  const examesLaboratoriaisSchema = evaluationSchema.exames_laboratoriais as Record<string, unknown>;
  const comorbidadeBooleans = [
    "diabetes",
    "has",
    "cardiopatia",
    "neoplasia",
    "anemia",
    "insuficiencia_venosa",
    "insuficiencia_arterial",
    "insuficiencia_renal",
    "dislipidemias"
  ];
  const medicacaoBooleans = ["anticoagulante", "antibioticos", "corticoides"];
  const fatoresSociaisOptions = evaluationSchema.fatores_sociais as string[];

  return (
    <div className="grid h-full gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(420px,1.7fr)]">
      <aside
        ref={transcriptRef}
        className="relative h-[calc(100vh-160px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 border-b border-slate-100 bg-white px-6 pb-4 pt-6">
          <h2 className="text-lg font-semibold text-slate-800">Transcrição</h2>
          <p className="text-sm text-slate-500">Clique em um trecho para focar o campo correspondente.</p>
        </div>
        {transcriptSegments.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma transcrição disponível.</p>
        ) : (
          <div className="space-y-4">
            {transcriptSegments.map((segment) => {
              const isActive = segment.id === highlightSegmentId;
              const candidatePath = Object.entries(evidenceLookup).find(([, info]) =>
                segment.text.toLowerCase().includes(info.text.toLowerCase())
              )?.[0];
              return (
                <div
                  key={segment.id}
                  data-segment-id={segment.id}
                  className={cn(
                    "rounded-lg border p-3 text-sm transition",
                    isActive
                      ? "border-brand-400 bg-brand-50"
                      : "border-slate-200 hover:border-brand-200"
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => candidatePath && setFocusedPath(candidatePath)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && candidatePath) {
                      setFocusedPath(candidatePath);
                    }
                  }}
                >
                  <p className="font-mono text-xs text-slate-500">
                    {formatTimestamp(segment.startSeconds)} – {formatTimestamp(segment.endSeconds)}
                  </p>
                  <p className="mt-1 text-slate-700">{segment.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <section className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Ficha estruturada</h1>
            <p className="text-sm text-slate-500">Revise e ajuste os campos extraídos automaticamente.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={loadingAction === "save"}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {loadingAction === "save" ? "Salvando…" : "Salvar (versiona)"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("json")}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Exportar PDF
            </button>
          </div>
        </header>

        {confidenceMean != null && confidenceMean < 0.7 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Confiança média abaixo do ideal. Revise os campos com atenção.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Versões
            <select
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              onChange={(event) => handleSelectVersion(event.target.value)}
            >
              <option value="current">Versão atual</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {new Date(version.createdAt).toLocaleString("pt-BR")} · {version.createdBy ?? "—"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleCompareWithPrevious}
            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Comparar com versão anterior
          </button>
          <Link
            href={`/avaliacoes/nova?patientId=${patientId}`}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Duplicar para nova versão
          </Link>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</div>
        ) : null}

        <div className="space-y-6">
          <FieldCard
            title="Paciente"
            helperText="Informações demográficas do paciente"
            highlight={
              getConfidence("patient.nome") != null && getConfidence("patient.nome") < 0.75
                ? "warning"
                : isDiffGroup("patient")
                  ? "diff"
                  : null
            }
            actions={<ConfidenceBar value={getConfidence("patient.nome") ?? null} className="w-44" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Nome</span>
                <input
                  value={formData.patient?.nome ?? ""}
                  onChange={(event) => handleTextChange("patient.nome", event.target.value)}
                  onFocus={() => setFocusedPath("patient.nome")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Nome completo"
                />
                <EvidenceBadge evidence={getEvidence("patient.nome")} onClick={() => scrollToEvidence("patient.nome")} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Sexo</span>
                <select
                  value={formData.patient?.sexo ?? ""}
                  onChange={(event) => handleInputChange("patient.sexo", event.target.value || null)}
                  onFocus={() => setFocusedPath("patient.sexo")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Não informado</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Data de nascimento</span>
                <input
                  type="date"
                  value={formData.patient?.data_nascimento ?? ""}
                  onChange={(event) => handleDateChange("patient.data_nascimento", event.target.value)}
                  onFocus={() => setFocusedPath("patient.data_nascimento")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                {errors["patient.data_nascimento"] ? (
                  <span className="text-xs text-rose-600">{errors["patient.data_nascimento"]}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Telefone</span>
                <input
                  value={formData.patient?.telefone ?? ""}
                  onChange={(event) => handleTextChange("patient.telefone", event.target.value)}
                  onFocus={() => setFocusedPath("patient.telefone")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-600">Endereço</span>
                <input
                  value={formData.patient?.endereco ?? ""}
                  onChange={(event) => handleTextChange("patient.endereco", event.target.value)}
                  onFocus={() => setFocusedPath("patient.endereco")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-600">Alergias</span>
                <textarea
                  value={formData.patient?.alergias ?? ""}
                  onChange={(event) => handleTextChange("patient.alergias", event.target.value)}
                  onFocus={() => setFocusedPath("patient.alergias")}
                  className="min-h-[80px] rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Não informado"
                />
                <EvidenceBadge evidence={getEvidence("patient.alergias")} onClick={() => scrollToEvidence("patient.alergias")} />
              </label>
            </div>
          </FieldCard>

          <FieldCard
            title="Admissão"
            helperText="Dados do primeiro atendimento"
            actions={<ConfidenceBar value={getConfidence("admissao.data_admissao") ?? null} className="w-44" />}
            highlight={isDiffGroup("admissao") ? "diff" : null}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Data de admissão</span>
                <input
                  type="date"
                  value={formData.admissao?.data_admissao ?? ""}
                  onChange={(event) => handleDateChange("admissao.data_admissao", event.target.value)}
                  onFocus={() => setFocusedPath("admissao.data_admissao")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                {errors["admissao.data_admissao"] ? (
                  <span className="text-xs text-rose-600">{errors["admissao.data_admissao"]}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Peso (kg)</span>
                <input
                  inputMode="decimal"
                  value={formData.admissao?.peso_kg ?? ""}
                  onChange={(event) => handleNumberChange("admissao.peso_kg", event.target.value)}
                  onFocus={() => setFocusedPath("admissao.peso_kg")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="70"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Altura (m)</span>
                <input
                  inputMode="decimal"
                  value={formData.admissao?.altura_m ?? ""}
                  onChange={(event) => handleNumberChange("admissao.altura_m", event.target.value)}
                  onFocus={() => setFocusedPath("admissao.altura_m")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="1,70"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">IMC</span>
                <input
                  inputMode="decimal"
                  value={formData.admissao?.imc ?? ""}
                  onChange={(event) => handleNumberChange("admissao.imc", event.target.value)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="23.5"
                />
              </label>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hábitos</p>
              <div className="flex flex-wrap gap-2">
                {["tabagista", "etilista", "atividade_fisica", "sedentario", "pet_estimacao"].map((key) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="capitalize">{key.replaceAll("_", " ")}</span>
                    <select
                      value={formData.admissao?.habitos?.[key] ?? ""}
                      onChange={(event) => handleInputChange(`admissao.habitos.${key}`, event.target.value || null)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none"
                    >
                      <option value="">Não informado</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                      <option value="ex">Ex</option>
                      <option value="desconhecido">Desconhecido</option>
                    </select>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <span>Horas de sono/dia</span>
                <input
                  inputMode="decimal"
                  value={formData.admissao?.habitos?.sono_horas_dia ?? ""}
                  onChange={(event) => handleNumberChange("admissao.habitos.sono_horas_dia", event.target.value)}
                  className="w-24 rounded border border-slate-300 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Antiparasitárias</p>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(formData.admissao?.antiparasitarias_dt ?? {}).map(([key, value]) => (
                  <label key={key} className="flex flex-col gap-1 text-xs text-slate-600">
                    <span className="capitalize">{key}</span>
                    <input
                      type="date"
                      value={value ?? ""}
                      onChange={(event) => handleDateChange(`admissao.antiparasitarias_dt.${key}`, event.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                  </label>
                ))}
              </div>
            </div>
          </FieldCard>

          <FieldCard
            title="Comorbidades"
            helperText="Marque as comorbidades presentes"
            actions={<ConfidenceBar value={getConfidence("comorbidades.diabetes") ?? null} className="w-44" />}
            highlight={isDiffGroup("comorbidades") ? "diff" : null}
          >
            <div className="flex flex-wrap gap-2">
              {comorbidadeBooleans.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggleBoolean(`comorbidades.${key}`, !(formData.comorbidades?.[key] ?? false))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    formData.comorbidades?.[key]
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {key.replaceAll("_", " ")}
                </button>
              ))}
            </div>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs text-slate-600">Outros</span>
              <textarea
                value={formData.comorbidades?.outros ?? ""}
                onChange={(event) => handleTextChange("comorbidades.outros", event.target.value)}
                className="min-h-[60px] rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </FieldCard>

          <FieldCard
            title="Medicações"
            helperText="Revisar uso atual"
            actions={<ConfidenceBar value={getConfidence("medicacoes.anticoagulante") ?? null} className="w-44" />}
            highlight={isDiffGroup("medicacoes") ? "diff" : null}
          >
            <div className="flex flex-wrap gap-2">
              {medicacaoBooleans.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggleBoolean(`medicacoes.${key}`, !(formData.medicacoes?.[key] ?? false))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    formData.medicacoes?.[key]
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {key.replaceAll("_", " ")}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-600">Lista livres</span>
                <textarea
                  value={formData.medicacoes?.lista_livres ?? ""}
                  onChange={(event) => handleTextChange("medicacoes.lista_livres", event.target.value)}
                  className="min-h-[60px] rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-600">Outras</span>
                <textarea
                  value={formData.medicacoes?.outras ?? ""}
                  onChange={(event) => handleTextChange("medicacoes.outras", event.target.value)}
                  className="min-h-[60px] rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </FieldCard>

          <FieldCard
            title="Exame físico"
            helperText="Sinais vitais"
            error={errors["exame_fisico.pa_mmhg"]}
            highlight={
              getConfidence("exame_fisico.pa_mmhg") != null && getConfidence("exame_fisico.pa_mmhg") < 0.75
                ? "warning"
                : isDiffGroup("exame_fisico")
                  ? "diff"
                  : null
            }
            actions={<ConfidenceBar value={getConfidence("exame_fisico.pa_mmhg") ?? null} className="w-44" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">PA (mmHg)</span>
                <input
                  value={formData.exame_fisico?.pa_mmhg ?? ""}
                  onChange={(event) => handleTextChange("exame_fisico.pa_mmhg", event.target.value)}
                  onFocus={() => setFocusedPath("exame_fisico.pa_mmhg")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="120/80"
                />
                <EvidenceBadge evidence={getEvidence("exame_fisico.pa_mmhg")} onClick={() => scrollToEvidence("exame_fisico.pa_mmhg")} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Temperatura (°C)</span>
                <input
                  inputMode="decimal"
                  value={formData.exame_fisico?.temperatura_c ?? ""}
                  onChange={(event) => handleNumberChange("exame_fisico.temperatura_c", event.target.value)}
                  onFocus={() => setFocusedPath("exame_fisico.temperatura_c")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Pulso (bpm)</span>
                <input
                  inputMode="decimal"
                  value={formData.exame_fisico?.pulso_bpm ?? ""}
                  onChange={(event) => handleNumberChange("exame_fisico.pulso_bpm", event.target.value)}
                  onFocus={() => setFocusedPath("exame_fisico.pulso_bpm")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Respiração (irpm)</span>
                <input
                  inputMode="decimal"
                  value={formData.exame_fisico?.respiracao_irpm ?? ""}
                  onChange={(event) => handleNumberChange("exame_fisico.respiracao_irpm", event.target.value)}
                  onFocus={() => setFocusedPath("exame_fisico.respiracao_irpm")}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
            </div>
          </FieldCard>

          <FieldCard
            title="Avaliação dos sistemas"
            helperText="Selecione as opções aplicáveis"
            highlight={isDiffGroup("avaliacao_sistemas") ? "diff" : null}
          >
            <div className="space-y-4">
              {Object.entries(avaliacaoSistemasSchema).map(([key, value]) => {
                if (Array.isArray(value)) {
                  return (
                    <div key={key} className="space-y-2">
                      <p className="text-xs font-medium text-slate-600 capitalize">{key.replaceAll("_", " ")}</p>
                      {renderMultiSelect(`avaliacao_sistemas.${key}`, value as string[])}
                    </div>
                  );
                }
                if (typeof value === "object" && !Array.isArray(value)) {
                  return (
                    <div key={key} className="space-y-2">
                      <p className="text-xs font-medium text-slate-600 capitalize">{key.replaceAll("_", " ")}</p>
                      {Object.entries(value as Record<string, string>).map(([innerKey]) => (
                        <label key={innerKey} className="flex items-center gap-2 text-xs text-slate-600">
                          <span>{innerKey}</span>
                          <select
                            value={getValueAtPath(formData, `avaliacao_sistemas.${key}.${innerKey}`) ?? ""}
                            onChange={(event) =>
                              handleInputChange(`avaliacao_sistemas.${key}.${innerKey}`, event.target.value || null)
                            }
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="">Não informado</option>
                            <option value="sim">Sim</option>
                            <option value="nao">Não</option>
                            <option value="desconhecido">Desconhecido</option>
                          </select>
                        </label>
                      ))}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </FieldCard>

          <FieldCard
            title="Fatores sociais"
            helperText="Selecione todos os fatores relevantes"
            highlight={isDiffGroup("fatores_sociais") ? "diff" : null}
          >
            {renderMultiSelect("fatores_sociais", fatoresSociaisOptions)}
          </FieldCard>

          <FieldCard
            title="Exames laboratoriais"
            helperText="Resultados recentes"
            highlight={isDiffGroup("exames_laboratoriais") ? "diff" : null}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {Object.keys(examesLaboratoriaisSchema)
                .filter((key) => key !== "anexos")
                .map((key) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600 capitalize">{key.replaceAll("_", " ")}</span>
                    {key === "data_exame" ? (
                      <input
                        type="date"
                        value={formData.exames_laboratoriais?.[key] ?? ""}
                        onChange={(event) => handleDateChange(`exames_laboratoriais.${key}`, event.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      {errors[`exames_laboratoriais.${key}`] ? (
                        <span className="text-xs text-rose-600">{errors[`exames_laboratoriais.${key}`]}</span>
                      ) : null}
                    ) : (
                      <input
                        value={formData.exames_laboratoriais?.[key] ?? ""}
                        onChange={(event) => handleTextChange(`exames_laboratoriais.${key}`, event.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Não informado"
                      />
                    )}
                  </label>
                ))}
            </div>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs text-slate-600">Anexos</span>
              <textarea
                value={(formData.exames_laboratoriais?.anexos ?? []).join("\n")}
                onChange={(event) =>
                  handleInputChange(
                    "exames_laboratoriais.anexos",
                    event.target.value.split(/\n+/).filter(Boolean)
                  )
                }
                className="min-h-[60px] rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="URLs separados por linha"
              />
            </label>
          </FieldCard>

          <FieldCard
            title="Lesões"
            helperText="Gerencie até seis lesões"
            actions={<span className="text-xs text-slate-500">{lesionCards.length || 0} registradas</span>}
            highlight={isDiffGroup("lesoes") ? "diff" : null}
          >
            {lesionCards.length === 0 ? (
              <button
                type="button"
                onClick={handleAddLesion}
                className="rounded border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-brand-300"
              >
                Adicionar lesão
              </button>
            ) : (
              <div className="space-y-4">
                {lesionCards.map((lesion: any, index: number) => (
                  <LesionCard
                    key={index}
                    index={index}
                    rotulo={lesion.rotulo ?? `L${index + 1}`}
                    data={lesion}
                    confidences={confidences}
                    evidences={evidences}
                    onChange={(path, value) => handleInputChange(path, value)}
                    onRemove={() => handleRemoveLesion(index)}
                  />
                ))}
                {lesionCards.length < 6 ? (
                  <button
                    type="button"
                    onClick={handleAddLesion}
                    className="rounded border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-brand-300"
                  >
                    Adicionar lesão
                  </button>
                ) : null}
              </div>
            )}
          </FieldCard>

          <FieldCard
            title="Hipóteses etiológicas e intervenções"
            helperText="Revise ou adicione intervenções"
            highlight={isDiffGroup("hipotese_etiologica_intervencoes") ? "diff" : null}
          >
            <div className="space-y-3">
              {(formData.hipotese_etiologica_intervencoes ?? []).map((item: any, index: number) => (
                <div key={index} className="rounded border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">#{item.numero ?? index + 1}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveHypothesis(index)}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-600">Etiologia</span>
                      <select
                        value={item.etiologia ?? "Outro"}
                        onChange={(event) =>
                          handleInputChange(`hipotese_etiologica_intervencoes.${index}.etiologia`, event.target.value)
                        }
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      >
                        {[
                          "LPP",
                          "UA",
                          "UV",
                          "UM",
                          "PD",
                          "QD",
                          "FO",
                          "EP",
                          "FT",
                          "ST",
                          "LO",
                          "LT",
                          "Outro"
                        ].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2">
                      <span className="text-xs text-slate-600">Intervenções de enfermagem</span>
                      <textarea
                        value={item.intervencoes_enfermagem ?? ""}
                        onChange={(event) =>
                          handleTextChange(
                            `hipotese_etiologica_intervencoes.${index}.intervencoes_enfermagem`,
                            event.target.value
                          )
                        }
                        className="min-h-[80px] rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddHypothesis}
                className="rounded border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-brand-300"
              >
                Adicionar hipótese
              </button>
            </div>
          </FieldCard>

          <FieldCard
            title="Observações e condutas"
            helperText="Resumo clínico e próximos passos"
            highlight={
              getConfidence("observacoes_importantes") != null && getConfidence("observacoes_importantes") < 0.75
                ? "warning"
                : isDiffGroup("observacoes_importantes") || isDiffGroup("conduta_prescricao") || isDiffGroup("encaminhamentos")
                  ? "diff"
                  : null
            }
            actions={<ConfidenceBar value={getConfidence("observacoes_importantes") ?? null} className="w-44" />}
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Observações importantes</span>
              <textarea
                value={formData.observacoes_importantes ?? ""}
                onChange={(event) => handleTextChange("observacoes_importantes", event.target.value)}
                onFocus={() => setFocusedPath("observacoes_importantes")}
                className="min-h-[100px] rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Não informado"
              />
              <EvidenceBadge
                evidence={getEvidence("observacoes_importantes")}
                onClick={() => scrollToEvidence("observacoes_importantes")}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Conduta / Prescrição</span>
              <textarea
                value={formData.conduta_prescricao ?? ""}
                onChange={(event) => handleTextChange("conduta_prescricao", event.target.value)}
                className="min-h-[80px] rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Encaminhamentos</span>
              <textarea
                value={formData.encaminhamentos ?? ""}
                onChange={(event) => handleTextChange("encaminhamentos", event.target.value)}
                className="min-h-[60px] rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </FieldCard>

          <FieldCard
            title="Alterações de prescrição"
            helperText="Histórico de ajustes"
            highlight={isDiffGroup("alteracoes_prescricao") ? "diff" : null}
          >
            <div className="space-y-3">
              {(formData.alteracoes_prescricao ?? []).map((item: any, index: number) => (
                <div key={index} className="rounded border border-slate-200 p-3">
                  <div className="grid gap-3 md:grid-cols-[150px_1fr_auto]">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-600">Data</span>
                      <input
                        type="date"
                        value={item.data ?? ""}
                        onChange={(event) => handleDateChange(`alteracoes_prescricao.${index}.data`, event.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      {errors[`alteracoes_prescricao.${index}.data`] ? (
                        <span className="text-xs text-rose-600">{errors[`alteracoes_prescricao.${index}.data`]}</span>
                      ) : null}
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2">
                      <span className="text-xs text-slate-600">Descrição</span>
                      <textarea
                        value={item.descricao ?? ""}
                        onChange={(event) =>
                          handleTextChange(`alteracoes_prescricao.${index}.descricao`, event.target.value)
                        }
                        className="min-h-[60px] rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePrescriptionChange(index)}
                    className="mt-2 text-xs font-medium text-rose-600 hover:underline"
                  >
                    Remover alteração
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPrescriptionChange}
                className="rounded border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-brand-300"
              >
                Adicionar alteração
              </button>
            </div>
          </FieldCard>

          <FieldCard title="Metadados da extração" helperText="Confiança por campo e evidências">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(confidences ?? {}).map(([path, value]) => (
                <div key={path} className="rounded border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-600">{path}</p>
                  <ConfidenceBar value={value} className="mt-2" />
                  <EvidenceBadge
                    evidence={getEvidence(path)}
                    className="mt-2"
                    onClick={() => scrollToEvidence(path)}
                  />
                </div>
              ))}
            </div>
          </FieldCard>
        </div>
      </section>
    </div>
  );
}
