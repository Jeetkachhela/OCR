"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootLandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically routes root page to the operator login portal
    router.push("/login");
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}
