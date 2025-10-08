import evaluationSchemaJson from "@/schema/enfy-evaluation.schema.json";

export const evaluationSchema = evaluationSchemaJson;

type SchemaNode =
  | string
  | SchemaNode[]
  | { [key: string]: SchemaNode };

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

function instantiateNode(node: SchemaNode): JsonValue {
  if (typeof node === "string") {
    return null;
  }

  if (Array.isArray(node)) {
    return [];
  }

  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(node)) {
    result[key] = instantiateNode(value);
  }
  return result;
}

export type EvaluationJson = ReturnType<typeof createEmptyEvaluationPayload>;

export function createEmptyEvaluationPayload() {
  return instantiateNode(evaluationSchema) as Record<string, JsonValue>;
}
