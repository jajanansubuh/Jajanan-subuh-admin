"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const params = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Guard: useParams can be undefined on the client during initial renders.
  // Ensure we have a string storeId before building routes to avoid TS errors
  // and invalid hrefs at runtime.
  const storeId = Array.isArray(params?.storeId)
    ? params?.storeId[0]
    : params?.storeId;

  if (!storeId) return null;

  const routes = [
    {
      href: `/${storeId}`,
      label: "Dashboard",
      active: pathname === `/${storeId}`,
    },
    {
      href: `/${storeId}/banners`,
      label: "Banners",
      active: pathname === `/${storeId}/banners`,
    },
    {
      href: `/${storeId}/categories`,
      label: "Categories",
      active: pathname === `/${storeId}/categories`,
    },
    {
      href: `/${storeId}/products`,
      label: "Products",
      active: pathname === `/${storeId}/products`,
    },
    {
      href: `/${storeId}/customers`,
      label: "Customers",
      active: pathname === `/${storeId}/customers`,
    },
    {
      href: `/${storeId}/settings`,
      label: "Settings",
      active: pathname === `/${storeId}/settings`,
    },
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            // Only apply active styling after the component has mounted on the client
            mounted && route.active
              ? "text-black dark:text-white"
              : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
      {/* export moved to dashboard chart */}
    </nav>
  );
}
