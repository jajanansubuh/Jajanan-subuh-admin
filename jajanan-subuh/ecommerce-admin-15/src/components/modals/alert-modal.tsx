"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/modal";
import { Button } from "../ui/button";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onConfirm may be async
  onConfirm: () => Promise<void> | void;
  loading: boolean;
  // optional overrideable title and description
  title?: string;
  description?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title,
  description,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      title={title ?? "Hapus Produk ini?"}
      description={description ?? "Tindakan ini tidak dapat dibatalkan"}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="pt-6 space-x-2 flex items-center justify-end w-full">
        <Button
          disabled={loading}
          variant={"outline"}
          className="rounded-md px-3 py-1 shadow-sm hover:shadow-md transition-shadow duration-150"
          onClick={onClose}
        >
          Batal
        </Button>
        <Button
          disabled={loading}
          variant={"destructive"}
          className="rounded-md px-3 py-1 shadow-sm hover:shadow-md transition-shadow duration-150"
          onClick={onConfirm}
        >
          Hapus
        </Button>
      </div>
    </Modal>
  );
};
