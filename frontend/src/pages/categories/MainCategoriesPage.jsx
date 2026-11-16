import CatalogManager from "../../components/common/CatalogManager";
import { catalogConfigs } from "../../utils/catalogConfig";

// Two catalogues, one under the other: Readymade first, then Stitching.
// CatalogManager adds the section's module type to every new record.
export default function MainCategoriesPage({ notify }) {
  const config = catalogConfigs["main-categories"];
  return (
    <>
      <CatalogManager
        type="main-categories"
        moduleType="readymade"
        heading="Readymade catalogue"
        config={config}
        notify={notify}
      />
      <div style={{ marginTop: 48 }}>
        <CatalogManager
          type="main-categories"
          moduleType="stitching"
          heading="Stitching catalogue"
          config={config}
          notify={notify}
        />
      </div>
    </>
  );
}
