"use client";

import { UserButton } from "@clerk/nextjs";

interface Props {
  afterSignOutUrl?: string;
}

export default function UserButtonClient({ afterSignOutUrl }: Props) {
  return <UserButton afterSignOutUrl={afterSignOutUrl} />;
}
