# InvokeAI nodes for ControlNet image preprocessors
# initial implementation by Gregg Helt, 2023
# heavily leverages controlnet_aux package: https://github.com/patrickvonplaten/controlnet_aux

from typing import List, Literal, Optional, Union

import numpy as np
from controlnet_aux import (CannyDetector, ContentShuffleDetector, HEDdetector,
                            LineartAnimeDetector, LineartDetector,
                            MediapipeFaceDetector, MidasDetector, MLSDdetector,
                            NormalBaeDetector, OpenposeDetector,
                            PidiNetDetector, ZoeDetector)
from PIL import Image, ImageFilter, ImageOps
from pydantic import BaseModel, Field

from ..models.image import ImageCategory, ImageField, ResourceOrigin
from .baseinvocation import (BaseInvocation, BaseInvocationOutput,
                             InvocationConfig, InvocationContext)
from .image import ImageOutput, PILInvocationConfig


class ControlModelField(BaseModel):
    control_model: Optional[str] = Field(
        default=None, description="control model used")

    class Config:
        schema_extra = {"required": ["control_model"]}


class ControlField(BaseModel):
    image: ImageField = Field(default=None, description="processed image")
    control_model: Optional[str] = Field(
        default=None, description="control model used")
    control_weight: Optional[float] = Field(
        default=1, description="weight given to controlnet")
    begin_step_percent: float = Field(
        default=0, ge=0, le=1,
        description="% of total steps at which controlnet is first applied")
    end_step_percent: float = Field(
        default=1, ge=0, le=1,
        description="% of total steps at which controlnet is last applied")

    class Config:
        schema_extra = {"required": [
            "image", "control_model", "control_weight", "begin_step_percent", "end_step_percent"]}


class ControlOutput(BaseInvocationOutput):
    """node output for ControlNet info"""
    # fmt: off
    type: Literal["control_output"] = "control_output"
    control: ControlField = Field(default=None, description="The control info dict")
    # fmt: on


class ControlNetInvocation(BaseInvocation):
    """Collects ControlNet info to pass to other nodes"""
    # fmt: off
    type: Literal["controlnet"] = "controlnet"
    # Inputs
    image: ImageField = Field(default=None, description="image to process")
    control_model: ControlModelField = Field(default=None, description="control model used")
    control_weight: float = Field(default=1.0, ge=0, le=1, description="weight given to controlnet")
    # TODO: add support in backend core for begin_step_percent, end_step_percent, guess_mode
    begin_step_percent: float = Field(default=0, ge=0, le=1,
                                        description="% of total steps at which controlnet is first applied")
    end_step_percent: float = Field(default=1, ge=0, le=1,
                                      description="% of total steps at which controlnet is last applied")
    # fmt: on

    def invoke(self, context: InvocationContext) -> ControlOutput:
        controlnet_dir = context.services.configuration.controlnet_dir
        controlnet_models = context.services.model_manager.get_controlnet_models(
            controlnet_dir).controlnet_models

        return ControlOutput(
            control=ControlField(
                image=self.image,
                control_model=controlnet_models[self.control_model.control_model],
                control_weight=self.control_weight,
                begin_step_percent=self.begin_step_percent,
                end_step_percent=self.end_step_percent,),)

# TODO: move image processors to separate file (image_analysis.py


class ImageProcessorInvocation(BaseInvocation, PILInvocationConfig):
    """Base class for invocations that preprocess images for ControlNet"""

    # fmt: off
    type: Literal["image_processor"] = "image_processor"
    # Inputs
    image: ImageField = Field(default=None, description="image to process")
    # fmt: on

    def run_processor(self, image):
        # superclass just passes through image without processing
        return image

    def invoke(self, context: InvocationContext) -> ImageOutput:

        raw_image = context.services.images.get_pil_image(
            self.image.image_origin, self.image.image_name
        )
        # image type should be PIL.PngImagePlugin.PngImageFile ?
        processed_image = self.run_processor(raw_image)

        # FIXME: what happened to image metadata?
        # metadata = context.services.metadata.build_metadata(
        #     session_id=context.graph_execution_state_id, node=self
        # )

        # currently can't see processed image in node UI without a showImage node,
        #    so for now setting image_type to RESULT instead of INTERMEDIATE so will get saved in gallery
        image_dto = context.services.images.create(
            image=processed_image,
            image_origin=ResourceOrigin.INTERNAL,
            image_category=ImageCategory.CONTROL,
            session_id=context.graph_execution_state_id,
            node_id=self.id,
            is_intermediate=self.is_intermediate
        )

        """Builds an ImageOutput and its ImageField"""
        processed_image_field = ImageField(
            image_name=image_dto.image_name,
            image_origin=image_dto.image_origin,
        )
        return ImageOutput(
            image=processed_image_field,
            # width=processed_image.width,
            width=image_dto.width,
            # height=processed_image.height,
            height=image_dto.height,
            # mode=processed_image.mode,
        )


class CannyImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Canny edge detection for ControlNet"""
    # fmt: off
    type: Literal["canny_image_processor"] = "canny_image_processor"
    # Input
    low_threshold: float = Field(default=100, ge=0, description="low threshold of Canny pixel gradient")
    high_threshold: float = Field(default=200, ge=0, description="high threshold of Canny pixel gradient")
    # fmt: on

    def run_processor(self, image):
        canny_processor = CannyDetector()
        processed_image = canny_processor(
            image, self.low_threshold, self.high_threshold)
        return processed_image


class HedImageprocessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies HED edge detection to image"""
    # fmt: off
    type: Literal["hed_image_processor"] = "hed_image_processor"
    # Inputs
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    # safe not supported in controlnet_aux v0.0.3
    # safe: bool = Field(default=False, description="whether to use safe mode")
    scribble: bool = Field(default=False, description="whether to use scribble mode")
    # fmt: on

    def run_processor(self, image):
        hed_processor = HEDdetector.from_pretrained("lllyasviel/Annotators")
        processed_image = hed_processor(image,
                                        detect_resolution=self.detect_resolution,
                                        image_resolution=self.image_resolution,
                                        # safe not supported in controlnet_aux v0.0.3
                                        # safe=self.safe,
                                        scribble=self.scribble,
                                        )
        return processed_image


class LineartImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies line art processing to image"""
    # fmt: off
    type: Literal["lineart_image_processor"] = "lineart_image_processor"
    # Inputs
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    coarse: bool = Field(default=False, description="whether to use coarse mode")
    # fmt: on

    def run_processor(self, image):
        lineart_processor = LineartDetector.from_pretrained(
            "lllyasviel/Annotators")
        processed_image = lineart_processor(
            image, detect_resolution=self.detect_resolution,
            image_resolution=self.image_resolution, coarse=self.coarse)
        return processed_image


class LineartAnimeImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies line art anime processing to image"""
    # fmt: off
    type: Literal["lineart_anime_image_processor"] = "lineart_anime_image_processor"
    # Inputs
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    # fmt: on

    def run_processor(self, image):
        processor = LineartAnimeDetector.from_pretrained(
            "lllyasviel/Annotators")
        processed_image = processor(image,
                                    detect_resolution=self.detect_resolution,
                                    image_resolution=self.image_resolution,
                                    )
        return processed_image


class OpenposeImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies Openpose processing to image"""
    # fmt: off
    type: Literal["openpose_image_processor"] = "openpose_image_processor"
    # Inputs
    hand_and_face: bool = Field(default=False, description="whether to use hands and face mode")
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    # fmt: on

    def run_processor(self, image):
        openpose_processor = OpenposeDetector.from_pretrained(
            "lllyasviel/Annotators")
        processed_image = openpose_processor(
            image, detect_resolution=self.detect_resolution,
            image_resolution=self.image_resolution,
            hand_and_face=self.hand_and_face,)
        return processed_image


class MidasDepthImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies Midas depth processing to image"""
    # fmt: off
    type: Literal["midas_depth_image_processor"] = "midas_depth_image_processor"
    # Inputs
    a_mult: float = Field(default=2.0, ge=0, description="Midas parameter a = amult * PI")
    bg_th: float = Field(default=0.1, ge=0, description="Midas parameter bg_th")
    # depth_and_normal not supported in controlnet_aux v0.0.3
    # depth_and_normal: bool = Field(default=False, description="whether to use depth and normal mode")
    # fmt: on

    def run_processor(self, image):
        midas_processor = MidasDetector.from_pretrained("lllyasviel/Annotators")
        processed_image = midas_processor(image,
                                          a=np.pi * self.a_mult,
                                          bg_th=self.bg_th,
                                          # dept_and_normal not supported in controlnet_aux v0.0.3
                                          # depth_and_normal=self.depth_and_normal,
                                          )
        return processed_image


class NormalbaeImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies NormalBae processing to image"""
    # fmt: off
    type: Literal["normalbae_image_processor"] = "normalbae_image_processor"
    # Inputs
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    # fmt: on

    def run_processor(self, image):
        normalbae_processor = NormalBaeDetector.from_pretrained(
            "lllyasviel/Annotators")
        processed_image = normalbae_processor(
            image, detect_resolution=self.detect_resolution,
            image_resolution=self.image_resolution)
        return processed_image


class MlsdImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies MLSD processing to image"""
    # fmt: off
    type: Literal["mlsd_image_processor"] = "mlsd_image_processor"
    # Inputs
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    thr_v: float = Field(default=0.1, ge=0, description="MLSD parameter thr_v")
    thr_d: float = Field(default=0.1, ge=0, description="MLSD parameter thr_d")
    # fmt: on

    def run_processor(self, image):
        mlsd_processor = MLSDdetector.from_pretrained("lllyasviel/Annotators")
        processed_image = mlsd_processor(
            image, detect_resolution=self.detect_resolution,
            image_resolution=self.image_resolution, thr_v=self.thr_v,
            thr_d=self.thr_d)
        return processed_image


class PidiImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies PIDI processing to image"""
    # fmt: off
    type: Literal["pidi_image_processor"] = "pidi_image_processor"
    # Inputs
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    safe: bool = Field(default=False, description="whether to use safe mode")
    scribble: bool = Field(default=False, description="whether to use scribble mode")
    # fmt: on

    def run_processor(self, image):
        pidi_processor = PidiNetDetector.from_pretrained(
            "lllyasviel/Annotators")
        processed_image = pidi_processor(
            image, detect_resolution=self.detect_resolution,
            image_resolution=self.image_resolution, safe=self.safe,
            scribble=self.scribble)
        return processed_image


class ContentShuffleImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies content shuffle processing to image"""
    # fmt: off
    type: Literal["content_shuffle_image_processor"] = "content_shuffle_image_processor"
    # Inputs
    detect_resolution: int = Field(default=512, ge=0, description="pixel resolution for edge detection")
    image_resolution: int = Field(default=512, ge=0, description="pixel resolution for output image")
    h: Union[int, None] = Field(default=512, ge=0, description="content shuffle h parameter")
    w: Union[int, None] = Field(default=512, ge=0, description="content shuffle w parameter")
    f: Union[int, None] = Field(default=256, ge=0, description="cont")
    # fmt: on

    def run_processor(self, image):
        content_shuffle_processor = ContentShuffleDetector()
        processed_image = content_shuffle_processor(image,
                                                    detect_resolution=self.detect_resolution,
                                                    image_resolution=self.image_resolution,
                                                    h=self.h,
                                                    w=self.w,
                                                    f=self.f
                                                    )
        return processed_image


# should work with controlnet_aux >= 0.0.4 and timm <= 0.6.13
class ZoeDepthImageProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies Zoe depth processing to image"""
    # fmt: off
    type: Literal["zoe_depth_image_processor"] = "zoe_depth_image_processor"
    # fmt: on

    def run_processor(self, image):
        zoe_depth_processor = ZoeDetector.from_pretrained(
            "lllyasviel/Annotators")
        processed_image = zoe_depth_processor(image)
        return processed_image


class MediapipeFaceProcessorInvocation(
        ImageProcessorInvocation, PILInvocationConfig):
    """Applies mediapipe face processing to image"""
    # fmt: off
    type: Literal["mediapipe_face_processor"] = "mediapipe_face_processor"
    # Inputs
    max_faces: int = Field(default=1, ge=1, description="maximum number of faces to detect")
    min_confidence: float = Field(default=0.5, ge=0, le=1, description="minimum confidence for face detection")
    # fmt: on

    def run_processor(self, image):
        mediapipe_face_processor = MediapipeFaceDetector()
        processed_image = mediapipe_face_processor(
            image, max_faces=self.max_faces, min_confidence=self.min_confidence)
        return processed_image
