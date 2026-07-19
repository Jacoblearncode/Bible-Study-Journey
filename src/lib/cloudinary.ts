const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export async function uploadImage(localUri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured.');
  }

  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);
  // React Native's fetch accepts this file-shaped object in place of a Blob.
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: 'reading-log.jpg',
  } as unknown as Blob);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.status}`);
  }

  const data = (await response.json()) as { secure_url: string };
  return data.secure_url;
}
