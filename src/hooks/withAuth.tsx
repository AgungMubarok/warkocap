"use client";

import { type ComponentType, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRoleSnapshot, subscribeToUserRole } from "@/lib/user-role";

// HOC ini akan "membungkus" halaman yang ingin dilindungi
const withAuth = <P extends object>(
  WrappedComponent: ComponentType<P>,
  allowedRoles: string[]
) => {
  const AuthComponent = (props: P) => {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
      const syncAuthorization = () => {
        const userRole = getUserRoleSnapshot();

        // Jika tidak ada peran (belum login) ATAU perannya tidak diizinkan
        if (!userRole || !allowedRoles.includes(userRole)) {
          setIsAuthorized(false);
          setIsCheckingAuth(false);

          if (typeof window !== "undefined") {
            window.location.replace("/login");
          } else {
            router.replace("/login");
          }

          return;
        }

        setIsAuthorized(true);
        setIsCheckingAuth(false);
      };

      syncAuthorization();
      const unsubscribe = subscribeToUserRole(syncAuthorization);

      return unsubscribe;
    }, [allowedRoles, router]);

    if (isCheckingAuth) {
      return null;
    }

    if (!isAuthorized) {
      return null;
    }

    // Jika sudah login dan peran sesuai, tampilkan halamannya
    return <WrappedComponent {...props} />;
  };

  return AuthComponent;
};

export default withAuth;
