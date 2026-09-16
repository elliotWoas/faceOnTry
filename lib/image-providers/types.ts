export type HairEditMode = "try-hairstyle" | "recommend-hairstyle";

export type ProviderId = "gemini" | "replicate" | "ninerouter" | "avalai" | "generic";

export interface HairEditRequest {
  mode: HairEditMode;
  userImage: Buffer;
  userImageMime: string;
  referenceImage?: Buffer;
  referenceImageMime?: string;
  provider?: ProviderId;
  model?: string;
}

export interface HairEditResult {
  imageUrl: string;
  hairstyleName?: string;
  explanation?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: ProviderId;
  description: string;
  isConfigured: boolean;
  costEstimate: string;
}

export interface ProviderStatus {
  gemini: boolean;
  replicate: boolean;
  nineRouter: boolean;
  avalAi: boolean;
}
