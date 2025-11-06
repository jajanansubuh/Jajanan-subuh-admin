"use client";

import * as React from "react";
import Modal from "../ui/modal";
import { useTransactionsModal } from "@/hooks/use-transactions-modal";
import { useEffect, useState } from "react";

type Tx = {
  id: string;
  orderNumber?: string | number | null;
  total?: number | null;
  createdAt?: string | null;
  customerName?: string | null;
};

type OrderItem = {
  productId?: string;
  name?: string;
  quantity?: number;
  price?: string | number | null;
};

type OrderDetail = {
  id: string;
  createdAt?: string | null;
  total?: number | string | null;
  items?: OrderItem[];
  customerName?: string | null;
  orderNumber?: number | null;
};

export const TransactionsModal: React.FC = () => {
  const modal = useTransactionsModal();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Tx[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const storeIdFromPath =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean)[0]
      : null;

  const formatCurrency = (value?: number | null) => {
    if (!value) return "-";
    try {
      return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
    } catch {
      return `Rp ${value}`;
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (!modal.isOpen) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/${
            window.location.pathname.split("/").filter(Boolean)[0]
          }/sales?page=1&pageSize=20`
        );
        if (!res.ok) return;
        const body = await res.json();
        if (!mounted) return;
        const orders = Array.isArray(body?.orders) ? (body.orders as Tx[]) : [];
        setItems(orders);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [modal.isOpen]);

  return (
    <Modal
      title="Riwayat Transaksi"
      description="Daftar transaksi terbaru"
      isOpen={modal.isOpen}
      onClose={modal.onClose}
    >
      <div className="mt-2">
        {loading ? (
          <div className="text-sm text-slate-500">Memuat...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-500">Belum ada transaksi</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto -mx-4 px-4 py-1">
            <ul className="divide-y divide-slate-200">
              {items.map((it) => (
                <li
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.currentTarget as HTMLElement).click();
                    }
                  }}
                  onClick={async () => {
                    try {
                      setDetailLoadingId(it.id);
                      const res = await fetch(
                        `/api/${storeIdFromPath}/orders/${it.id}`
                      );
                      if (!res.ok) return;
                      const body = await res.json();
                      setSelectedOrder(body?.order ?? body);
                      setDetailOpen(true);
                    } catch {
                      // ignore
                    } finally {
                      setDetailLoadingId(null);
                    }
                  }}
                  className={`py-3 flex items-start justify-between gap-4 hover:bg-slate-50 rounded-md px-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                    detailOpen && selectedOrder?.id === it.id
                      ? "bg-indigo-50"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {it.orderNumber ?? it.id}
                    </div>
                    <div className="text-xs text-sky-600 mt-0.5 truncate">
                      {it.customerName}
                    </div>
                    {it.createdAt ? (
                      <div className="text-xs text-slate-400 mt-1">
                        {formatDate(it.createdAt)}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-slate-700">
                        {formatCurrency(it.total)}
                      </div>
                      {detailLoadingId === it.id ? (
                        <svg
                          className="animate-spin h-4 w-4 text-indigo-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          ></path>
                        </svg>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-400">
                      {it.createdAt ? formatDate(it.createdAt) : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Nested detail modal */}
      <Modal
        title="Detail Order"
        description="Rincian item di order"
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        <div>
          {detailLoadingId ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : !selectedOrder ? (
            <div className="text-sm text-slate-500">Tidak ada data</div>
          ) : (
            <div className="space-y-3">
              {(selectedOrder.items || []).map((it: OrderItem, idx: number) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-slate-800">{it.name}</div>
                    <div className="text-xs text-slate-500">
                      Qty: {it.quantity ?? 1}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700">
                    {it.price
                      ? formatCurrency(Number(it.price as unknown as number))
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </Modal>
  );
};

export default TransactionsModal;
