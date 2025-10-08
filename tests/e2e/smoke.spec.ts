import { test, expect } from "@playwright/test";

function extractPatientId(url: string) {
  const match = url.match(/pacientes\/(.*)\/avaliacoes/);
  return match ? match[1] : null;
}

test("fluxo de login, cadastro e exportação", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@enfy.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL("**/pacientes");
  await expect(page.getByRole("heading", { name: "Pacientes" })).toBeVisible();

  await page.getByRole("link", { name: "Novo paciente" }).click();

  const patientName = `Paciente teste ${Date.now()}`;
  await page.getByLabel("Nome").fill(patientName);
  await page.getByLabel("Telefone").fill("11999999999");
  await page.getByRole("button", { name: "Salvar paciente" }).click();

  await page.waitForURL("**/pacientes/**/avaliacoes");
  const patientId = extractPatientId(page.url());
  if (!patientId) {
    throw new Error("Paciente não encontrado após cadastro");
  }

  await page.getByRole("link", { name: "Nova avaliação" }).click();
  await page.waitForURL("**/avaliacoes/nova**");

  const transcript =
    "Paciente nega alergias. Pressão doze por oito, temperatura trinta e seis e meio.";
  const extractionResponse = await page.request.post("/api/nlp/extract", {
    data: { transcript }
  });
  expect(extractionResponse.ok()).toBeTruthy();
  const extraction = await extractionResponse.json();

  const evaluationResponse = await page.request.post("/api/evaluations", {
    data: {
      patientId,
      audioUrl: "https://example.com/audio.mp3",
      sourceAudioId: "audio-test",
      transcript,
      transcriptId: "transcript-test",
      extraction
    }
  });
  expect(evaluationResponse.ok()).toBeTruthy();
  const { id: evaluationId } = await evaluationResponse.json();
  expect(evaluationId).toBeTruthy();

  await page.goto(`/avaliacoes/${evaluationId}`);
  await expect(page.getByText("Ficha estruturada")).toBeVisible();

  const exportResponse = await page.request.get(`/api/export/${evaluationId}.json`);
  expect(exportResponse.ok()).toBeTruthy();
  const exported = await exportResponse.json();
  expect(exported.metadados_extracao).toBeDefined();
});
