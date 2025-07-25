type CompletionType = "normal" | "snippet";

interface CommandModule {
  identifier: string,
  handler: (...args: any[]) => any
}

interface ServiceInfo {
  name: string,
  openapi: string,
  docs: string,
  message?: string
}

interface ModelInfo {
  _id: string,
  delimiting_tokens?: ModelSpecialTokens,
  disclaimer?: { accepted?: boolean },
  display_name: string,
  doc_link: string,
  endpoints?: ModelEndpoints,
  license: { name: string, link: string }
  model_id: string,
  moderations?: ModelModerations,
  parameters?: ModelParameters,
  prompt_type?: number,
  token_limit?: number,
}

interface ModelsList {
  models: ModelInfo[];
}

interface ModelDisclaimerAcceptance {
  model?: string,
  accepted: boolean
}

interface ModelPromptAcceptance {
  accepted: boolean
}

interface ModelDisclaimer extends ModelDisclaimerAcceptance {
  _id: string,
  version: string,
  title: string,
  body: string,
}

interface ModelPrompt {
  input: string,
  parameters?: ModelParameters,
  moderations?: ModelModerations
}

interface ModelPromptResults {
  generated_text?: string,
  generated_token_count?: number,
  input_token_count?: number,
  stop_reason?: number
}

interface ModelPromptResponse {
  results: ModelPromptResults[],
  prompt_id: string,
  created_at?: string
}

interface ResponseMessage {
  success?: boolean
  message?: string
}

interface ModelEndpoints {
  generation_endpoint?: string,
  moderation_endpoint?: string
}

interface ModelParameters {
  temperature?: number,
  max_new_tokens?: number
}

interface ModelModerations {
  hap?: number,
  implicit_hate?: number,
  stigma?: number
}

interface ModelSpecialTokens {
  start_token: string,
  middle_token: string,
  end_token: string
}

interface QiskitAccountJson {
  "qiskit-code-assistant"?: {
    token?: string
  },
  "default-ibm-quantum-platform"?: {
    token?: string
  },
  "default-ibm-quantum"?: {
    token?: string
  }
}
