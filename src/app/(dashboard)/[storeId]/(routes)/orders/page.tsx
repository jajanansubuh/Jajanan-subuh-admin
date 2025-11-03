"use client";
import React, { useEffect, useState } from "react";

interface OrderItem {
  id: string;
  quantity: number;
  product: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  store: {
    name: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Laporan Pesanan</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">ID</th>
              <th className="border px-2 py-1">Tanggal</th>
              <th className="border px-2 py-1">Toko</th>
              <th className="border px-2 py-1">Produk</th>
              <th className="border px-2 py-1">Jumlah</th>
              <th className="border px-2 py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="border px-2 py-1">{order.id}</td>
                <td className="border px-2 py-1">
                  {new Date(order.createdAt).toLocaleString()}
                </td>
                <td className="border px-2 py-1">{order.store?.name}</td>
                <td className="border px-2 py-1">
                  {order.items.map((item) => (
                    <div key={item.id}>{item.product?.name}</div>
                  ))}
                </td>
                <td className="border px-2 py-1">
                  {order.items.map((item) => (
                    <div key={item.id}>{item.quantity}</div>
                  ))}
                </td>
                <td className="border px-2 py-1">
                  {order.items
                    .reduce(
                      (sum, item) =>
                        sum + (item.product?.price || 0) * item.quantity,
                      0
                    )
                    .toLocaleString("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
