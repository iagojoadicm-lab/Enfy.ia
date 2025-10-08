import { describe, expect, it } from "vitest";
import { extractStructuredData } from "@/src/services/nlp";

describe("extractStructuredData", () => {
  it("extrai pressão arterial e temperatura a partir do transcript", async () => {
    const transcript =
      "Paciente nega alergias. Pressão doze por oito e temperatura trinta e seis e meio.";
    const result = await extractStructuredData(transcript);

    expect(result.jsonPayload.exame_fisico.pa_mmhg).toBe("120/80");
    expect(result.jsonPayload.exame_fisico.temperatura_c).toBe(36.5);
    expect(result.jsonPayload.patient.alergias).toContain("nega");
    expect(result.evidencias["exame_fisico.pa_mmhg"]).toMatch(/\[00:00-00:04\]/);
    expect(result.confidenceMean).toBeGreaterThan(0.7);
  });
});
