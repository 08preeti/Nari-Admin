import { LayoutDashboard, ShoppingBag, Scissors, Package, Palette, FolderTree, Layers, Wallet, Tags, Users } from 'lucide-react';

export const nav = [
  { label: 'Overview', items: [['Dashboard', 'dashboard', LayoutDashboard]] },
  { label: 'Catalogue', items: [['Main categories', 'main-categories', FolderTree], ['Categories', 'categories', Layers], ['Subcategories', 'sub-categories', Tags], ['Products', 'products', Package], ['Designs', 'designs', Palette]] },
  { label: 'Orders & payments', items: [['Stitching orders', 'stitching-orders', Scissors], ['Readymade orders', 'readymade-orders', ShoppingBag], ['Payments', 'payments', Wallet], ['Customers', 'customers', Users]] },
];
