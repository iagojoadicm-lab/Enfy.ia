import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/session";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 12, fontFamily: "Helvetica" },
  section: { marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  label: { fontWeight: 700 }
});

interface Params {
  params: { id: string };
}

export async function GET(request: Request, { params }: Params) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const anonymize = searchParams.get("anon") === "true";

  const evaluation = await prisma.evaluation.findUnique({ where: { id: params.id } });

  if (!evaluation) {
    return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  }

  const payload = evaluation.jsonPayload as any;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.title}>Enfy - Avaliação de Feridas</Text>
          <Text>
            {anonymize ? "Paciente Anônimo" : payload.patient.nome} · Data:
            {" "}
            {new Date(evaluation.createdAt).toLocaleDateString("pt-BR")}
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Observações importantes</Text>
          <Text>{payload.observacoes_importantes ?? "—"}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Exame físico</Text>
          <Text>Pressão arterial: {payload.exame_fisico.pa_mmhg ?? "—"}</Text>
          <Text>Temperatura: {payload.exame_fisico.temperatura_c ?? "—"} °C</Text>
          <Text>Pulso: {payload.exame_fisico.pulso_bpm ?? "—"} bpm</Text>
        </View>
      </Page>
    </Document>
  );

  const pdfBuffer = await pdf(doc).toBuffer();
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=avaliacao-${evaluation.id}.pdf`
    }
  });
}
