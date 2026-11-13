import type { Metadata } from "next";
import NewsroomClient from "../NewsroomClient";

export const metadata: Metadata = { title: "न्यूज़रूम लॉगिन" };

export default function NewsroomPage() {
  return <NewsroomClient />;
}
