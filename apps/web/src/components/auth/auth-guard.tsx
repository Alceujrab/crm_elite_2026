"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSession } from "./session-provider";

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, refreshSession, session } = useSession();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    void refreshSession().then((resolvedSession) => {
      if (!active) {
        return;
      }

      if (!resolvedSession) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      setIsAllowed(true);
    });

    return () => {
      active = false;
    };
  }, [pathname, refreshSession, router]);

  useEffect(() => {
    if (!isLoading && session) {
      setIsAllowed(true);
    }
  }, [isLoading, session]);

  if (isLoading || !isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-full bg-[var(--panel)] px-5 py-3 text-sm text-[var(--muted-foreground)] shadow-soft">
          Carregando workspace...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}