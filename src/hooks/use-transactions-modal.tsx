import { create } from "zustand";

interface UseTransactionsModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useTransactionsModal = create<UseTransactionsModalStore>(
  (set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
  })
);

export default useTransactionsModal;
