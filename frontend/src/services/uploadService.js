import { useEffect, useState } from "react";
import { getToken, clearToken } from "./api";

const BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

let pending = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l(pending > 0));

export function useUploading() {
  const [busy, setBusy] = useState(pending > 0);
  useEffect(() => {
    listeners.add(setBusy);
    setBusy(pending > 0);
    return () => listeners.delete(setBusy);
  }, []);
  return busy;
}

export async function uploadImage(file) {
  pending += 1;
  emit();
  try {
    return await sendImage(file);
  } finally {
    pending -= 1;
    emit();
  }
}

async function sendImage(file) {
  const body = new FormData();
  body.append("image", file);
  const token = getToken();
  let response;
  try {
    response = await fetch(`${BASE}/uploads/images`, {
      method: "POST",
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Check your connection and that the API is running.",
    );
  }
  let json = {};
  try {
    json = await response.json();
  } catch {}
  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("nari:unauthorized"));
  }
  if (!response.ok || json.success === false)
    throw new Error(json.message || `Upload failed (${response.status})`);
  return json.data.url;
}
