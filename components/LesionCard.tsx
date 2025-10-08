"use client";

import { ChangeEvent } from "react";
import { FieldCard } from "./FieldCard";
import { ConfidenceBar } from "./ConfidenceBar";
import { EvidenceBadge } from "./EvidenceBadge";

interface LesionCardProps {
  index: number;
  rotulo: string;
  data: any;
  confidences: Record<string, number>;
  evidences: Record<string, string>;
  onChange: (path: string, value: unknown) => void;
  onRemove?: () => void;
}

export function LesionCard({
  index,
  rotulo,
  data,
  confidences,
  evidences,
  onChange,
  onRemove
}: LesionCardProps) {
  const basePath = `lesoes.${index}`;

  const handleInput = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    onChange(`${basePath}.${name}`, value.length ? value : null);
  };

  return (
    <FieldCard
      title={`Lesão ${rotulo}`}
      helperText="Descreva a lesão conforme avaliação clínica."
      actions={
        <div className="flex items-center gap-2">
          <ConfidenceBar value={confidences[`${basePath}.rotulo`]} className="w-40" />
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              Remover
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Rótulo</span>
          <input
            name="rotulo"
            value={data.rotulo ?? ""}
            onChange={handleInput}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="L1"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-slate-600">História</span>
          <textarea
            name="historia"
            value={data.historia ?? ""}
            onChange={handleInput}
            className="min-h-[80px] rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Evolução da lesão"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-slate-600">Exames complementares</span>
          <textarea
            name="exames_complementares"
            value={data.exames_complementares ?? ""}
            onChange={handleInput}
            className="min-h-[80px] rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Complementos diagnósticos"
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Características</p>
        {Object.entries(data.caracteristicas ?? {}).map(([key, value]) => {
          const path = `${basePath}.caracteristicas.${key}`;
          if (Array.isArray(value)) {
            return (
              <div key={key} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-600">{key}</p>
                <p className="text-xs text-slate-500">{value.join(", ") || "Não informado"}</p>
                <ConfidenceBar value={confidences[path]} className="mt-2" />
                <EvidenceBadge evidence={evidences[path]} className="mt-2" />
              </div>
            );
          }

          if (typeof value === "object" && value) {
            return (
              <div key={key} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-600">{key}</p>
                {Object.entries(value).map(([innerKey, innerValue]) => {
                  const innerPath = `${path}.${innerKey}`;
                  return (
                    <p key={innerKey} className="text-xs text-slate-600">
                      {innerKey}: {innerValue ?? "Não informado"}
                      <ConfidenceBar value={confidences[innerPath]} className="mt-1" />
                      <EvidenceBadge evidence={evidences[innerPath]} className="mt-1" />
                    </p>
                  );
                })}
              </div>
            );
          }

          return (
            <p key={key} className="text-xs text-slate-500">
              {key}: {value ?? "Não informado"}
            </p>
          );
        })}
      </div>
    </FieldCard>
  );
}
