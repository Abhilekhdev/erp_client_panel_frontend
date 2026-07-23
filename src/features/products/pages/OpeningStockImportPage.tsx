import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ImportWizard } from '../components/ImportWizard';
import { OPENING_STOCK_IMPORT } from '../import.api';

export function OpeningStockImportPage() {
  const navigate = useNavigate();
  return (
    <ImportWizard
      endpoints={OPENING_STOCK_IMPORT}
      queryKey="opening-stock-import-columns"
      title="Import Opening Stock"
      description="Set starting quantities for many products at once — each row adds a lot at a location."
      breadcrumbs={[{ label: 'Products' }, { label: 'Import Opening Stock' }]}
      noun="line"
      columnsTitle="File format — 6 columns, in this order"
      hint="Up to 5 MB. Use the template above."
      onDone={<Button size="sm" variant="outline" onClick={() => navigate('/products')}>View products</Button>}
    />
  );
}
