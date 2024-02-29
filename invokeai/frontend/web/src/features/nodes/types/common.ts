import { z } from 'zod';

// #region Field data schemas
export const zImageField = z.object({
  image_name: z.string().trim().min(1),
});
export type ImageField = z.infer<typeof zImageField>;

export const zBoardField = z.object({
  board_id: z.string().trim().min(1),
});
export type BoardField = z.infer<typeof zBoardField>;

export const zColorField = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255),
  a: z.number().int().min(0).max(255),
});
export type ColorField = z.infer<typeof zColorField>;

export const zClassification = z.enum(['stable', 'beta', 'prototype']);
export type Classification = z.infer<typeof zClassification>;

export const zSchedulerField = z.enum([
  'euler',
  'deis',
  'ddim',
  'ddpm',
  'dpmpp_2s',
  'dpmpp_2m',
  'dpmpp_2m_sde',
  'dpmpp_sde',
  'heun',
  'kdpm_2',
  'lms',
  'pndm',
  'unipc',
  'euler_k',
  'dpmpp_2s_k',
  'dpmpp_2m_k',
  'dpmpp_2m_sde_k',
  'dpmpp_sde_k',
  'heun_k',
  'lms_k',
  'euler_a',
  'kdpm_2_a',
  'lcm',
]);
export type SchedulerField = z.infer<typeof zSchedulerField>;
// #endregion

// #region Model-related schemas
export const zBaseModel = z.enum(['any', 'sd-1', 'sd-2', 'sdxl', 'sdxl-refiner']);
export const zModelType = z.enum([
  'main',
  'vae',
  'lora',
  'controlnet',
  'embedding',
  'ip_adapter',
  'clip_vision',
  't2i_adapter',
  'onnx', // TODO(psyche): Remove this when removed from backend
]);
export const zModelName = z.string().min(3);
export const zModelIdentifier = z.object({
  key: z.string().min(1),
});
export const isModelIdentifier = (field: unknown): field is ModelIdentifier =>
  zModelIdentifier.safeParse(field).success;
export const zModelFieldBase = zModelIdentifier;
export const zModelIdentifierWithBase = zModelIdentifier.extend({ base: zBaseModel });
export type BaseModel = z.infer<typeof zBaseModel>;
export type ModelType = z.infer<typeof zModelType>;
export type ModelIdentifier = z.infer<typeof zModelIdentifier>;
export type ModelIdentifierWithBase = z.infer<typeof zModelIdentifierWithBase>;
export const zMainModelField = zModelIdentifierWithBase;
export type MainModelField = z.infer<typeof zMainModelField>;

export const zSDXLRefinerModelField = zModelIdentifier;
export type SDXLRefinerModelField = z.infer<typeof zSDXLRefinerModelField>;

export const zSubModelType = z.enum([
  'unet',
  'text_encoder',
  'text_encoder_2',
  'tokenizer',
  'tokenizer_2',
  'vae',
  'vae_decoder',
  'vae_encoder',
  'scheduler',
  'safety_checker',
]);
export type SubModelType = z.infer<typeof zSubModelType>;

export const zVAEModelField = zModelIdentifierWithBase;

export const zModelInfo = zModelIdentifier.extend({
  submodel_type: zSubModelType.nullish(),
});
export type ModelInfo = z.infer<typeof zModelInfo>;

export const zLoRAModelField = zModelIdentifierWithBase;
export type LoRAModelField = z.infer<typeof zLoRAModelField>;

export const zControlNetModelField = zModelIdentifierWithBase;
export type ControlNetModelField = z.infer<typeof zControlNetModelField>;

export const zIPAdapterModelField = zModelIdentifierWithBase;
export type IPAdapterModelField = z.infer<typeof zIPAdapterModelField>;

export const zT2IAdapterModelField = zModelIdentifierWithBase;
export type T2IAdapterModelField = z.infer<typeof zT2IAdapterModelField>;

export const zLoraInfo = zModelInfo.extend({
  weight: z.number().optional(),
});
export type LoraInfo = z.infer<typeof zLoraInfo>;

export const zUNetField = z.object({
  unet: zModelInfo,
  scheduler: zModelInfo,
  loras: z.array(zLoraInfo),
});
export type UNetField = z.infer<typeof zUNetField>;

export const zCLIPField = z.object({
  tokenizer: zModelInfo,
  text_encoder: zModelInfo,
  skipped_layers: z.number(),
  loras: z.array(zLoraInfo),
});
export type CLIPField = z.infer<typeof zCLIPField>;

export const zVAEField = z.object({
  vae: zModelInfo,
});
export type VAEField = z.infer<typeof zVAEField>;
// #endregion

// #region Control Adapters
export const zControlField = z.object({
  image: zImageField,
  control_model: zModelFieldBase,
  control_weight: z.union([z.number(), z.array(z.number())]).optional(),
  begin_step_percent: z.number().optional(),
  end_step_percent: z.number().optional(),
  control_mode: z.enum(['balanced', 'more_prompt', 'more_control', 'unbalanced']).optional(),
  resize_mode: z.enum(['just_resize', 'crop_resize', 'fill_resize', 'just_resize_simple']).optional(),
});
export type ControlField = z.infer<typeof zControlField>;

export const zIPAdapterField = z.object({
  image: zImageField,
  ip_adapter_model: zModelFieldBase,
  weight: z.number(),
  begin_step_percent: z.number().optional(),
  end_step_percent: z.number().optional(),
});
export type IPAdapterField = z.infer<typeof zIPAdapterField>;

export const zT2IAdapterField = z.object({
  image: zImageField,
  t2i_adapter_model: zModelFieldBase,
  weight: z.union([z.number(), z.array(z.number())]).optional(),
  begin_step_percent: z.number().optional(),
  end_step_percent: z.number().optional(),
  resize_mode: z.enum(['just_resize', 'crop_resize', 'fill_resize', 'just_resize_simple']).optional(),
});
export type T2IAdapterField = z.infer<typeof zT2IAdapterField>;
// #endregion

// #region ProgressImage
export const zProgressImage = z.object({
  dataURL: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type ProgressImage = z.infer<typeof zProgressImage>;
// #endregion

// #region ImageOutput
export const zImageOutput = z.object({
  image: zImageField,
  width: z.number().int().gt(0),
  height: z.number().int().gt(0),
  type: z.literal('image_output'),
});
export type ImageOutput = z.infer<typeof zImageOutput>;
export const isImageOutput = (output: unknown): output is ImageOutput => zImageOutput.safeParse(output).success;
// #endregion
