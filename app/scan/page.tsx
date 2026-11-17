import type { Metadata } from "next";
import Scanner from "@/components/Scanner";

export const metadata: Metadata = { title: "New scan | AI SkinWise" };

export default function ScanPage() {
  return <Scanner />;
}
