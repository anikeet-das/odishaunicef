import { createFileRoute } from "@tanstack/react-router";
import { GalleryPage } from "@/components/gallery/GalleryPage";

export const Route = createFileRoute("/gallery/photos")({
  head: () => ({
    meta: [
      { title: "Photo Gallery · CR-SAP Odisha" },
      { name: "description", content: "Real photo evidence submitted by schools through the CR-SAP Google Form." },
    ],
  }),
  component: () => <GalleryPage kind="photo" />,
});
