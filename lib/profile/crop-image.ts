import type { Area } from "react-easy-crop";

function getRadianAngle(degree: number) {
  return (degree * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Export a square JPEG from the cropper area, including rotation.
 * Matches the react-easy-crop recommended canvas pipeline.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  crop: Area,
  options?: { size?: number; quality?: number; rotation?: number },
): Promise<Blob> {
  const size = options?.size ?? 512;
  const quality = options?.quality ?? 0.9;
  const rotation = options?.rotation ?? 0;

  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image editor.");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  canvas.width = Math.max(1, Math.round(bBoxWidth));
  canvas.height = Math.max(1, Math.round(bBoxHeight));

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    Math.round(crop.x),
    Math.round(crop.y),
    Math.round(crop.width),
    Math.round(crop.height),
  );

  const output = document.createElement("canvas");
  output.width = size;
  output.height = size;
  const outCtx = output.getContext("2d");
  if (!outCtx) {
    throw new Error("Could not export cropped photo.");
  }

  const temp = document.createElement("canvas");
  temp.width = Math.round(crop.width);
  temp.height = Math.round(crop.height);
  const tempCtx = temp.getContext("2d");
  if (!tempCtx) {
    throw new Error("Could not export cropped photo.");
  }
  tempCtx.putImageData(data, 0, 0);

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(temp, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    output.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export cropped photo."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not load the selected image.")),
    );
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}
