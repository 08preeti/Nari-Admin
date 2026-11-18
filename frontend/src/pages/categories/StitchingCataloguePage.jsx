import CatalogManager from "../../components/common/CatalogManager";
import { catalogConfigs } from "../../utils/catalogConfig";

export default function StitchingCataloguePage({ notify }) {
  return (
    <CatalogManager
      type="categories"
      moduleType="stitching"
      heading="Stitching catalogue"
      config={catalogConfigs["category-catalogue"]}
      notify={notify}
    />
  );
}
