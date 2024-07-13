from __future__ import annotations

import PIL.Image
import torch
import torchvision.transforms as T
from diffusers.models.unets.unet_2d_condition import UNet2DConditionModel
from diffusers.schedulers.scheduling_utils import SchedulerMixin, SchedulerOutput
from tqdm.auto import tqdm

from invokeai.app.services.config.config_default import get_config
from invokeai.backend.stable_diffusion.denoise_context import DenoiseContext, UNetKwargs

# TODO: remove and fix imports
from invokeai.backend.stable_diffusion.extensions import PipelineIntermediateState  # noqa: F401
from invokeai.backend.stable_diffusion.extensions_manager import ExtensionsManager


def trim_to_multiple_of(*args, multiple_of=8):
    return tuple((x - x % multiple_of) for x in args)


def image_resized_to_grid_as_tensor(image: PIL.Image.Image, normalize: bool = True, multiple_of=8) -> torch.FloatTensor:
    """

    :param image: input image
    :param normalize: scale the range to [-1, 1] instead of [0, 1]
    :param multiple_of: resize the input so both dimensions are a multiple of this
    """
    w, h = trim_to_multiple_of(*image.size, multiple_of=multiple_of)
    transformation = T.Compose(
        [
            T.Resize((h, w), T.InterpolationMode.LANCZOS, antialias=True),
            T.ToTensor(),
        ]
    )
    tensor = transformation(image)
    if normalize:
        tensor = tensor * 2.0 - 1.0
    return tensor


class StableDiffusionBackend:
    def __init__(
        self,
        unet: UNet2DConditionModel,
        scheduler: SchedulerMixin,
    ):
        self.unet = unet
        self.scheduler = scheduler
        config = get_config()
        self.sequential_guidance = config.sequential_guidance

    def latents_from_embeddings(self, ctx: DenoiseContext, ext_manager: ExtensionsManager):
        if ctx.init_timestep.shape[0] == 0:
            return ctx.latents

        ctx.orig_latents = ctx.latents.clone()

        if ctx.noise is not None:
            batch_size = ctx.latents.shape[0]
            # latents = noise * self.scheduler.init_noise_sigma # it's like in t2l according to diffusers
            ctx.latents = ctx.scheduler.add_noise(ctx.latents, ctx.noise, ctx.init_timestep.expand(batch_size))

        # if no work to do, return latents
        if ctx.timesteps.shape[0] == 0:
            return ctx.latents

        # ext: inpaint[pre_denoise_loop, priority=normal] (maybe init, but not sure if it needed)
        # ext: preview[pre_denoise_loop, priority=low]
        ext_manager.modifiers.pre_denoise_loop(ctx)

        for ctx.step_index, ctx.timestep in enumerate(tqdm(ctx.timesteps)):  # noqa: B020
            # ext: inpaint (apply mask to latents on non-inpaint models)
            ext_manager.modifiers.pre_step(ctx)

            # ext: tiles? [override: step]
            ctx.step_output = ext_manager.overrides.step(self.step, ctx, ext_manager)

            # ext: inpaint[post_step, priority=high] (apply mask to preview on non-inpaint models)
            # ext: preview[post_step, priority=low]
            ext_manager.modifiers.post_step(ctx)

            ctx.latents = ctx.step_output.prev_sample

        # ext: inpaint[post_denoise_loop] (restore unmasked part)
        ext_manager.modifiers.post_denoise_loop(ctx)
        return ctx.latents

    @torch.inference_mode()
    def step(self, ctx: DenoiseContext, ext_manager: ExtensionsManager) -> SchedulerOutput:
        ctx.latent_model_input = ctx.scheduler.scale_model_input(ctx.latents, ctx.timestep)

        if self.sequential_guidance:
            conditioning_call = self._apply_standard_conditioning_sequentially
        else:
            conditioning_call = self._apply_standard_conditioning

        # not sure if here needed override
        ctx.negative_noise_pred, ctx.positive_noise_pred = conditioning_call(ctx, ext_manager)

        # ext: override combine_noise
        ctx.noise_pred = ext_manager.overrides.combine_noise(self.combine_noise, ctx)

        # ext: cfg_rescale [modify_noise_prediction]
        ext_manager.modifiers.modify_noise_prediction(ctx)

        # compute the previous noisy sample x_t -> x_t-1
        step_output = ctx.scheduler.step(ctx.noise_pred, ctx.timestep, ctx.latents, **ctx.scheduler_step_kwargs)

        # del locals
        del ctx.latent_model_input
        del ctx.negative_noise_pred
        del ctx.positive_noise_pred
        del ctx.noise_pred

        return step_output

    @staticmethod
    def combine_noise(ctx: DenoiseContext) -> torch.Tensor:
        guidance_scale = ctx.conditioning_data.guidance_scale
        if isinstance(guidance_scale, list):
            guidance_scale = guidance_scale[ctx.step_index]

        return torch.lerp(ctx.negative_noise_pred, ctx.positive_noise_pred, guidance_scale)
        # return ctx.negative_noise_pred + guidance_scale * (ctx.positive_noise_pred - ctx.negative_noise_pred)

    def _apply_standard_conditioning(
        self, ctx: DenoiseContext, ext_manager: ExtensionsManager
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Runs the conditioned and unconditioned UNet forward passes in a single batch for faster inference speed at
        the cost of higher memory usage.
        """

        ctx.unet_kwargs = UNetKwargs(
            sample=torch.cat([ctx.latent_model_input] * 2),
            timestep=ctx.timestep,
            encoder_hidden_states=None,  # set later by conditoning
            cross_attention_kwargs=dict(  # noqa: C408
                percent_through=ctx.step_index / len(ctx.timesteps),  # ctx.total_steps,
            ),
        )

        ctx.conditioning_mode = "both"
        ctx.conditioning_data.to_unet_kwargs(ctx.unet_kwargs, ctx.conditioning_mode)

        # ext: controlnet/ip/t2i [pre_unet_forward]
        ext_manager.modifiers.pre_unet_forward(ctx)

        # ext: inpaint [pre_unet_forward, priority=low]
        # or
        # ext: inpaint [override: unet_forward]
        both_results = self._unet_forward(**vars(ctx.unet_kwargs))
        negative_next_x, positive_next_x = both_results.chunk(2)
        # del locals
        del ctx.unet_kwargs
        del ctx.conditioning_mode
        return negative_next_x, positive_next_x

    def _apply_standard_conditioning_sequentially(self, ctx: DenoiseContext, ext_manager: ExtensionsManager):
        """Runs the conditioned and unconditioned UNet forward passes sequentially for lower memory usage at the cost of
        slower execution speed.
        """

        ###################
        # Negative pass
        ###################

        ctx.unet_kwargs = UNetKwargs(
            sample=ctx.latent_model_input,
            timestep=ctx.timestep,
            encoder_hidden_states=None,  # set later by conditoning
            cross_attention_kwargs=dict(  # noqa: C408
                percent_through=ctx.step_index / len(ctx.timesteps),  # ctx.total_steps,
            ),
        )

        ctx.conditioning_mode = "negative"
        ctx.conditioning_data.to_unet_kwargs(ctx.unet_kwargs, "negative")

        # ext: controlnet/ip/t2i [pre_unet_forward]
        ext_manager.modifiers.pre_unet_forward(ctx)

        # ext: inpaint [pre_unet_forward, priority=low]
        # or
        # ext: inpaint [override: unet_forward]
        negative_next_x = self._unet_forward(**vars(ctx.unet_kwargs))

        del ctx.unet_kwargs
        del ctx.conditioning_mode
        # TODO: gc.collect() ?

        ###################
        # Positive pass
        ###################

        ctx.unet_kwargs = UNetKwargs(
            sample=ctx.latent_model_input,
            timestep=ctx.timestep,
            encoder_hidden_states=None,  # set later by conditoning
            cross_attention_kwargs=dict(  # noqa: C408
                percent_through=ctx.step_index / len(ctx.timesteps),  # ctx.total_steps,
            ),
        )

        ctx.conditioning_mode = "positive"
        ctx.conditioning_data.to_unet_kwargs(ctx.unet_kwargs, "positive")

        # ext: controlnet/ip/t2i [pre_unet_forward]
        ext_manager.modifiers.pre_unet_forward(ctx)

        # ext: inpaint [pre_unet_forward, priority=low]
        # or
        # ext: inpaint [override: unet_forward]
        positive_next_x = self._unet_forward(**vars(ctx.unet_kwargs))

        del ctx.unet_kwargs
        del ctx.conditioning_mode
        # TODO: gc.collect() ?

        return negative_next_x, positive_next_x

    def _unet_forward(self, **kwargs) -> torch.Tensor:
        return self.unet(**kwargs).sample
