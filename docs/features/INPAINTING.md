---
title: Inpainting
---

# :octicons-paintbrush-16: Inpainting

## **Creating Transparent Regions for Inpainting**

Inpainting is really cool. To do it, you start with an initial image
and use a photoeditor to make one or more regions transparent
(i.e. they have a "hole" in them). You then provide the path to this
image at the dream> command line using the `-I` switch. Stable
Diffusion will only paint within the transparent region.

There's a catch. In the current implementation, you have to prepare
the initial image correctly so that the underlying colors are
preserved under the transparent area. Many imaging editing
applications will by default erase the color information under the
transparent pixels and replace them with white or black, which will
lead to suboptimal inpainting. It often helps to apply incomplete
transparency, such as any value between 1 and 99%

You also must take care to export the PNG file in such a way that the
color information is preserved. There is often an option in the export
dialog that lets you specify this.

If your photoeditor is erasing the underlying color information,
`dream.py` will give you a big fat warning. If you can't find a way to
coax your photoeditor to retain color values under transparent areas,
then you can combine the `-I` and `-M` switches to provide both the
original unedited image and the masked (partially transparent) image:

```bash
dream> "man with cat on shoulder" -I./images/man.png -M./images/man-transparent.png
```

We are hoping to get rid of the need for this workaround in an upcoming release.

### Inpainting is not changing the masked region enough!

One of the things to understand about how inpainting works is that it
is equivalent to running img2img on just the masked (transparent)
area. img2img builds on top of the existing image data, and therefore
will attempt to preserve colors, shapes and textures to the best of
its ability. Unfortunately this means that if you want to make a
dramatic change in the inpainted region, for example replacing a red
wall with a blue one, the algorithm will fight you.

You have a couple of options. The first is to increase the values of
the requested steps (`-sXXX`), strength (`-f0.XX`), and/or
condition-free guidance (`-CXX.X`). If this is not working for you, a
more extreme step is to provide the `--inpaint_replace` option. This
causes the algorithm to entirely ignore the data underneath the masked
region and to treat this area like a blank canvas. This will enable
you to replace colored regions entirely, but beware that the masked
region will not blend in with the surrounding unmasked regions as
well.

---

## Recipe for GIMP

[GIMP](https://www.gimp.org/) is a popular Linux photoediting tool.

1. Open image in GIMP.
2. Layer->Transparency->Add Alpha Channel
3. Use lasoo tool to select region to mask
4. Choose Select -> Float to create a floating selection
5. Open the Layers toolbar (++ctrl+l++) and select "Floating Selection"
6. Set opacity to 0%
7. Export as PNG
8. In the export dialogue, Make sure the "Save colour values from
   transparent pixels" checkbox is selected.


## Recipe for Adobe Photoshop

1. Open image in Photoshop

![step1](../assets/step1.png)

2. Use any of the selection tools (Marquee, Lasso, or Wand) to select the area you desire to inpaint.

![step2](../assets/step2.png)

3. Because we'll be applying a mask over the area we want to preserve, you should now select the inverse by using the ++shift+ctrl+i++ shortcut, or right clicking and using the "Select Inverse" option.

4. You'll now create a mask by selecting the image layer, and Masking the selection. Make sure that you don't delete any of the undrlying image, or your inpainting results will be dramatically impacted.

![step4](../assets/step4.png)

5. Make sure to hide any background layers that are present. You should see the mask applied to your image layer, and the image on your canvas should display the checkered background.

![step5](../assets/step5.png)

6. Save the image as a transparent PNG by using the "Save a Copy" option in the File menu, or using the Alt + Ctrl + S keyboard shortcut

![step6](../assets/step6.png)

7. After following the inpainting instructions above (either through the CLI or the Web UI), marvel at your newfound ability to selectively dream. Lookin' good!

![step7](../assets/step7.png)

8. In the export dialogue, Make sure the "Save colour values from transparent pixels" checkbox is selected.  
