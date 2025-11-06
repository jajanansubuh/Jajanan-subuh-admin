"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/modals/alert-modal";

type Review = {
  id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  createdAtFormatted?: string | null;
};

interface Props {
  initialReviews: Review[];
}

const ReviewsListClient: React.FC<Props> = ({ initialReviews }) => {
  const [reviews, setReviews] = useState<Review[]>(initialReviews || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    // open confirmation modal
    setToDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!toDeleteId) return;
    const id = toDeleteId;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        toast.error(`Gagal menghapus: ${text}`);
        return;
      }
      setReviews((r) => r.filter((x) => x.id !== id));
      toast.success("Ulasan dihapus");
      setConfirmOpen(false);
      setToDeleteId(null);
    } catch (e) {
      console.error(e);
      toast.error("Terjadi kesalahan saat menghapus");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold">Ulasan Produk</h3>
      <div className="mt-3 space-y-3">
        {reviews.length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada ulasan.</div>
        )}
        {reviews.map((rv) => (
          <div key={rv.id} className="border rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{rv.name}</div>
              <div className="text-sm text-muted-foreground">
                {rv.createdAtFormatted ??
                  new Date(rv.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-amber-400 flex">
              {Array.from({ length: rv.rating }).map((_, i) => (
                <svg
                  key={i}
                  className="w-4 h-4 text-amber-400 mr-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.974a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.973c.3.922-.755 1.688-1.538 1.118L10 13.347l-3.39 2.465c-.783.57-1.838-.196-1.538-1.118l1.287-3.973a1 1 0 00-.364-1.118L2.615 9.4c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69L9.05 2.927z" />
                </svg>
              ))}
            </div>
            <div className="mt-2 text-sm">{rv.comment}</div>
            <div className="mt-2 flex justify-end">
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loadingId === rv.id}
                  onClick={() => onDelete(rv.id)}
                >
                  {loadingId === rv.id ? "Menghapus..." : "Hapus"}
                </Button>
                <AlertModal
                  isOpen={confirmOpen && toDeleteId === rv.id}
                  onClose={() => {
                    setConfirmOpen(false);
                    setToDeleteId(null);
                  }}
                  onConfirm={handleConfirmDelete}
                  loading={loadingId === rv.id}
                />
              </>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsListClient;
