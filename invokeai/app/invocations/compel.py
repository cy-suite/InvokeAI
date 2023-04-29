from typing import Literal, Optional, Union, List
from pydantic import BaseModel, Field

from invokeai.app.invocations.util.choose_model import choose_model
from .baseinvocation import BaseInvocation, BaseInvocationOutput, InvocationContext, InvocationConfig

from ...backend.util.devices import choose_torch_device, torch_dtype
from ...backend.stable_diffusion.diffusion import InvokeAIDiffuserComponent
from ...backend.stable_diffusion.textual_inversion_manager import TextualInversionManager

import math
from compel import Compel
from compel.prompt_parser import (
    Blend,
    CrossAttentionControlSubstitute,
    FlattenedPrompt,
    Fragment,
)

from invokeai.backend.globals import Globals


class ConditioningField(BaseModel):
    conditioning_name: Optional[str] = Field(default=None, description="The name of conditioning data")
    class Config:
        schema_extra = {"required": ["conditioning_name"]}


class CompelOutput(BaseInvocationOutput):
    """Compel parser output"""

    #fmt: off
    type: Literal["compel_output"] = "compel_output"
    # name + loras -> pipeline + loras
    # model: ModelField           = Field(default=None, description="Model")
    # src? + loras -> tokenizer + text_encoder + loras
    # clip:  ClipField            = Field(default=None, description="Text encoder(clip)")
    #positive: ConditioningField = Field(default=None, description="Positive conditioning")
    #negative: ConditioningField = Field(default=None, description="Negative conditioning")
    conditioning: ConditioningField = Field(default=None, description="Conditioning")
    #fmt: on


class CompelInvocation(BaseInvocation):

    type: Literal["compel"] = "compel"

    positive_prompt: str = Field(default="", description="Positive prompt")
    negative_prompt: str = Field(default="", description="Negative prompt")

    perp_neg: bool = Field(default=False, description="Enable perp-neg conditioning(blend and swap unsupported)")

    model: str = Field(default="", description="Model to use")
    truncate_long_prompts: bool = Field(default=False, description="Whether or not to truncate long prompt to 77 tokens")

    # name + loras -> pipeline + loras
    # model: ModelField = Field(default=None, description="Model to use") 
    # src? + loras -> tokenizer + text_encoder + loras
    # clip: ClipField = Field(default=None, description="Text encoder(clip) to use")

    # Schema customisation
    class Config(InvocationConfig):
        schema_extra = {
            "ui": {
                "tags": ["latents", "noise"],
                "type_hints": {
                  "model": "model"
                }
            },
        }

    def invoke(self, context: InvocationContext) -> CompelOutput:

        # TODO: load without model
        model = choose_model(context.services.model_manager, self.model)
        pipeline = model["model"]
        tokenizer = pipeline.tokenizer
        text_encoder = pipeline.text_encoder

        # TODO: global? input?
        #use_full_precision = precision == "float32" or precision == "autocast"
        #use_full_precision = False

        # TODO: redo TI when separate model loding implemented
        #textual_inversion_manager = TextualInversionManager(
        #    tokenizer=tokenizer,
        #    text_encoder=text_encoder,
        #    full_precision=use_full_precision,
        #)

        def load_huggingface_concepts(concepts: list[str]):
            pipeline.textual_inversion_manager.load_huggingface_concepts(concepts)

        # apply the concepts library to the prompt
        positive_prompt_str = pipeline.textual_inversion_manager.hf_concepts_library.replace_concepts_with_triggers(
            self.positive_prompt,
            lambda concepts: load_huggingface_concepts(concepts),
            pipeline.textual_inversion_manager.get_all_trigger_strings(),
        )

        negative_prompt_str = pipeline.textual_inversion_manager.hf_concepts_library.replace_concepts_with_triggers(
            self.negative_prompt,
            lambda concepts: load_huggingface_concepts(concepts),
            pipeline.textual_inversion_manager.get_all_trigger_strings(),
        )

        # lazy-load any deferred textual inversions.
        # this might take a couple of seconds the first time a textual inversion is used.
        pipeline.textual_inversion_manager.create_deferred_token_ids_for_any_trigger_terms(
            positive_prompt_str + "[" + negative_prompt_str + "]"
        )

        compel = Compel(
            tokenizer=tokenizer,
            text_encoder=text_encoder,
            textual_inversion_manager=pipeline.textual_inversion_manager,
            dtype_for_device_getter=torch_dtype,
            truncate_long_prompts=self.truncate_long_prompts,
        )

        # TODO: support legacy blend?

        positive_prompt: Union[FlattenedPrompt, Blend] = Compel.parse_prompt_string(positive_prompt_str)
        negative_prompt: Union[FlattenedPrompt, Blend] = Compel.parse_prompt_string(negative_prompt_str)

        if getattr(Globals, "log_tokenization", False):
            log_tokenization(positive_prompt, negative_prompt, tokenizer=tokenizer)

        if self.perp_neg:
            blocks = []
            blocks.extend(self._perpneg_parse(compel, positive_prompt, tokenizer, negative=False))
            blocks.extend(self._perpneg_parse(compel, negative_prompt, tokenizer, negative=True))

            #max_length = text_input.input_ids.shape[-1]
        
            #uncond_input = self.tokenizer(
            #    [""] * 1, padding="max_length", max_length=max_length, return_tensors="pt"
            #)
            #uncond_embeddings = self.text_encoder(uncond_input.input_ids.to(self.text_encoder.device))[0]
            uncond_embeddings, _ = compel.build_conditioning_tensor_for_prompt_object(Compel.parse_prompt_string(""))
            # TODO: pad length for long blocks

            cond_info = {
                "perp_neg": {
                    "blocks": blocks,
                    "uncond_embeddings": uncond_embeddings,
                }
            }

            ec = InvokeAIDiffuserComponent.ExtraConditioningInfo(
                tokens_count_including_eos_bos=get_max_token_count(tokenizer, positive_prompt),
                cross_attention_control_args=None,
            )

            pass

        else:
            # TODO: add lora(with model and clip field types)
            c, options = compel.build_conditioning_tensor_for_prompt_object(positive_prompt)
            uc, _      = compel.build_conditioning_tensor_for_prompt_object(negative_prompt)

            if not self.truncate_long_prompts:
                [c, uc] = compel.pad_conditioning_tensors_to_same_length([c, uc])

            cond_info = {
                "default": {
                    "conditioning": c,
                    "unconditioning": uc,
                }
            }

            ec = InvokeAIDiffuserComponent.ExtraConditioningInfo(
                tokens_count_including_eos_bos=get_max_token_count(tokenizer, positive_prompt),
                cross_attention_control_args=options.get("cross_attention_control", None),
            )

        name_conditioning = f'{context.graph_execution_state_id}_{self.id}_conditioning'

        # TODO: hacky but works ;D maybe rename latents somehow?
        context.services.latents.set(name_conditioning, (cond_info, ec))

        return CompelOutput(
            conditioning=ConditioningField(
                conditioning_name=name_conditioning,
            ),
        )

    def _perpneg_parse(self, compel, prompt_ast, tokenizer, negative=False):
        if isinstance(prompt_ast, Blend):
            raise NotImplementedError()

        elif isinstance(prompt_ast, FlattenedPrompt):
            flattened_prompt: FlattenedPrompt = prompt_ast
            if flattened_prompt.wants_cross_attention_control:
                raise NotImplementedError()

            # 1. Process prompt to tokens and weights list
            _tmp = _BlockInfo()

            for fragment in flattened_prompt.children:
                f_tokens = tokenizer.tokenize(fragment.text)
                _tmp.tokens.extend(f_tokens)
                _tmp.weights.extend([fragment.weight] * len(f_tokens))

            # 2. Process tokens and weights to blocks(devided by comma)
            blocks = []
            tmp_block = _BlockInfo()
            for i in range(len(_tmp.tokens)):
                token = _tmp.tokens[i]
                
                if _tmp.tokens[i] == ",</w>":
                    blocks.append(tmp_block)
                    tmp_block = _BlockInfo()
                else:
                    tmp_block.tokens.append(_tmp.tokens[i])
                    tmp_block.weights.append(_tmp.weights[i])

            if len(tmp_block.tokens) > 0:
                blocks.append(tmp_block)

            block_infos = []

            for block in blocks:
                # hacky way to do at least something with block weights)
                #block_weight = sum(block.weights) / len(block.weights)
                block_weight = math.prod(block.weights) ** (1/len(block.weights))
                for i in range(len(block.weights)):
                    block.weights[i] /= block_weight

                if negative:
                    block_weight = -block_weight

                block_infos.append((self._perpneg_gen(compel, block), block_weight))

            return block_infos


    def _perpneg_gen(self, compel, block):

        prompt = ""
        tokens = list(block.tokens)

        while len(tokens) > 0:
            word = tokens.pop(0)
            while "</w>" not in word:
                word += tokens.pop(0)
            word = word.replace("</w>", "")
            weight = block.weights[-(len(tokens) + 1)]

            if weight != 1:
                word_formatted = f"({word}){weight}"
            else:
                word_formatted = word

            prompt += word_formatted + " "

        prompt = prompt.rstrip(", ")
        prompt_ast = Compel.parse_prompt_string(prompt)
        cond, _ = compel.build_conditioning_tensor_for_prompt_object(prompt_ast)

        return cond


class _BlockInfo:
    tokens: List[str]
    weights: List[float]

    def __init__(self):
        self.tokens = []
        self.weights = []
    
    def __repr__(self):
        return self.__str__()
    def __str__(self):
        return f"tokens: {self.tokens}, weights:{self.weights}"


def get_max_token_count(
    tokenizer, prompt: Union[FlattenedPrompt, Blend], truncate_if_too_long=False
) -> int:
    if type(prompt) is Blend:
        blend: Blend = prompt
        return max(
            [
                get_max_token_count(tokenizer, c, truncate_if_too_long)
                for c in blend.prompts
            ]
        )
    else:
        return len(
            get_tokens_for_prompt_object(tokenizer, prompt, truncate_if_too_long)
        )


def get_tokens_for_prompt_object(
    tokenizer, parsed_prompt: FlattenedPrompt, truncate_if_too_long=True
) -> [str]:
    if type(parsed_prompt) is Blend:
        raise ValueError(
            "Blend is not supported here - you need to get tokens for each of its .children"
        )

    text_fragments = [
        x.text
        if type(x) is Fragment
        else (
            " ".join([f.text for f in x.original])
            if type(x) is CrossAttentionControlSubstitute
            else str(x)
        )
        for x in parsed_prompt.children
    ]
    text = " ".join(text_fragments)
    tokens = tokenizer.tokenize(text)
    if truncate_if_too_long:
        max_tokens_length = tokenizer.model_max_length - 2  # typically 75
        tokens = tokens[0:max_tokens_length]
    return tokens


def log_tokenization(
    positive_prompt: Union[Blend, FlattenedPrompt],
    negative_prompt: Union[Blend, FlattenedPrompt],
    tokenizer,
):
    print(f"\n>> [TOKENLOG] Parsed Prompt: {positive_prompt}")
    print(f"\n>> [TOKENLOG] Parsed Negative Prompt: {negative_prompt}")

    log_tokenization_for_prompt_object(positive_prompt, tokenizer)
    log_tokenization_for_prompt_object(
        negative_prompt, tokenizer, display_label_prefix="(negative prompt)"
    )


def log_tokenization_for_prompt_object(
    p: Union[Blend, FlattenedPrompt], tokenizer, display_label_prefix=None
):
    display_label_prefix = display_label_prefix or ""
    if type(p) is Blend:
        blend: Blend = p
        for i, c in enumerate(blend.prompts):
            log_tokenization_for_prompt_object(
                c,
                tokenizer,
                display_label_prefix=f"{display_label_prefix}(blend part {i + 1}, weight={blend.weights[i]})",
            )
    elif type(p) is FlattenedPrompt:
        flattened_prompt: FlattenedPrompt = p
        if flattened_prompt.wants_cross_attention_control:
            original_fragments = []
            edited_fragments = []
            for f in flattened_prompt.children:
                if type(f) is CrossAttentionControlSubstitute:
                    original_fragments += f.original
                    edited_fragments += f.edited
                else:
                    original_fragments.append(f)
                    edited_fragments.append(f)

            original_text = " ".join([x.text for x in original_fragments])
            log_tokenization_for_text(
                original_text,
                tokenizer,
                display_label=f"{display_label_prefix}(.swap originals)",
            )
            edited_text = " ".join([x.text for x in edited_fragments])
            log_tokenization_for_text(
                edited_text,
                tokenizer,
                display_label=f"{display_label_prefix}(.swap replacements)",
            )
        else:
            text = " ".join([x.text for x in flattened_prompt.children])
            log_tokenization_for_text(
                text, tokenizer, display_label=display_label_prefix
            )


def log_tokenization_for_text(text, tokenizer, display_label=None, truncate_if_too_long=False):
    """shows how the prompt is tokenized
    # usually tokens have '</w>' to indicate end-of-word,
    # but for readability it has been replaced with ' '
    """
    tokens = tokenizer.tokenize(text)
    tokenized = ""
    discarded = ""
    usedTokens = 0
    totalTokens = len(tokens)

    for i in range(0, totalTokens):
        token = tokens[i].replace("</w>", " ")
        # alternate color
        s = (usedTokens % 6) + 1
        if truncate_if_too_long and i >= tokenizer.model_max_length:
            discarded = discarded + f"\x1b[0;3{s};40m{token}"
        else:
            tokenized = tokenized + f"\x1b[0;3{s};40m{token}"
            usedTokens += 1

    if usedTokens > 0:
        print(f'\n>> [TOKENLOG] Tokens {display_label or ""} ({usedTokens}):')
        print(f"{tokenized}\x1b[0m")

    if discarded != "":
        print(f"\n>> [TOKENLOG] Tokens Discarded ({totalTokens - usedTokens}):")
        print(f"{discarded}\x1b[0m")
