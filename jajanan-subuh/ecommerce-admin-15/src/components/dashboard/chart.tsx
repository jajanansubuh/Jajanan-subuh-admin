"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import FlipCard, { FlipCardGroup } from "@/components/ui/flip-card";
// tooltip primitives removed (not used here)
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpFromBracket } from "@fortawesome/free-solid-svg-icons";
import SalesPageClient from "@/components/dashboard/SalesPageClient";

// default mock dataset while loading
const defaultData = [
  { name: "Jan", sales: 4000 },
  { name: "Feb", sales: 3000 },
  { name: "Mar", sales: 5000 },
  { name: "Apr", sales: 4500 },
  { name: "May", sales: 6000 },
  { name: "Jun", sales: 7000 },
];

export default function DashboardChart() {
  const [data, setData] = React.useState(defaultData);
  const [storeId, setStoreId] = React.useState<string | null>(null);
  const [summaryStats, setSummaryStats] = React.useState<{
    totalRevenue: number;
    totalOrders: number;
    activeThisMonth: number;
    // revenue growth vs previous month
    revenueGrowthRate: number | null;
    revenueGrowthLabel?: string;
    // orders (count) growth vs previous month
    ordersGrowthRate: number | null;
    ordersGrowthLabel?: string;
    // share of last month vs total (year-to-date)
    revenueSharePercent?: number;
    ordersSharePercent?: number;
    currentMonthRevenue?: number;
  } | null>(null);

  React.useEffect(() => {
    try {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const storeIndex = parts.findIndex((p) => p === "dashboard") + 1;
      const sid = parts[storeIndex] || parts[0] || "";
      setStoreId(sid);
    } catch (e) {
      console.warn("Could not determine storeId from pathname", e);
    }
  }, []);

  React.useEffect(() => {
    if (!storeId) return;

    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/${storeId}/sales/summary`);
        const body: {
          ok?: boolean;
          data?: Array<{ month: string; revenue: number; count?: number }>;
        } = await res.json();
        if (body?.ok && Array.isArray(body.data)) {
          const mapped = body.data.map((m) => ({
            name: m.month,
            sales: m.revenue,
          }));
          setData(mapped);

          const months = body.data as Array<{
            month: string;
            revenue: number;
            count?: number;
          }>;
          const totalRevenue = months.reduce((s, m) => s + (m.revenue || 0), 0);
          const totalOrders = months.reduce((s, m) => s + (m.count || 0), 0);
          const last = months[months.length - 1] ?? null;
          const prev = months[months.length - 2] ?? null;
          const activeThisMonth = last ? last.count || 0 : 0;

          // compute revenue growth
          let revenueGrowthRate: number | null = null;
          let revenueGrowthLabel: string | undefined = undefined;
          if (prev && last) {
            const prevRev = prev.revenue || 0;
            const lastRev = last.revenue || 0;
            if (prevRev === 0) {
              if (lastRev === 0) {
                revenueGrowthRate = 0;
              } else {
                revenueGrowthRate = null;
                revenueGrowthLabel = "New";
              }
            } else {
              revenueGrowthRate = ((lastRev - prevRev) / prevRev) * 100;
            }
          }

          // compute orders (count) growth
          let ordersGrowthRate: number | null = null;
          let ordersGrowthLabel: string | undefined = undefined;
          if (prev && last) {
            const prevCount = prev.count || 0;
            const lastCount = last.count || 0;
            if (prevCount === 0) {
              if (lastCount === 0) {
                ordersGrowthRate = 0;
              } else {
                ordersGrowthRate = null;
                ordersGrowthLabel = "New";
              }
            } else {
              ordersGrowthRate = ((lastCount - prevCount) / prevCount) * 100;
            }
          }

          const revenueSharePercent =
            totalRevenue > 0 && last
              ? 100 * ((last.revenue || 0) / totalRevenue)
              : undefined;
          const ordersSharePercent =
            totalOrders > 0 && last
              ? 100 * ((last.count || 0) / totalOrders)
              : undefined;
          const currentMonthRevenue = last ? last.revenue || 0 : 0;

          setSummaryStats({
            totalRevenue,
            totalOrders,
            activeThisMonth,
            revenueGrowthRate,
            revenueGrowthLabel,
            ordersGrowthRate,
            ordersGrowthLabel,
            revenueSharePercent,
            ordersSharePercent,
            currentMonthRevenue,
          });
        }
      } catch (e) {
        console.error("[CHART_FETCH]", e);
      }
    };

    fetchSummary();
  }, [storeId]);

  const compactNumber = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  // FlipCard is imported from '@/components/ui/flip-card'

  // metric: 'revenue' | 'orders' -> pick corresponding growth values
  const badgeFor = (
    stats: typeof summaryStats,
    metric: "revenue" | "orders" | "revenueShare" | "ordersShare" = "revenue"
  ) => {
    if (!stats) return { text: "—", className: "text-white bg-white/10" };
    // shares are absolute percentages of last month vs total; growth are changes vs prev
    if (metric === "revenueShare") {
      const v = stats.revenueSharePercent;
      if (v === undefined)
        return { text: "—", className: "text-white bg-white/10" };
      return {
        text: `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
        className:
          v >= 0 ? "text-green-600 bg-green-100" : "text-rose-600 bg-rose-100",
      };
    }

    if (metric === "ordersShare") {
      const v = stats.ordersSharePercent;
      if (v === undefined)
        return { text: "—", className: "text-white bg-white/10" };
      return {
        text: `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
        className:
          v >= 0 ? "text-green-600 bg-green-100" : "text-rose-600 bg-rose-100",
      };
    }

    const growthRate =
      metric === "revenue" ? stats.revenueGrowthRate : stats.ordersGrowthRate;
    const growthLabel =
      metric === "revenue" ? stats.revenueGrowthLabel : stats.ordersGrowthLabel;

    if (growthLabel)
      return { text: growthLabel, className: "text-green-600 bg-green-100" };

    if (growthRate === null)
      return { text: "—", className: "text-white bg-white/10" };

    return {
      text: `${growthRate && growthRate >= 0 ? "+" : ""}${
        growthRate ? growthRate.toFixed(1) : "0.0"
      }%`,
      className:
        growthRate && growthRate >= 0
          ? "text-green-600 bg-green-100"
          : "text-rose-600 bg-rose-100",
    };
  };

  // export menu shown on hover (CSS-driven)
  const exportHandler = async (format: "csv" | "xlsx") => {
    try {
      if (!storeId) throw new Error("storeId not available");
      const url = `/api/${storeId}/sales?export=1&format=${format}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `sales-${storeId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      console.error("Export failed", e);
    }
    // menu is CSS-driven (hover); nothing to close programmatically
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <FlipCardGroup>
          <FlipCard
            back={
              "Rasio Order Bulan Ini terhadap Total Order Seluruh Periode. Ini menunjukkan seberapa besar kontribusi order di bulan ini dari keseluruhan order yang ada."
            }
            axis="y"
            duration={520}
            className="p-0"
            id="metric-revenue"
          >
            <Card className="p-3 h-40 bg-[#0691ff] !text-white">
              <CardHeader className="p-0 h-full">
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-white mt-0">
                        Total Pendapatan
                      </div>
                    </div>
                    {(() => {
                      // show revenue share badge for total revenue
                      const b = badgeFor(summaryStats, "revenueShare");
                      return (
                        <div
                          className={`text-xs px-2 py-1 rounded-full h-fit ml-2 ${b.className}`}
                        >
                          {b.text}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="text-lg font-semibold mt-1">
                      {summaryStats
                        ? new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(summaryStats.totalRevenue)
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-white mt-1">
                      Pendapatan Tahun Ini
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </FlipCard>

          <FlipCard
            back="Total Keseluruhan Transaksi yang terjadi selama rentang waktu periode pelaporan yang dipilih."
            axis="y"
            duration={520}
            className="p-0"
            id="metric-orders"
          >
            <Card className="p-3 h-40 bg-[#2d425c] !text-white">
              <CardHeader className="p-0 h-full">
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-white">Total Transaksi</div>
                    {(() => {
                      const b = badgeFor(summaryStats, "ordersShare");
                      return (
                        <div
                          className={`text-xs px-2 py-1 rounded-full h-fit ml-2 ${b.className}`}
                        >
                          {summaryStats ? b.text : "—"}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="text-lg font-semibold mt-1">
                      {summaryStats
                        ? compactNumber(summaryStats.totalOrders)
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-white mt-1">
                      Order Periode Ini
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </FlipCard>

          <FlipCard
            back="Order yang Berhasil Diselesaikan pada bulan berjalan. (Hanya mencakup order dengan status Selesai)"
            axis="y"
            duration={520}
            className="p-0"
            id="metric-active"
          >
            <Card className="p-3 h-40 bg-[#e2e1e2] !text-black">
              <CardHeader className="p-0 h-full">
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-black">Order Bulan Ini</div>
                    {(() => {
                      const b = badgeFor(summaryStats, "orders");
                      return (
                        <div
                          className={`text-xs px-2 py-1 rounded-full h-fit ml-2 ${b.className}`}
                        >
                          {summaryStats ? b.text : "—"}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="text-lg font-semibold mt-1">
                      {summaryStats
                        ? compactNumber(summaryStats.activeThisMonth)
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-black mt-1">
                      Jumlah Orderan yang Selesai
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </FlipCard>

          <FlipCard
            back="Perbandingan Pendapatan. Menampilkan persentase pertumbuhan atau penurunan pendapatan di bulan ini dibandingkan dengan bulan sebelumnya."
            axis="y"
            duration={520}
            className="p-0"
            id="metric-growth"
          >
            <Card className="p-3 h-40 bg-[#f9fcff] !text-black">
              <CardHeader className="p-0 h-full">
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-black">
                      Tingkat Pertumbuhan
                    </div>
                    {(() => {
                      // show revenue growth badge
                      const b = badgeFor(summaryStats, "revenue");
                      return (
                        <div
                          className={`text-xs px-2 py-1 rounded-full h-fit ml-2 ${b.className}`}
                        >
                          {summaryStats ? b.text : "—"}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="text-lg font-semibold mt-1">
                      {summaryStats
                        ? new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(summaryStats.currentMonthRevenue || 0)
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-black mt-1">
                      Pendapatan Bulan Ini
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </FlipCard>
        </FlipCardGroup>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
            <div className="w-full sm:w-auto">
              <CardTitle>
                <Heading
                  title="Penjualan"
                  description="Ringkasan penjualan beberapa bulan terakhir"
                />
              </CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex flex-row sm:flex-col items-center sm:items-end mr-0 sm:mr-2">
                <span className="text-sm font-bold text-black mb-2 sm:mb-0">
                  Export laporan
                </span>
              </div>
              <div className="relative flex flex-row gap-2 w-full sm:w-auto group">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[110px] w-auto border-primary text-primary hover:bg-primary hover:text-white transition-colors duration-150 flex items-center"
                  type="button"
                >
                  <span className="mr-2">Export</span>
                  <FontAwesomeIcon
                    icon={faArrowUpFromBracket}
                    className="w-4 h-4"
                  />
                </Button>

                {/* CSS-driven dropdown: appears on hover/focus-within of the parent .group with smooth animation */}
                <div
                  className="absolute z-50 left-0 top-full mt-2 w-auto min-w-[160px] bg-white rounded-xl shadow-lg overflow-hidden border border-[#ececec] \
                  opacity-0 translate-y-1 scale-95 pointer-events-none transition-all duration-150 ease-out \
                  group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto \
                  group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:pointer-events-auto"
                >
                  <button
                    className="w-full text-left px-4 py-3 text-sm text-[#0f172a] bg-white hover:bg-[#f8fafc] focus:bg-[#f8fafc] focus:outline-none"
                    style={{ margin: 0 }}
                    onClick={() => exportHandler("csv")}
                    type="button"
                  >
                    Export CSV
                  </button>
                  <div className="border-t border-[#eef2ff]" />
                  <button
                    className="w-full text-left px-4 py-3 text-sm text-[#0f172a] bg-white hover:bg-[#f8fafc] focus:bg-[#f8fafc] focus:outline-none"
                    style={{ margin: 0 }}
                    onClick={() => exportHandler("xlsx")}
                    type="button"
                  >
                    Export XLSX
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        {storeId ? <SalesPageClient params={{ storeId }} /> : null}
      </div>
    </>
  );
}
