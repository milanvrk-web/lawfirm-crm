// ─────────────────────────────────────────────────────────────────────────────
// LLM helper — powered by Groq API (llama-3.3-70b-versatile)
// Drop-in replacement for the Manus Forge LLM helper.
// Set GROQ_API_KEY in your environment to enable AI features.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type Message = {
  role: Role;
  content: string | Array<TextContent | ImageContent>;
};

export type JsonSchema = {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

export type ResponseFormat =
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" };

export type OutputSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type InvokeParams = {
  messages: Message[];
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  tools?: unknown[];
  toolChoice?: unknown;
  tool_choice?: unknown;
};

export type InvokeResult = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Primary model: llama-3.3-70b-versatile (fast, free tier, great for structured JSON)
const GROQ_MODEL = "llama-3.3-70b-versatile";

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY ?? "";
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not configured. Set it in your environment variables."
    );
  }
  return key;
}

function normalizeMessage(msg: Message): Record<string, unknown> {
  if (typeof msg.content === "string") {
    return { role: msg.role, content: msg.content };
  }
  // Groq supports text content arrays; strip image_url parts (not supported on free tier)
  const textParts = (msg.content as Array<TextContent | ImageContent>)
    .filter((c): c is TextContent => c.type === "text")
    .map(c => c.text)
    .join("\n");
  return { role: msg.role, content: textParts };
}

function normalizeResponseFormat(params: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}): Record<string, unknown> | undefined {
  const explicit = params.responseFormat || params.response_format;
  if (explicit) {
    // Groq supports json_object but not json_schema — fall back to json_object
    if (explicit.type === "json_schema" || explicit.type === "json_object") {
      return { type: "json_object" };
    }
    return undefined;
  }

  const schema = params.outputSchema || params.output_schema;
  if (schema) {
    return { type: "json_object" };
  }

  return undefined;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = getGroqApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages: messages.map(normalizeMessage),
    max_tokens: 8192,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    const tc = toolChoice || tool_choice;
    if (tc) payload.tool_choice = tc;
  }

  const normalizedFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });
  if (normalizedFormat) {
    payload.response_format = normalizedFormat;
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Groq LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
