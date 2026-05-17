// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * يرفع buffer أو base64 على Cloudinary ويرجع الـ secure_url
 * @param buffer  الملف كـ Buffer
 * @param options خيارات اختيارية (folder, resource_type, public_id)
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?:        string;
    resource_type?: "image" | "video" | "raw" | "auto";
    public_id?:     string;
    filename?:      string;
  } = {}
): Promise<string> {
  const { folder = "whatsapp-media", resource_type = "auto", public_id, filename } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type,
      use_filename:       !!filename,
      unique_filename:    true,
      overwrite:          false,
    };

    if (public_id) uploadOptions.public_id = public_id;
    if (filename)  uploadOptions.filename_override = filename;

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
      if (!result?.secure_url) return reject(new Error("Cloudinary: no secure_url returned"));
      resolve(result.secure_url);
    });

    stream.end(buffer);
  });
}

/**
 * يحمّل الملف من Meta ثم يرفعه على Cloudinary — يرجع الـ Cloudinary URL
 * @param metaMediaId  معرّف الوسيط من Meta (رقم)
 * @param accessToken  Access Token الخاص بالحساب
 * @param options      خيارات Cloudinary الاختيارية
 */
export async function downloadFromMetaAndUpload(
  metaMediaId: string,
  accessToken: string,
  options: {
    folder?:   string;
    filename?: string;
  } = {}
): Promise<string> {
  // الخطوة 1: جيب URL الملف من Meta
  const infoRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(metaMediaId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );

  if (!infoRes.ok) {
    const body = await infoRes.text();
    throw new Error(`Meta media info failed: ${body}`);
  }

  const info = await infoRes.json();
  if (!info?.url) throw new Error("Meta: no url in media info response");

  // الخطوة 2: حمّل الملف من Meta
  const mediaRes = await fetch(info.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache:   "no-store",
  });

  if (!mediaRes.ok) {
    const body = await mediaRes.text();
    throw new Error(`Meta media download failed: ${body}`);
  }

  const arrayBuffer = await mediaRes.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  // الخطوة 3: ارفع على Cloudinary
  const contentType = mediaRes.headers.get("content-type") ?? "application/octet-stream";
  const isImage     = contentType.startsWith("image/");
  const isVideo     = contentType.startsWith("video/");
  const isAudio     = contentType.startsWith("audio/");

  const resource_type: "image" | "video" | "raw" =
    isImage ? "image" : isVideo || isAudio ? "video" : "raw";

  return uploadToCloudinary(buffer, {
    folder:        options.folder ?? "whatsapp-media",
    resource_type,
    filename:      options.filename,
  });
}
