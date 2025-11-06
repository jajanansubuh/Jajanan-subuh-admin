"use client";

import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import axios from "axios";
import { ProductColumn } from "./columns";
import { Button } from "@/components/ui/button";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AlertModal } from "@/components/modals/alert-modal";

interface CellActionProps {
  data: ProductColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const params = useParams();

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Product Id berhasil di copy");
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.storeId}/products/${data.id}`);
      router.refresh();
      router.push(`/${params.storeId}/products`);
      toast.success("Produk berhasil dihapus");
    } catch {
      toast.error("Cek kembali data dan koneksi mu");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  // local optimistic state so toggling one checkbox doesn't also update the other
  const [featured, setFeatured] = useState<boolean>(data.isFeatured);
  const [archived, setArchived] = useState<boolean>(data.isArchived);

  useEffect(() => {
    setFeatured(data.isFeatured);
    setArchived(data.isArchived);
  }, [data.isFeatured, data.isArchived]);

  const handleToggle = async (
    flag: "isFeatured" | "isArchived",
    value: boolean
  ) => {
    // Client-side rule:
    // - If toggling `isFeatured` to true => set `isArchived` = false.
    // - If toggling `isFeatured` to false => do not change `isArchived`.
    // - If toggling `isArchived` => set `isFeatured` = !isArchived (server rule mirrored client-side).
    let newFeatured = featured;
    let newArchived = archived;

    if (flag === "isFeatured") {
      newFeatured = value;
      if (value === true) {
        // turning featured on should turn archived off
        newArchived = false;
      }
      // if setting featured to false, leave archived as-is
    } else if (flag === "isArchived") {
      newArchived = value;
      newFeatured = !value;
    }

    // optimistic update
    setFeatured(newFeatured);
    setArchived(newArchived);

    try {
      setLoading(true);
      await axios.patch(`/api/${params.storeId}/products/${data.id}/toggle`, {
        isFeatured: newFeatured,
        isArchived: newArchived,
      });
      toast.success("Update berhasil");
      router.refresh();
    } catch {
      // revert to original props on failure
      setFeatured(data.isFeatured);
      setArchived(data.isArchived);
      toast.error("Gagal update, coba lagi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center space-x-2">
        {/* quick toggle featured as checkbox */}
        <label
          className="inline-flex items-center"
          title={featured ? "Unset featured" : "Set featured"}
        >
          <input
            type="checkbox"
            checked={featured}
            disabled={loading}
            onChange={(e) => handleToggle("isFeatured", e.target.checked)}
            aria-label="Toggle featured"
            className="sr-only "
          />
          <span
            className={`h-4 w-4 rounded-sm flex items-center justify-center border cursor-pointer ${
              featured
                ? "bg-green-500 border-green-500"
                : "bg-white border-gray-200"
            }`}
          >
            {featured && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-3 w-3 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </label>

        {/* quick toggle archived as checkbox */}
        <label
          className="inline-flex items-center"
          title={archived ? "Unarchive" : "Archive"}
        >
          <input
            type="checkbox"
            checked={archived}
            disabled={loading}
            onChange={(e) => handleToggle("isArchived", e.target.checked)}
            aria-label="Toggle archived"
            className="sr-only"
          />
          <span
            className={`h-4 w-4 rounded-sm flex items-center justify-center border cursor-pointer ${
              archived
                ? "bg-red-500 border-red-500"
                : "bg-white border-gray-200"
            }`}
          >
            {archived && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-3 w-3 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              <span className="sr-only">Open Menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onCopy(data.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Id
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/${params.storeId}/products/${data.id}`)
              }
            >
              <Edit className="mr-2 h-4 w-4" />
              Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};
