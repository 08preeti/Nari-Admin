import CatalogManager from '../../components/common/CatalogManager';
import { catalogConfigs } from '../../utils/catalogConfig';

export default function MainCategoriesPage({ notify }) {
  return <CatalogManager type="main-categories" config={catalogConfigs['main-categories']} notify={notify} />;
}
