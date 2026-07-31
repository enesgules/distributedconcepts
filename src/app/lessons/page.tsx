import type { Metadata } from "next";
import { DistributedConceptsApp } from "@/app/page";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "Interactive distributed systems lessons",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/lessons" },
  openGraph: {
    title: "Interactive distributed systems lessons",
    description: SITE_DESCRIPTION,
    url: "/lessons",
  },
};

export default function LessonsPage() {
  return <DistributedConceptsApp initialView="curriculum" />;
}
