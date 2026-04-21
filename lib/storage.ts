export async function uploadFiles(files: File[], prefix = "vehicles"): Promise<string[]> {
  const formData = new FormData();
  formData.set("prefix", prefix);

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to upload files";
    try {
      const payload = await response.json() as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Ignore malformed JSON responses and fall back to the default error.
    }
    throw new Error(message);
  }

  const payload = await response.json() as { urls: string[] };
  return payload.urls;
}
