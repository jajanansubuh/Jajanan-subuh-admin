"use client";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CustomerForm } from "./components/customer-form";
import { columns, CustomersColumn } from "./components/columns";
import { AlertModal } from "@/components/modals/alert-modal";

export default function CustomersPage({
  params
}: {
  params: Promise<{ storeId: string }>
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
      setStoreId(resolvedParams.storeId);
    })();
  }, [params]);

  const fetchCustomers = useCallback(async () => {
    if (!storeId) return;
    try {
      const response = await fetch(`/api/stores/${storeId}/customers`);
      const data = await response.json();
      // assume API returns correct shape; coerce to CustomersColumn[]
      setCustomers((data as unknown) as CustomersColumn[]);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error("Failed to load customers");
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
      if (selectedCustomer) {
        await fetch(`/api/stores/${storeId}/customers/${selectedCustomer.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      } else {
        await fetch(`/api/stores/${storeId}/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      }
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
            <Heading title="Customers" description="Manage your store customers" />
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
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