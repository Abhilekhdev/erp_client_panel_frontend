import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ImportWizard } from '../components/ImportWizard';
import { PRODUCT_IMPORT } from '../import.api';

export function ProductImportPage() {
  const navigate = useNavigate();
  return (
    <ImportWizard
      endpoints={PRODUCT_IMPORT}
      queryKey="product-import-columns"
      title="Import Products"
      description="Bulk-create products from a spreadsheet — single or variable, with opening stock."
      breadcrumbs={[{ label: 'Products' }, { label: 'Import Products' }]}
      noun="product"
      columnsTitle="File format — 37 columns, in this order"
      hint="Up to 5 MB / 5,000 rows. Use the template above."
      onDone={<Button size="sm" variant="outline" onClick={() => navigate('/products')}>View products</Button>}
    />
  );
}
