"use client";

import React from "react";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import Modal from "@/components/ui/modal";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
// Input removed: search is handled by the DataTable's built-in search
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type OrderRow = {
  id: string;
  createdAt: string; // ISO
  total: string; // stringified Decimal
  itemsCount: number;
  customerName?: string | null;
  search?: string;
  orderNumber?: number | null;
  orderNo?: string; // formatted persistent order number (ORD-DDMMYY-NNNN) or fallback
};

type OrderDetail = {
  id: string;
  createdAt: string;
  total: string | number;
  items?: Array<{
    productId?: string;
    name?: string;
    quantity?: number;
    price?: string | number;
  }>;
  customerName?: string | null;
  address?: string | null;
  paymentMethod?: string | null;
  orderNumber?: number | null;
};

export default function SalesPageClient({
  params,
}: {
  params: { storeId?: string };
}) {
  const { storeId } = params || { storeId: undefined };
  const [from, setFrom] = React.useState<string | undefined>(undefined);
  const [to, setTo] = React.useState<string | undefined>(undefined);
  // server-side search removed to avoid duplicate search inputs
  const [sort, setSort] = React.useState<string>("newest");
  const [range, setRange] = React.useState<string>("custom");
  const [query, setQuery] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [data, setData] = React.useState<OrderRow[]>([]);
  const [ordersFull, setOrdersFull] = React.useState<ApiResponse["orders"]>([]);
  const [total, setTotal] = React.useState(0);
  const [revenue, setRevenue] = React.useState(0);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [toDeleteOrderId, setToDeleteOrderId] = React.useState<string | null>(
    null
  );
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailOrder, setDetailOrder] = React.useState<OrderDetail | undefined>(
    undefined
  );

  const currencyFormatter = React.useMemo(() => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });
  }, []);

  const formatCurrency = React.useCallback(
    (value: string | number | undefined) => {
      const num = Number(value ?? 0);
      return currencyFormatter.format(isNaN(num) ? 0 : num);
    },
    [currencyFormatter]
  );

  // Format persistent order number to string like ORD-DDMMYY-NNNN
  const formatOrderNo = React.useCallback(
    (
      order:
        | { orderNumber?: number | null; createdAt?: string }
        | null
        | undefined,
      fallbackIndex?: number
    ) => {
      if (!order)
        return fallbackIndex
          ? `ORD-${String(fallbackIndex).padStart(4, "0")}`
          : "";
      const num = order.orderNumber;
      if (typeof num === "number" && !Number.isNaN(num)) {
        try {
          const d = order.createdAt ? new Date(order.createdAt) : new Date();
          const datePart = format(d, "ddMMyy");
          return `ORD-${datePart}-${String(num).padStart(4, "0")}`;
        } catch {
          return `ORD-${String(num).padStart(4, "0")}`;
        }
      }
      if (typeof fallbackIndex === "number") {
        return `ORD-${String(fallbackIndex).padStart(4, "0")}`;
      }
      return "";
    },
    []
  );

  type ApiResponse = {
    ok: boolean;
    page: number;
    pageSize: number;
    total: number;
    revenue: number;
    revenueAll?: number;
    orders: Array<{
      id: string;
      createdAt: string;
      total: string | number;
      customerName?: string | null;
      items?: Array<{
        productId: string;
        name: string;
        quantity: number;
        price: string | number;
      }>;
    }>;
  };

  const fetchData = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (sort) params.set("sort", sort);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/${storeId}/sales?${params.toString()}`);
      const body: ApiResponse & { revenueAll?: number } = await res.json();
      if (!body || !body.ok) {
        setData([]);
        setTotal(0);
        setRevenue(0);
        return;
      }
      const rows = body.orders.map((o, idx) => {
        const maybe = o as unknown as { customerName?: string | null };
        const cust = maybe.customerName ?? null;
        const number = (page - 1) * pageSize + idx + 1;
        // Prefer persistent orderNumber from DB when present.
        const dbOrderNumber = (o as unknown as { orderNumber?: number | null })
          .orderNumber as number | undefined | null;
        let orderNo = `ORD-${String(number).padStart(4, "0")}`;
        if (typeof dbOrderNumber === "number" && !Number.isNaN(dbOrderNumber)) {
          try {
            const d = new Date(o.createdAt);
            const datePart = format(d, "ddMMyy");
            orderNo = `ORD-${datePart}-${String(dbOrderNumber).padStart(
              4,
              "0"
            )}`;
          } catch {
            orderNo = `ORD-${String(dbOrderNumber).padStart(4, "0")}`;
          }
        }
        return {
          id: o.id,
          createdAt: o.createdAt,
          total: String(o.total),
          itemsCount: o.items?.length ?? 0,
          customerName: cust,
          search: `${orderNo} ${String(cust ?? "")}`,
          orderNumber: dbOrderNumber ?? null,
          orderNo,
        } as OrderRow;
      });
      setData(rows);
      setOrdersFull(body.orders || []);
      setTotal(body.total ?? 0);
      setRevenue(body.revenue ?? 0);
      if (typeof body.revenueAll === "number") {
        setRevenue(Number(body.revenueAll));
      }
    } finally {
      // noop
    }
  }, [storeId, from, to, sort, page, pageSize]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formattedDetailDate = React.useMemo(() => {
    try {
      if (!detailOrder?.createdAt) return "";
      return format(new Date(detailOrder.createdAt), "PPpp");
    } catch {
      return detailOrder?.createdAt ?? "";
    }
  }, [detailOrder?.createdAt]);

  const detailItemsTotal = React.useMemo(() => {
    try {
      if (!detailOrder?.items) return 0;
      return detailOrder.items.reduce((acc, it) => {
        const price = Number(it.price ?? 0);
        const qty = Number(it.quantity ?? 0);
        return acc + price * qty;
      }, 0);
    } catch {
      return 0;
    }
  }, [detailOrder?.items]);

  // keep `sort` for ordering (newest/oldest/total_asc/total_desc)
  const handleSortChange = React.useCallback((val: string) => {
    setSort(val);
    setPage(1);
  }, []);

  // handle range/preset changes (custom, today, this_week, this_month, this_year)
  const handleRangeChange = React.useCallback((val: string) => {
    const toIsoDate = (d: Date) => format(d, "yyyy-MM-dd");
    const today = new Date();

    setRange(val);
    if (val === "custom") {
      // leave from/to as they are so user can use picker
      setPage(1);
      return;
    }

    let fromDate: string | undefined = undefined;
    let toDate: string | undefined = undefined;

    if (val === "today") {
      fromDate = toIsoDate(today);
      toDate = toIsoDate(today);
    } else if (val === "this_week") {
      const d = new Date(today);
      const day = d.getDay();
      const diffToMon = (day + 6) % 7;
      const start = new Date(d);
      start.setDate(d.getDate() - diffToMon);
      fromDate = toIsoDate(start);
      toDate = toIsoDate(today);
    } else if (val === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      fromDate = toIsoDate(start);
      toDate = toIsoDate(today);
    } else if (val === "this_year") {
      const year = today.getFullYear();
      fromDate = `${year}-01-01`;
      toDate = `${year}-12-31`;
    }

    setFrom(fromDate);
    setTo(toDate);
    setPage(1);
  }, []);

  // small header component that shows label with asc / desc controls
  const SortHeader = React.useCallback(
    ({
      label,
      ascValue,
      descValue,
    }: {
      label: string;
      ascValue: string;
      descValue: string;
    }) => {
      return (
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <div className="flex flex-col">
            <button
              title={`Sort ${label} ascending`}
              aria-label={`Sort ${label} ascending`}
              onClick={() => handleSortChange(ascValue)}
              className={`p-0 leading-none -mb-1 ${
                sort === ascValue
                  ? "opacity-100 text-black"
                  : "opacity-50 text-muted-foreground"
              }`}
            >
              <ChevronUpIcon className="w-3 h-3" />
            </button>
            <button
              title={`Sort ${label} descending`}
              aria-label={`Sort ${label} descending`}
              onClick={() => handleSortChange(descValue)}
              className={`p-0 leading-none ${
                sort === descValue
                  ? "opacity-100 text-black"
                  : "opacity-50 text-muted-foreground"
              }`}
            >
              <ChevronDownIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    },
    [sort, handleSortChange]
  );

  const columns = React.useMemo<ColumnDef<OrderRow, unknown>[]>(
    () => [
      {
        id: "no",
        header: "Order No",
        cell: (info) => {
          const row = info.row.original as OrderRow;
          const formatted =
            row.orderNo ??
            (() => {
              const idx = info.row.index;
              const number = (page - 1) * pageSize + idx + 1;
              return `ORD-${String(number).padStart(4, "0")}`;
            })();
          return <span className="font-medium">{formatted}</span>;
        },
      },
      {
        accessorKey: "search",
        id: "search",
        header: "",
        cell: () => null, // hidden/empty column used only for table search
      },
      // Order ID column removed; Order No is shown instead (non-persistent)
      {
        accessorKey: "createdAt",
        header: () => (
          <SortHeader label="Date" ascValue="oldest" descValue="newest" />
        ),
        cell: (info) => format(new Date(info.getValue() as string), "PPpp"),
      },
      {
        id: "customer",
        header: "Customer",
        cell: (info) => {
          const id = (info.row.original as OrderRow).id;
          const order = ordersFull.find((o) => o.id === id);
          return <span>{order?.customerName ?? "-"}</span>;
        },
      },
      {
        accessorKey: "itemsCount",
        header: "Items",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "total",
        header: () => (
          <SortHeader
            label="Total"
            ascValue="total_asc"
            descValue="total_desc"
          />
        ),
        cell: (info) => formatCurrency(info.getValue() as string | number),
      },
      {
        id: "actions",
        header: "",
        cell: (info) => {
          const id = (info.row.original as OrderRow).id;
          return (
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="px-3 py-1"
                onClick={() => {
                  try {
                    const order = ordersFull.find((o) => o.id === id);
                    if (!order) {
                      toast.error("Gagal memuat detail order");
                      return;
                    }
                    // include orderNumber if present in backend order
                    setDetailOrder(order as OrderDetail);
                    setDetailOpen(true);
                  } catch (e) {
                    console.error("load order detail", e);
                    toast.error("Terjadi kesalahan saat memuat detail order");
                  }
                }}
              >
                Detail
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="rounded-md px-3 py-1 shadow-sm hover:shadow-md transition-colors duration-150 focus-visible:ring-destructive/50"
                onClick={() => {
                  setToDeleteOrderId(id);
                  setDeleteOpen(true);
                }}
              >
                Hapus
              </Button>
            </div>
          );
        },
      },
    ],
    [formatCurrency, ordersFull, page, pageSize, SortHeader]
  );

  // handler used by dialog
  const handleConfirmDelete = async () => {
    if (!toDeleteOrderId) return;
    try {
      const res = await fetch(`/api/${storeId}/sales`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: toDeleteOrderId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!body || !body.ok) {
        toast.error("Gagal menghapus transaksi");
        return;
      }
      toast.success("Transaksi dihapus");
      setDeleteOpen(false);
      setToDeleteOrderId(null);
      fetchData();
    } catch (e) {
      console.error("delete order", e);
      toast.error("Terjadi kesalahan saat menghapus transaksi");
    }
  };

  return (
    <div className="p-8 sm:p-8 px-4 py-4">
      <h2 className="text-lg font-semibold mb-4">Laporan Penjualan</h2>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <div className="flex flex-col mb-2">
            <label className="text-sm text-muted-foreground mb-1">
              Periode
            </label>
            <Select value={range} onValueChange={handleRangeChange}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="today">Hari ini</SelectItem>
                <SelectItem value="this_week">Minggu ini</SelectItem>
                <SelectItem value="this_month">Bulan ini</SelectItem>
                <SelectItem value="this_year">Tahun ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-1">
            <label className="text-sm text-muted-foreground mb-1">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders"
              className="border rounded px-2 py-2 text-sm w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  {from ? from : "Mulai"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={from ? new Date(from) : undefined}
                  onSelect={(date) => {
                    if (!date) return;
                    const d = date instanceof Date ? date : date[0];
                    const iso = format(d, "yyyy-MM-dd");
                    setFrom(iso);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  {to ? to : "Selesai"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={to ? new Date(to) : undefined}
                  onSelect={(date) => {
                    if (!date) return;
                    const d = date instanceof Date ? date : date[0];
                    const iso = format(d, "yyyy-MM-dd");
                    setTo(iso);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              onClick={() => {
                setPage(1);
                fetchData();
              }}
              className="bg-black text-white w-full sm:w-auto"
            >
              Filter
            </Button>
          </div>
        </div>
        <div className="text-left sm:text-right w-full sm:w-auto">
          <div className="text-sm text-muted-foreground">
            Total Orders: {total}
          </div>
          <div className="font-semibold">Total Revenue: Rp {revenue}</div>
        </div>
      </div>

      <div className="w-full overflow-x-auto bg-white rounded-md shadow-sm">
        <div className="max-w-full">
          <DataTable
            columns={columns}
            data={data}
            searchKey="search"
            showSearch={false}
            externalSearch={query}
          />
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus transaksi ini? ID:{" "}
              {formatOrderNo(
                ordersFull.find((o) => o.id === toDeleteOrderId) as unknown as
                  | { orderNumber?: number | null; createdAt?: string }
                  | undefined,
                undefined
              )}
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Modal
        title={`Detail Order ${formatOrderNo(detailOrder)}`}
        description={`Tanggal: ${formattedDetailDate}`}
        isOpen={Boolean(detailOpen)}
        onClose={() => {
          setDetailOpen(false);
          setDetailOrder(undefined);
        }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Customer</div>
              <div className="font-medium">
                {detailOrder?.customerName ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Alamat</div>
              <div className="font-medium whitespace-pre-line break-words max-w-[40ch]">
                {detailOrder?.address ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Payment</div>
              <div className="font-medium">
                {detailOrder?.paymentMethod ?? "-"}
              </div>
            </div>
          </div>

          {detailOrder?.items && detailOrder.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-medium pb-2">Nama</th>
                    <th className="text-right font-medium pb-2">Qty</th>
                    <th className="text-right font-medium pb-2">Harga</th>
                    <th className="text-right font-medium pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailOrder.items.map((it, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="py-2 break-words">{it.name}</td>
                      <td className="py-2 text-right">{it.quantity}</td>
                      <td className="py-2 text-right">
                        {formatCurrency(it.price)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(
                          Number(it.price ?? 0) * Number(it.quantity ?? 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="py-2 font-medium">Jumlah</td>
                    <td />
                    <td />
                    <td className="py-2 text-right font-semibold">
                      {formatCurrency(detailItemsTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div>Tidak ada item.</div>
          )}
        </div>
      </Modal>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>Halaman {page}</div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex-1 sm:w-auto min-w-[100px]"
          >
            Prev
          </Button>
          <Button
            onClick={() => setPage((p) => p + 1)}
            className="flex-1 sm:w-auto min-w-[100px]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
