"use client";

import * as z from "zod";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Trash, Check, X } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// badges removed from UI; no import needed
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import { ApiAlert } from "@/components/ui/api-alert";
import { useOrigin } from "@/hooks/use-origin";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface SettingsFormProps {
  initialData: {
    id: string;
    name: string;
    paymentMethods?: { method: string; status: string }[];
    shippingMethods?: { method: string; status: string }[];
  };
}

type MethodObj = { method: string; status: string };

const formSchema = z.object({
  name: z.string().min(1),
  paymentMethods: z.string().optional(),
  shippingMethods: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export const SettingsForm: React.FC<SettingsFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const origin = useOrigin();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // method removal modal state
  const [methodRemoveOpen, setMethodRemoveOpen] = useState(false);
  const [methodToRemove, setMethodToRemove] = useState<{
    kind: "payment" | "shipping";
    value: string;
    staged: boolean;
  } | null>(null);
  // controlled state for the local-only sound notifier switch
  // State React saja, tidak pakai localStorage
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(100);
  // separate saved (persisted) and staged (pending) lists
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<MethodObj[]>(
    initialData.paymentMethods ?? []
  );
  const savedPaymentRef = useRef<MethodObj[]>(initialData.paymentMethods ?? []);
  const [stagedPaymentMethods, setStagedPaymentMethods] = useState<MethodObj[]>(
    []
  );
  const [paymentInput, setPaymentInput] = useState<string>("");

  // methods are stored as objects { method, status } and status persisted in DB

  const [savedShippingMethods, setSavedShippingMethods] = useState<MethodObj[]>(
    initialData.shippingMethods ?? []
  );
  const savedShippingRef = useRef<MethodObj[]>(
    initialData.shippingMethods ?? []
  );
  const [stagedShippingMethods, setStagedShippingMethods] = useState<
    MethodObj[]
  >([]);
  const [shippingInput, setShippingInput] = useState<string>("");

  // methods are stored as objects { method, status } and status persisted in DB

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialData,
      // convert arrays to comma-separated strings for form default
      paymentMethods: initialData.paymentMethods
        ? initialData.paymentMethods.map((p) => p.method).join(", ")
        : "",
      shippingMethods: initialData.shippingMethods
        ? initialData.shippingMethods.map((s) => s.method).join(", ")
        : "",
    },
  });

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setLoading(true);
      // combine saved + staged for the API (Add only stages, Save persists)
      const combinedPayment = [...savedPaymentMethods, ...stagedPaymentMethods];
      const combinedShipping = [
        ...savedShippingMethods,
        ...stagedShippingMethods,
      ];
      const payload = {
        ...data,
        paymentMethods: combinedPayment.length ? combinedPayment : undefined,
        shippingMethods: combinedShipping.length ? combinedShipping : undefined,
      };
      await axios.patch(`/api/stores/${params.storeId}`, payload);
      setSavedPaymentMethods(combinedPayment);
      setStagedPaymentMethods([]);
      setSavedShippingMethods(combinedShipping);
      setStagedShippingMethods([]);
      router.refresh();
      toast.success("Toko berhasil di update");
    } catch (error) {
      console.error("[SETTINGS_FORM_SUBMIT]", error);
      toast.error("Cek kembali data yang diinput");
    } finally {
      setLoading(false);
    }
  };

  // keep saved lists in sync when initialData changes (e.g., after router.refresh())
  useEffect(() => {
    setSavedPaymentMethods(initialData.paymentMethods ?? []);
  }, [initialData.paymentMethods]);

  useEffect(() => {
    setSavedShippingMethods(initialData.shippingMethods ?? []);
  }, [initialData.shippingMethods]);

  // keep refs in sync with latest state to avoid stale closures in async handlers
  useEffect(() => {
    savedPaymentRef.current = savedPaymentMethods;
  }, [savedPaymentMethods]);

  useEffect(() => {
    savedShippingRef.current = savedShippingMethods;
  }, [savedShippingMethods]);

  const togglePaymentActive = (method: string) => {
    const updateStatus = (arr: { method: string; status: string }[]) =>
      arr.map((m) =>
        m.method === method
          ? { ...m, status: m.status === "Aktif" ? "Nonaktif" : "Aktif" }
          : m
      );
    const next = updateStatus(savedPaymentMethods);
    setSavedPaymentMethods(next);
    savedPaymentRef.current = next;
    axios.patch(`/api/stores/${params.storeId}`, {
      paymentMethods: next,
      name: form.getValues?.().name ?? initialData.name,
    });
    const updated = next.find((p) => p.method === method);
    if (updated?.status === "Aktif") {
      toast.success(`Status ${method} diaktifkan`);
    } else {
      toast(`Status ${method} dinonaktifkan`, { icon: "🔕" });
    }
  };

  const toggleShippingActive = (method: string) => {
    const updateStatus = (arr: { method: string; status: string }[]) =>
      arr.map((m) =>
        m.method === method
          ? { ...m, status: m.status === "Aktif" ? "Nonaktif" : "Aktif" }
          : m
      );
    const next = updateStatus(savedShippingMethods);
    setSavedShippingMethods(next);
    savedShippingRef.current = next;
    axios.patch(`/api/stores/${params.storeId}`, {
      shippingMethods: next,
      name: form.getValues?.().name ?? initialData.name,
    });
    const updated = next.find((p) => p.method === method);
    if (updated?.status === "Aktif") {
      toast.success(`Status ${method} diaktifkan`);
    } else {
      toast(`Status ${method} dinonaktifkan`, { icon: "🔕" });
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/stores/${params.storeId}`);
      router.refresh();
      router.push("/");
      toast.success("Toko berhasil dihapus");
    } catch (error) {
      console.error("[SETTINGS_FORM_DELETE]", error);
      toast.error("Cek kembali data dan koneksi mu");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleRequestRemove = (
    kind: "payment" | "shipping",
    value: string,
    staged = false
  ) => {
    setMethodToRemove({ kind, value, staged });
    setMethodRemoveOpen(true);
  };

  const onConfirmMethodRemove = async () => {
    if (!methodToRemove) return;
    const { kind, value, staged } = methodToRemove;
    try {
      setLoading(true);

      if (staged) {
        // just remove locally from staged arrays
        if (kind === "payment") {
          setStagedPaymentMethods((prev) =>
            prev.filter((p) => p.method !== value)
          );
        } else {
          setStagedShippingMethods((prev) =>
            prev.filter((p) => p.method !== value)
          );
        }
        toast.success("Item dihapus");
        return;
      }

      // saved removal: compute next array and persist
      const nameToSend = form.getValues?.().name ?? initialData.name;
      if (kind === "payment") {
        // remove by method
        const removed = savedPaymentRef.current.find((p) => p.method === value);
        const next = savedPaymentRef.current.filter((p) => p.method !== value);
        // optimistically update
        setSavedPaymentMethods(next);
        savedPaymentRef.current = next;
        try {
          await axios.patch(`/api/stores/${params.storeId}`, {
            name: nameToSend,
            paymentMethods: next,
          });
          toast.success("Metode pembayaran dihapus");
        } catch (err) {
          // rollback: reinsert removed item if exists
          const rollback = removed
            ? [...savedPaymentRef.current, removed]
            : savedPaymentRef.current;
          setSavedPaymentMethods(rollback);
          savedPaymentRef.current = rollback;
          console.error("[REMOVE_PAYMENT_SAVE]", err);
          toast.error("Gagal menghapus metode pembayaran");
        }
      } else {
        const removed = savedShippingRef.current.find(
          (p) => p.method === value
        );
        const next = savedShippingRef.current.filter((p) => p.method !== value);
        setSavedShippingMethods(next);
        savedShippingRef.current = next;
        try {
          await axios.patch(`/api/stores/${params.storeId}`, {
            name: nameToSend,
            shippingMethods: next,
          });
          toast.success("Metode pengiriman dihapus");
        } catch (err) {
          const rollback = removed
            ? [...savedShippingRef.current, removed]
            : savedShippingRef.current;
          setSavedShippingMethods(rollback);
          savedShippingRef.current = rollback;
          console.error("[REMOVE_SHIPPING_SAVE]", err);
          toast.error("Gagal menghapus metode pengiriman");
        }
      }
    } finally {
      setLoading(false);
      setMethodRemoveOpen(false);
      setMethodToRemove(null);
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
      <AlertModal
        isOpen={methodRemoveOpen}
        onClose={() => setMethodRemoveOpen(false)}
        onConfirm={onConfirmMethodRemove}
        loading={loading}
        title={
          methodToRemove ? `Hapus ${methodToRemove.kind} method` : undefined
        }
        description={
          methodToRemove
            ? `Hapus "${methodToRemove.value}"? Tindakan ini tidak dapat dibatalkan.`
            : undefined
        }
      />
      <div className="flex items-center justify-between">
        <Heading title="Settings" description="Atur Toko" />
        <Button
          disabled={loading}
          variant="destructive"
          size="sm"
          type="button"
          onClick={() => setOpen(true)}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      {/* Sound notifications toggle - stored locally */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Notifikasi suara</div>
            <div className="text-sm text-muted-foreground">
              Putar suara ketika ada notifikasi order baru
            </div>
          </div>
          <div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(v) => {
                setSoundEnabled(!!v);
              }}
            />
          </div>
        </div>
      </div>

      {/* Volume slider for notification sound (local storage) */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Volume notifikasi</div>
            <div className="text-sm text-muted-foreground">
              Atur volume suara Notifikasi
            </div>
          </div>
          <div className="w-48">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  min={0}
                  max={100}
                  value={[volume]}
                  onValueChange={(val) => {
                    const n = Array.isArray(val) ? val[0] : Number(val) || 0;
                    setVolume(n);
                  }}
                />
              </div>
              <div className="w-10 text-right text-sm">{volume}</div>
            </div>
          </div>
        </div>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 w-full"
        >
          <div className="grid grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="paymentMethods"
              render={() => (
                <FormItem>
                  <FormLabel>Metode Pembayaran</FormLabel>
                  <FormControl>
                    <div>
                      {/* badges removed; saved methods are shown in the table below */}
                      <div className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Tambah metode pembayaran"
                          value={paymentInput}
                          onChange={(e) => setPaymentInput(e.target.value)}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const v = paymentInput.trim();
                            if (!v) return;

                            if (
                              savedPaymentRef.current.some(
                                (s) =>
                                  s.method.toLowerCase() === v.toLowerCase()
                              )
                            ) {
                              toast("Metode sudah ada", { icon: "⚠️" });
                              setPaymentInput("");
                              return;
                            }
                            try {
                              setLoading(true);
                              const nameToSend =
                                form.getValues?.().name ?? initialData.name;
                              // build next array from ref to avoid stale state
                              const next = [
                                ...savedPaymentRef.current,
                                { method: v, status: "Aktif" },
                              ];
                              // optimistically update state and ref
                              setSavedPaymentMethods(next);
                              savedPaymentRef.current = next;
                              await axios.patch(
                                `/api/stores/${params.storeId}`,
                                {
                                  name: nameToSend,
                                  paymentMethods: next,
                                }
                              );
                              setPaymentInput("");
                              toast.success("Metode pembayaran disimpan");
                            } catch (err) {
                              console.error("[ADD_PAYMENT_SAVE]", err);
                              // rollback
                              setSavedPaymentMethods((prev) =>
                                prev.filter((p) => p.method !== v)
                              );
                              savedPaymentRef.current =
                                savedPaymentRef.current.filter(
                                  (p) => p.method !== v
                                );
                              toast.error("Gagal menyimpan metode pembayaran");
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shippingMethods"
              render={() => (
                <FormItem>
                  <FormLabel>Metode Pengiriman</FormLabel>
                  <FormControl>
                    <div>
                      {/* badges removed; saved methods are shown in the table below */}
                      <div className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Tambah metode pengiriman"
                          value={shippingInput}
                          onChange={(e) => setShippingInput(e.target.value)}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const v = shippingInput.trim();
                            if (!v) return;
                            if (
                              savedShippingRef.current.some(
                                (s) =>
                                  s.method.toLowerCase() === v.toLowerCase()
                              )
                            ) {
                              toast("Metode sudah ada", { icon: "⚠️" });
                              setShippingInput("");
                              return;
                            }
                            try {
                              setLoading(true);
                              const next = [
                                ...savedShippingRef.current,
                                { method: v, status: "Aktif" },
                              ];
                              setSavedShippingMethods(next);
                              savedShippingRef.current = next;
                              const nameToSend =
                                form.getValues?.().name ?? initialData.name;
                              await axios.patch(
                                `/api/stores/${params.storeId}`,
                                {
                                  name: nameToSend,
                                  shippingMethods: next,
                                }
                              );
                              setShippingInput("");
                              toast.success("Metode pengiriman disimpan");
                            } catch (err) {
                              console.error("[ADD_SHIPPING_SAVE]", err);
                              setSavedShippingMethods((prev) =>
                                prev.filter((p) => p.method !== v)
                              );
                              savedShippingRef.current =
                                savedShippingRef.current.filter(
                                  (p) => p.method !== v
                                );
                              toast.error("Gagal menyimpan metode pengiriman");
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />
          {/* Payment and Shipping tables side-by-side on md+ */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card text-card-foreground rounded-xl border p-3 shadow-sm">
              <h3 className="mb-3 text-xl font-medium">Payment Methods</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-3 text-sm">Method</TableHead>
                    <TableHead className="py-2 px-3 text-sm">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedPaymentMethods.map((m, idx) => (
                    <TableRow key={`saved-pay-${idx}`}>
                      <TableCell className="w-40 py-2 px-3 text-sm">
                        {m.method}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          {/* Active / Inactive pill */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => togglePaymentActive(m.method)}
                                className={`rounded-full h-8 w-8 p-0 border transition-colors flex items-center justify-center ${
                                  m.status === "Aktif"
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                                aria-pressed={m.status === "Aktif"}
                                aria-label={`Toggle status ${m.method}`}
                              >
                                {m.status === "Aktif" ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              {m.status === "Aktif" ? "Aktif" : "Nonaktif"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0 rounded-full flex items-center justify-center"
                                onClick={() =>
                                  handleRequestRemove(
                                    "payment",
                                    m.method,
                                    false
                                  )
                                }
                                aria-label={`Hapus metode pembayaran ${m.method}`}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              Hapus
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {stagedPaymentMethods.map((m, idx) => (
                    <TableRow key={`staged-pay-${idx}`}>
                      <TableCell className="w-40 py-2 px-3 text-sm">
                        {m.method}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => togglePaymentActive(m.method)}
                            className={`rounded-full p-1 border transition-colors flex items-center justify-center ${
                              m.status === "Aktif"
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                            aria-pressed={m.status === "Aktif"}
                            aria-label={`Toggle status ${m.method}`}
                          >
                            {m.status === "Aktif" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full flex items-center justify-center"
                                onClick={() =>
                                  handleRequestRemove("payment", m.method, true)
                                }
                                aria-label={`Hapus metode pembayaran (staged) ${m.method}`}
                              >
                                <Trash className="h-4 w-4 text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              Hapus
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Shipping methods table */}
            <div className="bg-card text-card-foreground rounded-xl border p-3 shadow-sm">
              <h3 className="mb-3 text-xl font-medium">Shipping Methods</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-3 text-sm">Method</TableHead>
                    <TableHead className="py-2 px-3 text-sm">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedShippingMethods.map((m, idx) => (
                    <TableRow key={`saved-ship-${idx}`}>
                      <TableCell className="w-40 py-2 px-3 text-sm">
                        {m.method}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => toggleShippingActive(m.method)}
                                className={`rounded-full h-8 w-8 p-0 border transition-colors flex items-center justify-center ${
                                  m.status === "Aktif"
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                                aria-pressed={m.status === "Aktif"}
                                aria-label={`Toggle status ${m.method}`}
                              >
                                {m.status === "Aktif" ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              {m.status === "Aktif" ? "Aktif" : "Nonaktif"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0 rounded-full flex items-center justify-center"
                                onClick={() =>
                                  handleRequestRemove(
                                    "shipping",
                                    m.method,
                                    false
                                  )
                                }
                                aria-label={`Hapus metode pengiriman ${m.method}`}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              Hapus
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {stagedShippingMethods.map((m, idx) => (
                    <TableRow key={`staged-ship-${idx}`}>
                      <TableCell className="w-40 py-2 px-3 text-sm">
                        {m.method}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleShippingActive(m.method)}
                            className={`rounded-full h-8 w-8 p-0 border transition-colors flex items-center justify-center ${
                              m.status === "Aktif"
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                            aria-pressed={m.status === "Aktif"}
                            aria-label={`Toggle status ${m.method}`}
                          >
                            {m.status === "Aktif" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full flex items-center justify-center"
                                onClick={() =>
                                  handleRequestRemove(
                                    "shipping",
                                    m.method,
                                    true
                                  )
                                }
                                aria-label={`Hapus metode pengiriman (staged) ${m.method}`}
                              >
                                <Trash className="h-4 w-4 text-gray-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              Hapus
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Name and Save placed below the table */}
          <div className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nama Toko"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Button disabled={loading} type="submit">
                Save
              </Button>
            </div>
          </div>
        </form>
      </Form>
      <Separator />
      <ApiAlert
        title="PUBLIC_API_URL"
        description={`${origin}/api/${params.storeId}`}
        variant="public"
      />
    </>
  );
};
