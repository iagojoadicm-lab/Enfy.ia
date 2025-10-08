import { describe, expect, it } from "vitest";
import { extractStructuredData } from "@/src/services/nlp";

describe("extractStructuredData", () => {
  it("retorna payload com confiança média", async () => {
    const result = await extractStructuredData("Paciente sem alergia, pressão doze por oito.");
    expect(result.confidenceMean).toBeGreaterThan(0);
    expect(result.jsonPayload.metadados_extracao.confidence_por_campo["patient.nome"]).toBeDefined();
  });
});
