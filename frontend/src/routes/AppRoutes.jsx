import DashboardPage from '../pages/dashboard/DashboardPage';
import MainCategoriesPage from '../pages/categories/MainCategoriesPage';
import CategoriesPage from '../pages/categories/CategoriesPage';
import SubCategoriesPage from '../pages/categories/SubCategoriesPage';
import ProductsPage from '../pages/products/ProductsPage';
import DesignsPage from '../pages/designs/DesignsPage';
import StitchingOrdersPage from '../pages/stitching-orders/StitchingOrdersPage';
import ReadymadeOrdersPage from '../pages/readymade-orders/ReadymadeOrdersPage';
import PaymentsPage from '../pages/payments/PaymentsPage';
import CustomersPage from '../pages/customers/CustomersPage';

const pages = {
  'main-categories': MainCategoriesPage,
  'categories': CategoriesPage,
  'sub-categories': SubCategoriesPage,
  'products': ProductsPage,
  'designs': DesignsPage,
  'stitching-orders': StitchingOrdersPage,
  'readymade-orders': ReadymadeOrdersPage,
  'payments': PaymentsPage,
  'customers': CustomersPage,
};

export default function AppRoutes({ page, onNavigate, notify }) {
  if (page === 'dashboard') return <DashboardPage onNavigate={onNavigate} />;
  const Page = pages[page];
  return Page ? <Page key={page} notify={notify} /> : null;
}
