import CatalogManager from '../../components/common/CatalogManager';
import { catalogConfigs } from '../../utils/catalogConfig';

export default function ReadymadeCataloguePage({ notify }) {
  return <CatalogManager type="categories" moduleType="readymade" heading="Readymade catalogue" config={catalogConfigs['category-catalogue']} notify={notify} />;
}