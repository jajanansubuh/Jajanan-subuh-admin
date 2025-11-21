"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CustomerForm, columns, CustomersColumn } from "./components";
import { AlertModal } from "@/components/modals/alert-modal";

export default function CustomersPage({
  params
}: {
  params: { storeId: string } | Promise<{ storeId: string }>
}) {
  const [storeId, setStoreId] = useState<string>("");
  const [customers, setCustomers] = useState<Array<CustomersColumn>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomersColumn | null>(null);

  useEffect(() => {
    void (async () => {
      const resolvedParams = await params;
      let resolvedStoreId = resolvedParams?.storeId;

      // Fallback: if params didn't provide storeId (deployed environment mismatch),
      // try extracting it from the URL path: .../<storeId>/customers
      if (!resolvedStoreId && typeof window !== 'undefined') {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const customersIndex = parts.indexOf('customers');
        if (customersIndex > 0) {
          resolvedStoreId = parts[customersIndex - 1];
        } else {
          // fallback to first segment if structure differs
          resolvedStoreId = parts[0] || '';
        }
      }

      setStoreId(resolvedStoreId || '');
      // eslint-disable-next-line no-console
      console.log('CUSTOMERS_PAGE resolved storeId=', resolvedStoreId, 'fetchUrl=', `/api/stores/${resolvedStoreId}/customers`);
    })();
  }, [params]);

  const fetchCustomers = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const url = `/api/stores/${storeId}/customers`;
      // client-side debug log for deployed fetch attempts
      // eslint-disable-next-line no-console
      console.log('CUSTOMERS_PAGE fetching customers from', url);
      const response = await fetch(url);
      // try parse json, but guard against non-json body
      const data = await response.json().catch(() => null);

      // eslint-disable-next-line no-console
      console.log('CUSTOMERS_PAGE fetch status=', response.status, 'data=', data);

      if (!response.ok) {
        const isErrorObject = (v: unknown): v is { error?: unknown } => typeof v === 'object' && v !== null && 'error' in (v as Record<string, unknown>);
        const msg = isErrorObject(data) && typeof data.error === 'string' ? data.error : 'Failed to load customers';
        toast.error(msg);
        setCustomers([]);
        return;
      }

      if (!Array.isArray(data)) {
        toast.error('Unexpected response from server');
        setCustomers([]);
        return;
      }

      setCustomers(data as CustomersColumn[]);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error("Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const onEdit = useCallback((customer: CustomersColumn) => {
    setSelectedCustomer(customer);
    setOpen(true);
  }, []);

  const onDelete = useCallback((customerId: string) => {
    setSelectedCustomer(customers.find(c => c.id === customerId) || null);
    setDeleteOpen(true);
  }, [customers]);

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await fetch(`/api/stores/${storeId}/customers/${selectedCustomer.id}`, {
        method: "DELETE"
      });
      toast.success("Customer deleted successfully");
      await fetchCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error("Something went wrong");
    } finally {
      setDeleteOpen(false);
      setSelectedCustomer(null);
    }
  };

  const onSubmit = async (data: Omit<CustomersColumn, 'id' | 'createdAt'>) => {
    try {
      // Admin is not allowed to create customers here — only edit existing store-registered users.
      if (!selectedCustomer) {
        toast.error("Creating customers from admin is disabled. Customers must register via the store.");
        return;
      }

      await fetch(`/api/stores/${storeId}/customers/${selectedCustomer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      await fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error("Something went wrong");
    }
  };

  return (
    <>
      <AlertModal 
        isOpen={deleteOpen} 
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
      />
      <CustomerForm 
        initialData={selectedCustomer}
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setSelectedCustomer(null);
        }}
        onSubmit={onSubmit}
      />
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <Heading title={`Customers (${customers.length})`} description="Manage your store customers" />
          </div>
          <Separator />
            {!loading ? (
              <DataTable 
                searchKey="email" 
                columns={columns} 
                data={customers}
                meta={{
                  onEdit,
                  onDelete,
                }}
              />
            ) : (
              <div className="flex items-center justify-center p-8">
                Loading...
              </div>
            )}
        </div>
      </div>
    </>
  );
}
