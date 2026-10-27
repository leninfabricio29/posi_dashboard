"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "loading") return;
    router.replace(status === "authenticated" ? "/inicio" : "/login");
  }, [status, router]);

  return (
    <div className="flex min-h-svh items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" aria-label="Cargando" />
    </div>
  );
}
