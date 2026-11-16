import {
  LayoutDashboard,
  ShoppingBag,
  Scissors,
  Package,
  Palette,
  FolderTree,
  Layers,
  Tags,
} from "lucide-react";

export const nav = [
  { label: "Overview", items: [["Dashboard", "dashboard", LayoutDashboard]] },
  {
    label: "Catalogue",
    items: [
      ["Main categories", "main-categories", FolderTree],
      ["Categories", "categories", Layers],
      ["Subcategories", "sub-categories", Tags],
      ["Readymade products", "products", Package],
      ["Stitching products", "designs", Palette],
    ],
  },
  {
    label: "Orders",
    items: [
      ["Readymade orders", "readymade-orders", ShoppingBag],
      ["Stitching orders", "stitching-orders", Scissors],
    ],
  },
];
