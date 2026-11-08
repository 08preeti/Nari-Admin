import CatalogManager from '../../components/common/CatalogManager';
import { catalogConfigs } from '../../utils/catalogConfig';

export default function CategoriesPage({ notify }) {
  return <CatalogManager type="categories" config={catalogConfigs['categories']} notify={notify} />;
}
