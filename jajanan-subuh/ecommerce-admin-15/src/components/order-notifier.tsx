"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { usePathname } from "next/navigation";
import { useTransactionsModal } from "@/hooks/use-transactions-modal";

// Minimal order shape we care about in the notifier
type Order = {
  id: string;
  createdAt?: string | null;
  orderNumber?: string | number | null;
  customerName?: string | null;
  customer?: string | null;
  billingName?: string | null;
};

function getStoreIdFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  try {
    const parts = pathname.split("/").filter(Boolean);
    // If path contains /dashboard/:storeId/... we prefer that
    const storeIndex = parts.findIndex((p) => p === "dashboard") + 1;
    const sid = parts[storeIndex] || parts[0] || "";
    return sid || null;
  } catch {
    return null;
  }
}

export default function OrderNotifier() {
  const transactionsModal = useTransactionsModal();
  const pathname = usePathname();

  // audio context ref for playing generated beep sounds
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  // HTMLAudioElement ref for playing bundled beep.mp3 (public folder)
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [muted, setMuted] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem("order-notifier-muted") === "1";
    } catch {
      return false;
    }
  });

  // update muted when localStorage changes (settings page toggles it)
  React.useEffect(() => {
    function onStorage(e: StorageEvent) {
      try {
        if (e.key === "order-notifier-muted") {
          setMuted(e.newValue === "1");
        } else if (e.key === "order-notifier-volume") {
          // update audio element volume if present
          try {
            const v = e.newValue;
            if (audioRef.current) {
              let volPercent = 100;
              if (v !== null) {
                const n = Number(v);
                if (!Number.isNaN(n))
                  volPercent = Math.max(0, Math.min(100, n));
              }
              const normalized = volPercent / 100;
              // linear mapping for full volume
              audioRef.current.volume = normalized;
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Initialize HTMLAudioElement for the bundled beep file on mount
  React.useEffect(() => {
    try {
      const a = new Audio("/beep.mp3");
      a.preload = "auto";
      a.loop = false;
      a.crossOrigin = "anonymous";

      // set initial volume from localStorage (0-100), linear mapping
      try {
        let volPercent = 100;
        const v = localStorage.getItem("order-notifier-volume");
        if (v !== null) {
          const n = Number(v);
          if (!Number.isNaN(n)) volPercent = Math.max(0, Math.min(100, n));
        }
        const normalized = volPercent / 100;
        a.volume = normalized;
      } catch {
        // ignore
      }

      audioRef.current = a;
    } catch {
      audioRef.current = null;
    }

    return () => {
      try {
        audioRef.current?.pause();
        audioRef.current = null;
      } catch {
        // ignore
      }
    };
  }, []);

  // helper to ensure AudioContext exists
  function ensureAudioContext() {
    try {
      if (!audioCtxRef.current) {
        type Ctor = new () => AudioContext;
        const g = globalThis as unknown as {
          AudioContext?: Ctor;
          webkitAudioContext?: Ctor;
        };
        const Ctx = g.AudioContext || g.webkitAudioContext;
        if (!Ctx) return null;
        audioCtxRef.current = new Ctx();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }

  // play a short beep using WebAudio; wrapped in try/catch because some browsers
  // block audio until a user gesture — we'll attempt to resume on user toggle.

  React.useEffect(() => {
    function tryResume() {
      try {
        const ctx = ensureAudioContext();
        if (!ctx) return;
        if (ctx.state === "suspended") {
          void ctx.resume();
        }
      } catch {
        // ignore
      }
    }

    function onVisibilityChange() {
      try {
        if (document.visibilityState === "visible") {
          const ctx = audioCtxRef.current;
          if (ctx && ctx.state === "suspended") {
            void ctx.resume();
          }
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener("click", tryResume, { once: true });
    window.addEventListener("touchstart", tryResume, { once: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("click", tryResume);
      window.removeEventListener("touchstart", tryResume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const [missed, setMissed] = React.useState<number>(0);
  const [storeId, setStoreId] = React.useState<string | null>(null);
  const lastSeenRef = React.useRef<{ id?: string; createdAt?: string }>({});
  // notifications always enabled by default; toggle removed in favor of modal
  const [enabled] = React.useState(true);
  const pollRef = React.useRef<number | null>(null);
  const POLL_MS = 10000; // 10 seconds fallback

  const showOrderToast = React.useCallback(
    (o: Order) => {
      const label = o.orderNumber || o.id || "Order Baru";
      const customer =
        (o.customerName || o.customer || o.billingName) ?? "Pelanggan";

      // Main: hanya gunakan beep.mp3 dari public, tanpa fallback
      try {
        const a = audioRef.current;
        if (!muted && a) {
          a.currentTime = 0;
          void a.play();
        }
      } catch {
        // ignore error
      }

      toast.custom(
        (t) => (
          <div
            className={`relative max-w-md w-full bg-white shadow-md rounded-md p-3 pl-4 pr-12 flex items-start gap-3 border-transparent transform transition ease-out duration-200 ${
              t.visible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-2 scale-95"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="flex-1">
              <div className="text-base text-slate-900 font-bold leading-tight">
                Order baru di toko: {label}
              </div>
              <div className="text-sm text-sky-400 mt-0.5">{customer}</div>
            </div>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-200"
              aria-label="Tutup notifikasi"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M18 6L6 18"
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ),
        { duration: 6000 }
      );

      // If transactions modal is not open, count this as a missed notification
      try {
        if (!transactionsModal.isOpen) {
          setMissed((m) => m + 1);
        }
      } catch {
        // ignore if transactionsModal isn't available for some reason
      }
    },
    [transactionsModal.isOpen, muted]
  );

  // track previous missed value to trigger pulse animation when it increases
  const prevMissedRef = React.useRef<number>(0);
  React.useEffect(() => {
    prevMissedRef.current = missed;
  }, [missed]);

  // update storeId whenever pathname changes (handles Next.js client navigation)
  React.useEffect(() => {
    const sid = getStoreIdFromPathname(
      pathname ??
        (typeof window !== "undefined" ? window.location.pathname : null)
    );
    if (sid !== storeId) {
      lastSeenRef.current = {};
      setStoreId(sid);
    }
    // only run when pathname changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // subscribe to SSE and fallback polling when storeId is set
  React.useEffect(() => {
    if (!storeId) return;
    if (!enabled) return;

    console.debug("OrderNotifier: subscribe", { storeId });
    const es = new EventSource(`/api/${storeId}/orders/stream`);

    es.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Order;
        if (!data || !data.id) return;

        if (lastSeenRef.current.id) {
          const lastTs = lastSeenRef.current.createdAt
            ? new Date(lastSeenRef.current.createdAt).getTime()
            : 0;
          const oTs = data.createdAt ? new Date(data.createdAt).getTime() : 0;
          if (oTs <= lastTs) return;
        }

        showOrderToast(data);
        lastSeenRef.current = {
          id: data.id,
          createdAt: data.createdAt ?? undefined,
        };
      } catch {
        // ignore
      }
    });

    es.addEventListener("open", () => {
      console.debug("OrderNotifier: EventSource open", {
        storeId,
        readyState: es.readyState,
      });
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    });

    es.addEventListener("error", () => {
      console.debug("OrderNotifier: EventSource error", {
        storeId,
        readyState: es.readyState,
      });
      if (!pollRef.current) {
        pollRef.current = window.setInterval(async () => {
          try {
            if (!lastSeenRef.current.createdAt) {
              const res = await fetch(
                `/api/${storeId}/sales?page=1&pageSize=5`
              );
              if (!res.ok) return;
              const body = await res.json();
              const orders = Array.isArray(body?.orders)
                ? (body.orders as Order[])
                : [];
              orders.sort((a, b) =>
                a.createdAt && b.createdAt
                  ? new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                  : 0
              );
              for (const o of orders) {
                if (!o || !o.id) continue;
                if (lastSeenRef.current.id && o.createdAt) {
                  const lastTs = lastSeenRef.current.createdAt
                    ? new Date(lastSeenRef.current.createdAt).getTime()
                    : 0;
                  const oTs = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                  if (oTs <= lastTs) continue;
                }
                showOrderToast(o);
                lastSeenRef.current = {
                  id: o.id,
                  createdAt: o.createdAt ?? undefined,
                };
              }
            } else {
              const params = new URLSearchParams();
              params.set("from", lastSeenRef.current.createdAt ?? "");
              const res = await fetch(
                `/api/${storeId}/sales?${params.toString()}`
              );
              if (!res.ok) return;
              const body = await res.json();
              const orders = Array.isArray(body?.orders)
                ? (body.orders as Order[])
                : [];
              orders.sort((a, b) =>
                a.createdAt && b.createdAt
                  ? new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                  : 0
              );
              for (const o of orders) {
                if (!o || !o.id) continue;
                const oTs = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                const lastTs = lastSeenRef.current.createdAt
                  ? new Date(lastSeenRef.current.createdAt).getTime()
                  : 0;
                if (oTs <= lastTs) continue;
                showOrderToast(o);
                lastSeenRef.current = {
                  id: o.id,
                  createdAt: o.createdAt ?? undefined,
                };
              }
            }
          } catch {
            // ignore
          }
        }, POLL_MS);
      }
    });

    // initial seed so we don't notify existing orders
    (async () => {
      try {
        const res = await fetch(`/api/${storeId}/sales?page=1&pageSize=1`);
        if (!res.ok) return;
        const body = await res.json();
        const latest =
          Array.isArray(body?.orders) && body.orders.length > 0
            ? (body.orders[0] as Order)
            : null;
        if (latest)
          lastSeenRef.current = {
            id: latest.id,
            createdAt: latest.createdAt ?? undefined,
          };
      } catch {
        // ignore
      }
    })();

    return () => {
      es.close();
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [storeId, enabled, showOrderToast]);

  // Clear missed counter when the transactions modal opens
  React.useEffect(() => {
    if (transactionsModal.isOpen) {
      setMissed(0);
    }
  }, [transactionsModal.isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <button
        onClick={() => {
          transactionsModal.onOpen();
          setMissed(0);
        }}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border shadow hover:bg-gray-50 relative"
        title="Lihat riwayat transaksi"
        aria-label={
          missed > 0
            ? `Lihat riwayat transaksi, ${missed} notifikasi belum dibaca`
            : "Lihat riwayat transaksi"
        }
      >
        {/* Font Awesome bell icon (react component) */}
        <span
          className={`text-gray-900 ${
            missed > prevMissedRef.current ? "animate-pulse" : ""
          }`}
        >
          <FontAwesomeIcon icon={faBell} aria-hidden />
        </span>

        {/* Missed notifications badge */}
        {missed > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-semibold shadow">
            {missed > 99 ? "99+" : missed}
          </span>
        )}
      </button>
    </div>
  );
}
