"use client";

import { useParams } from "next/navigation";
import { redirect } from "next/navigation";

export default function MatterPage() {
  const { id } = useParams<{ id: string }>();
  redirect(`/matters/${id}/overview`);
}
