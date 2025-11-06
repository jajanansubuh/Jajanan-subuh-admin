"use client";

import { usePathname, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Menu } from "lucide-react";

export default function MobileMenu() {
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);
  // mounted keeps the menu in the DOM while the closing animation runs
  const [mounted, setMounted] = useState(false);
  // animateOut triggers the closing transition
  const [animateOut, setAnimateOut] = useState(false);

  // when open becomes true, ensure component is mounted so enter animation can run
  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  // handle Escape key to close menu
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setAnimateOut(true);
        setTimeout(() => {
          setOpen(false);
          setAnimateOut(false);
          setMounted(false);
        }, 200);
      }
    }

    if (mounted) {
      window.addEventListener("keydown", onKey);
    }

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, open]);

  const routes = [
    {
      href: `/${params.storeId}`,
      label: "Dashboard",
      active: pathname === `/${params.storeId}`,
    },
    {
      href: `/${params.storeId}/banners`,
      label: "Banners",
      active: pathname === `/${params.storeId}/banners`,
    },
    {
      href: `/${params.storeId}/categories`,
      label: "Categories",
      active: pathname === `/${params.storeId}/categories`,
    },
    {
      href: `/${params.storeId}/products`,
      label: "Products",
      active: pathname === `/${params.storeId}/products`,
    },
    {
      href: `/${params.storeId}/settings`,
      label: "Settings",
      active: pathname === `/${params.storeId}/settings`,
    },
  ];

  return (
    <div className="mr-2 lg:hidden">
      <button
        aria-label="Open menu"
        className="p-2 cursor-pointer rounded-md hover:bg-muted-foreground/5"
        onClick={() => {
          // ensure menu is mounted first so enter transition has a start state
          setMounted(true);
          // wait a frame so the DOM updates, then set open to trigger transition
          requestAnimationFrame(() => setOpen(true));
        }}
      >
        <Menu className="h-5 w-5" />
      </button>
      {/* mount while opening/closing so animations can run */}
      {(open || mounted) && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop: fade in/out */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-200 ${
              open && !animateOut
                ? "opacity-40"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={() => {
              // trigger animate out then unmount
              setAnimateOut(true);
              setTimeout(() => {
                setOpen(false);
                setAnimateOut(false);
                setMounted(false);
              }, 200);
            }}
          />

          {/* Sidebar: slide in from left, slide out when animateOut */}
          <aside
            className={`absolute left-0 top-0 h-full w-64 bg-background p-4 shadow-lg transform transition-transform duration-200 ease-in-out ${
              open && !animateOut ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div
              className="flex items-center justify-between sticky top-0 bg-background z-10 px-1"
              style={{ minHeight: "48px" }}
            >
              <div className="text-lg font-semibold">Menu</div>
              <button
                aria-label="Close menu"
                className="p-2 rounded-md hover:bg-muted-foreground/5"
                onClick={() => {
                  setAnimateOut(true);
                  setTimeout(() => {
                    setOpen(false);
                    setAnimateOut(false);
                    setMounted(false);
                  }, 200);
                }}
              >
                <X className="h-5 w-5 cursor-pointer" />
              </button>
            </div>

            <nav className="flex flex-col space-y-2">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`block rounded px-2 py-2 text-sm font-medium hover:bg-muted-foreground/5 ${
                    route.active
                      ? "text-black dark:text-white"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => {
                    // close with animation before navigating
                    setAnimateOut(true);
                    setTimeout(() => {
                      setOpen(false);
                      setAnimateOut(false);
                      setMounted(false);
                    }, 200);
                  }}
                >
                  {route.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
