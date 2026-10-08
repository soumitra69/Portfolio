"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import defaultProfile from "../../shared/profile.json";

export default function ProfilePhoto() {
  const [photoUrl, setPhotoUrl] = useState(defaultProfile.photoUrl);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/profile", { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Profile unavailable"); return response.json(); })
      .then((profile) => setPhotoUrl(profile.photoUrl)).catch(() => {});
    return () => controller.abort();
  }, []);

  return <Image src={photoUrl} alt="Soumitra Samanta" className="profile-img" width={350} height={350}
    priority unoptimized={photoUrl.startsWith("/api/media/")} onError={() => setPhotoUrl(defaultProfile.photoUrl)} />;
}
