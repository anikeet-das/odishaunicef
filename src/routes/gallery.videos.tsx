import { createFileRoute } from "@tanstack/react-router";
import { GalleryPage } from "@/components/gallery/GalleryPage";

export const Route = createFileRoute("/gallery/videos")({
  head: () => ({
    meta: [
      { title: "Video Gallery · CR-SAP Odisha" },
      { name: "description", content: "Real video evidence submitted by schools through the CR-SAP Google Form." },
    ],
  }),
  component: () => <GalleryPage kind="video" />,
});
