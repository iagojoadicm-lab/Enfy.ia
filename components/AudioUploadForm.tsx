"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import type { Patient } from "@prisma/client";

interface Props {
  patients: Patient[];
  patientId: string | null;
}

interface StepState {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
}

export default function AudioUploadForm({ patients, patientId }: Props) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<string>(
    patientId ?? (patients[0]?.id ?? "")
  );
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [status, setStatus] = useState<StepState>({ status: "idle" });
  const [consentLogged, setConsentLogged] = useState(false);

  useEffect(() => {
    setConsentLogged(false);
  }, [selectedPatient]);

  async function handleConsent() {
    try {
      await axios.post("/api/logs/consent", {
        patientId: selectedPatient,
        timestamp: new Date().toISOString()
      });
      setConsentLogged(true);
    } catch (error) {
      console.error(error);
      setStatus({ status: "error", message: "Não foi possível registrar o consentimento." });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!audioFile || !selectedPatient) {
      setStatus({ status: "error", message: "Selecione paciente e áudio." });
      return;
    }

    if (!consentLogged) {
      setStatus({ status: "error", message: "Registre o consentimento antes de continuar." });
      return;
    }

    setStatus({ status: "loading", message: "Enviando áudio..." });

    const formData = new FormData();
    formData.append("file", audioFile);

    try {
      const uploadResponse = await axios.post("/api/audio/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const { audioUrl, sourceAudioId } = uploadResponse.data;

      setStatus({ status: "loading", message: "Transcrevendo áudio..." });
      const asrResponse = await axios.post("/api/asr/transcribe", {
        audioUrl,
        sourceAudioId
      });

      setTranscript(asrResponse.data.transcript);

      setStatus({ status: "loading", message: "Extraindo ficha estruturada..." });
      const nlpResponse = await axios.post("/api/nlp/extract", {
        transcript: asrResponse.data.transcript,
        transcriptId: asrResponse.data.transcriptId
      });

      const evaluationResponse = await axios.post("/api/evaluations", {
        patientId: selectedPatient,
        audioUrl,
        sourceAudioId,
        transcript: asrResponse.data.transcript,
        transcriptId: asrResponse.data.transcriptId,
        extraction: nlpResponse.data
      });

      setStatus({ status: "success", message: "Avaliação criada com sucesso!" });
      router.push(`/avaliacoes/${evaluationResponse.data.id}`);
    } catch (error) {
      console.error(error);
      setStatus({
        status: "error",
        message: "Não foi possível processar o áudio. Tente novamente."
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Selecionar paciente
        </label>
        <select
          value={selectedPatient}
          onChange={(event) => setSelectedPatient(event.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          disabled={patients.length === 0}
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.nome}
            </option>
          ))}
        </select>
        {patients.length === 0 ? (
          <p className="text-xs text-red-600">
            Cadastre um paciente antes de iniciar a avaliação.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleConsent}
        className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        disabled={consentLogged}
      >
        {consentLogged ? "Consentimento registrado" : "Registrar consentimento"}
      </button>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Upload de áudio (PT-BR)
        </label>
        <input
          type="file"
          accept="audio/*"
          onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
          className="w-full rounded border border-dashed border-slate-300 px-3 py-6 text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <p className="text-xs text-slate-500">
          Confirme o consentimento do paciente antes da gravação.
        </p>
      </div>

      <button
        type="submit"
        className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
        disabled={status.status === "loading"}
      >
        {status.status === "loading" ? status.message ?? "Processando..." : "Processar áudio"}
      </button>

      {status.status === "error" ? (
        <p className="text-sm text-red-600">{status.message}</p>
      ) : null}

      {transcript ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Prévia da transcrição</p>
          <p className="mt-2 whitespace-pre-wrap">{transcript.slice(0, 400)}...</p>
        </div>
      ) : null}
    </form>
  );
}
