export interface IOpenrouterResponseApiResponse {
  id: string;
  provider: string;
  model: string;
  object: string;
  created: number;
  choices: Choice[];
  usage: Usage;
}

export interface Choice {
  logprobs: null | any;
  finish_reason: string;
  native_finish_reason: string;
  index: number;
  message: Message;
}

export interface Message {
  role: string;
  content: string;
  refusal: null | any;
  reasoning: null | any;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: null | any;
}
