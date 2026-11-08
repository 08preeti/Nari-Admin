import CatalogManager from '../../components/common/CatalogManager';
import { catalogConfigs } from '../../utils/catalogConfig';

export default function SubCategoriesPage({ notify }) {
  return <CatalogManager type="sub-categories" config={catalogConfigs['sub-categories']} notify={notify} />;
}
