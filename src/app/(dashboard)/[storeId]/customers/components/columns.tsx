"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

// Button import removed - not used in columns

export type CustomersColumn = {
  id: string
  name: string
  email: string
  address?: string
  phone?: string
  gender?: string
  createdAt: string
}

export const columns: ColumnDef<CustomersColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "MMMM d, yyyy"),
  },
]