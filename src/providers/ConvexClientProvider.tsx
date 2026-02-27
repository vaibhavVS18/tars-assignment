"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation } from "convex/react";
import { ReactNode, useEffect } from "react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

export function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <SyncUserWithConvex />
      {children}
    </ConvexProviderWithClerk>
  );
}

function SyncUserWithConvex() {
  const { user } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);

  useEffect(() => {
    if (!user) return;

    const sync = async () => {
      try {
        await syncUser({
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          email: user.emailAddresses[0]?.emailAddress ?? "",
          image: user.imageUrl,
        });
      } catch (error) {
        console.error("Error syncing user with Convex", error);
      }
    };
    sync();

    // Keep online status accurate when closing tab
    const handleBeforeUnload = () => {
      setOnlineStatus({ isOnline: false });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Not guaranteed to run reliably on all unmounts and navigations
      setOnlineStatus({ isOnline: false });
    };
  }, [user, syncUser, setOnlineStatus]);

  return null;
}