"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { MoreHorizontal, Edit, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export type CustomersColumn = {
  id: string
  name: string
  email: string
  role: "CUSTOMER" | "ADMIN"
  createdAt: string
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
        <DropdownMenuItem onClick={() => onEdit(data)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(data.id)}>
          <Trash className="mr-2 h-4 w-4" />
          Delete
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
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as "CUSTOMER" | "ADMIN"
      return (
        <Badge variant={role === "ADMIN" ? "destructive" : "default"}>
          {role}
        </Badge>
      )
    }
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "MMMM d, yyyy"),
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const customer = row.original
      return (
        <CellActions
          data={customer}
            onEdit={(table.options.meta as any)?.onEdit}
            onDelete={(table.options.meta as any)?.onDelete}
        />
      )
    },
  }
]