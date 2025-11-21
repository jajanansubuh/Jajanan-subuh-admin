"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { MoreHorizontal, Edit, Trash } from "lucide-react"

interface TableMeta {
  onEdit: (customer: CustomersColumn) => void;
  onDelete: (customerId: string) => void;
}

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type CustomersColumn = {
  id: string
  name: string
  email?: string | null
  address?: string | null
  phone?: string | null
  gender?: string | null
  role?: "CUSTOMER" | "ADMIN"
  createdAt?: string | null
}

interface CellActionsProps {
  data: CustomersColumn
  onEdit: (customer: CustomersColumn) => void
  onDelete: (customerId: string) => void
}

const CellActions: React.FC<CellActionsProps> = ({
  data,
  onEdit,
  onDelete,
}) => {
  const isInferred = typeof data.id === 'string' && data.id.startsWith('order:');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => !isInferred && onEdit(data)} disabled={isInferred}>
          <Edit className="mr-2 h-4 w-4" />
          {isInferred ? 'Cannot edit' : 'Edit'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => !isInferred && onDelete(data.id)} disabled={isInferred}>
          <Trash className="mr-2 h-4 w-4" />
          {isInferred ? 'Cannot delete' : 'Delete'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const columns: ColumnDef<CustomersColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => row.getValue("address") || "",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.getValue("phone") || "",
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => row.getValue("gender") || "",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const val = row.getValue("createdAt");
      if (!val) return "";
      // Ensure the value passed to Date is a string/number/date
      return format(new Date(String(val)), "MMMM d, yyyy");
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const customer = row.original
      const meta = table.options.meta as TableMeta;
      return (
        <CellActions
          data={customer}
          onEdit={meta.onEdit}
          onDelete={meta.onDelete}
        />
      )
    },
  }
]
