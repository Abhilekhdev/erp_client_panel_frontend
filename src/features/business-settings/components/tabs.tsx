import { useFormContext } from 'react-hook-form';
import type { BusinessRow, BusinessSettingsOptions } from '../business-settings.types';
import { CheckboxField, SelectField, SettingsCard, TextField, truthy } from './fields';
import { LogoUploadField } from './LogoUploadField';

export interface TabProps {
  options: BusinessSettingsOptions;
  business: BusinessRow;
}

// ---- helpers ----
const range = (n: number, from = 1) => Array.from({ length: n }, (_, i) => i + from);
const humanize = (k: string) =>
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const numOptions = (nums: number[]) => nums.map((n) => ({ value: n, label: String(n) }));

// Timezone list from the platform Intl DB (falls back to a small set if unavailable).
const TIMEZONES: { value: string; label: string }[] = (() => {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  const list = anyIntl.supportedValuesOf?.('timeZone') ?? ['Asia/Kolkata', 'UTC', 'America/New_York'];
  return list.map((tz) => ({ value: tz, label: tz }));
})();

// ============================ 1. Business ============================
function BusinessTab({ options, business }: TabProps) {
  return (
    <SettingsCard>
      <TextField name="name" label="Business Name" required placeholder="e.g. OlympasLLC" />
      <TextField name="startDate" label="Start Date" type="date" />
      <TextField name="defaultProfitPercent" label="Default profit percent" type="number" step="0.01" />
      <SelectField name="currencyId" label="Currency" required options={options.currencies} placeholder="Select currency" />
      <SelectField name="currencySymbolPlacement" label="Currency Symbol Placement" options={options.currencySymbolPlacements} />
      <SelectField name="timeZone" label="Time zone" options={TIMEZONES} />
      <div className="sm:col-span-2">
        <LogoUploadField type="logo" label="Upload Logo" currentPath={business.logo} help="Previous logo (if exists) will be replaced" />
      </div>
      <SelectField name="fyStartMonth" label="Financial year start month" options={options.months} />
      <SelectField name="accountingMethod" label="Stock Accounting Method" required options={options.accountingMethods} />
      <TextField name="transactionEditDays" label="Transaction Edit Days" required type="number" />
      <SelectField name="dateFormat" label="Date Format" required options={options.dateFormats} />
      <SelectField name="timeFormat" label="Time Format" required options={options.timeFormats} />
      <SelectField name="currencyPrecision" label="Currency precision" options={options.precisions} />
      <SelectField name="quantityPrecision" label="Quantity precision" options={options.precisions} />
      <div className="sm:col-span-2">
        <LogoUploadField type="login_logo" label="Upload Login Logo" currentPath={business.loginLogo} />
      </div>
      <TextField name="codeLabel1" label="Code Label 1" />
      <TextField name="code1" label="Code 1" />
      <TextField name="codeLabel2" label="Code Label 2" />
      <TextField name="code2" label="Code 2" />
      <CheckboxField name="commonSettings.is_enabled_export" label="Enable export" />
    </SettingsCard>
  );
}

// ============================ 2. Tax ============================
function TaxTab() {
  return (
    <SettingsCard>
      <TextField name="taxLabel1" label="Tax 1 Name" placeholder="e.g. GST" />
      <TextField name="taxNumber1" label="Tax 1 No." />
      <TextField name="taxLabel2" label="Tax 2 Name" />
      <TextField name="taxNumber2" label="Tax 2 No." />
      <CheckboxField name="enableInlineTax" label="Enable inline tax in purchase and sell" />
    </SettingsCard>
  );
}

// ============================ 3. Product ============================
function ProductTab({ options }: TabProps) {
  const { watch } = useFormContext();
  return (
    <SettingsCard>
      <TextField name="skuPrefix" label="SKU prefix" />
      <div className="hidden sm:block" />
      <CheckboxField name="enableProductExpiry" label="Enable product expiry" />
      {truthy(watch('enableProductExpiry')) && (
        <>
          <SelectField name="expiryType" label="Expiry Type" options={options.expiryTypes} />
          <SelectField name="onProductExpiry" label="On product expiry" options={options.onProductExpiry} />
          <TextField name="stopSellingBefore" label="Stop selling n days before" type="number" />
        </>
      )}
      <CheckboxField name="enableBrand" label="Enable Brands" />
      <CheckboxField name="enableCategory" label="Enable Categories" />
      <CheckboxField name="enableSubCategory" label="Enable Sub-Categories" />
      <CheckboxField name="enablePriceTax" label="Enable Price & Tax info" />
      <SelectField name="defaultUnit" label="Default Unit" options={options.units} placeholder="Please Select" />
      <div className="hidden sm:block" />
      <CheckboxField name="enableSubUnits" label="Enable Sub Units" />
      <CheckboxField name="enableRacks" label="Enable Racks" />
      <CheckboxField name="enableRow" label="Enable Row" />
      <CheckboxField name="enablePosition" label="Enable Position" />
      <CheckboxField name="commonSettings.enable_product_warranty" label="Enable Warranty" />
      <CheckboxField name="commonSettings.enable_secondary_unit" label="Enable secondary unit" />
      <CheckboxField name="commonSettings.is_product_image_required" label="Product image required" />
    </SettingsCard>
  );
}

// ============================ 4. Contact ============================
function ContactTab() {
  return (
    <SettingsCard>
      <TextField name="commonSettings.default_credit_limit" label="Default credit limit" type="number" />
    </SettingsCard>
  );
}

// ============================ 5. Sale ============================
function SaleTab({ options }: TabProps) {
  return (
    <>
      <SettingsCard title="Sales">
        <TextField name="defaultSalesDiscount" label="Default Sale Discount (%)" type="number" step="0.01" />
        <SelectField name="defaultSalesTax" label="Default Sale Tax" options={options.taxRates} placeholder="None" />
        <SelectField name="itemAdditionMethod" label="Sales item addition method" options={options.itemAdditionMethods} />
        <SelectField name="sellPriceTax" label="Sell Price Tax" options={options.sellPriceTax} />
        <SelectField name="posSettings.amount_rounding_method" label="Amount rounding method" options={options.amountRoundingMethods} />
        <CheckboxField name="posSettings.enable_msp" label="Sale price is minimum sale price" />
        <CheckboxField name="posSettings.allow_overselling" label="Allow overselling" />
        <CheckboxField name="posSettings.enable_sales_order" label="Enable Sales Order" />
        <CheckboxField name="posSettings.is_pay_term_required" label="Pay term required" />
      </SettingsCard>
      <SettingsCard title="Commission Agent">
        <SelectField name="salesCmsnAgnt" label="Sales Commission Agent" options={options.salesCommissionAgents} />
        <SelectField name="posSettings.cmmsn_calculation_type" label="Commission calculation type" options={options.commissionCalculationTypes} />
        <CheckboxField name="posSettings.is_commission_agent_required" label="Commission agent required" />
      </SettingsCard>
      <SettingsCard title="Payment Link">
        <CheckboxField name="posSettings.enable_payment_link" label="Enable payment link" />
        <TextField name="posSettings.razor_pay_key_id" label="Razorpay Key ID" />
        <TextField name="posSettings.razor_pay_key_secret" label="Razorpay Key Secret" />
        <TextField name="posSettings.stripe_public_key" label="Stripe public key" />
        <TextField name="posSettings.stripe_secret_key" label="Stripe secret key" />
      </SettingsCard>
    </>
  );
}

// ============================ 6. POS ============================
const POS_TOGGLES: [string, string][] = [
  ['disable_pay_checkout', 'Disable Pay & Checkout'],
  ['disable_draft', 'Disable Draft'],
  ['disable_express_checkout', 'Disable Express Checkout'],
  ['hide_product_suggestion', 'Hide product suggestion'],
  ['hide_recent_trans', 'Hide recent transactions'],
  ['disable_discount', 'Disable Discount'],
  ['disable_order_tax', 'Disable Order Tax'],
  ['is_pos_subtotal_editable', 'Subtotal editable'],
  ['disable_suspend', 'Disable Suspend'],
  ['enable_transaction_date', 'Enable transaction date'],
  ['inline_service_staff', 'Inline service staff'],
  ['is_service_staff_required', 'Service staff required'],
  ['disable_credit_sale_button', 'Disable credit sale button'],
  ['enable_weighing_scale', 'Enable weighing scale'],
  ['show_invoice_scheme', 'Show invoice scheme'],
  ['show_invoice_layout', 'Show invoice layout'],
  ['print_on_suspend', 'Print on suspend'],
  ['show_pricing_on_product_sugesstion', 'Show pricing on product suggestion'],
];

function PosTab({ options }: TabProps) {
  return (
    <>
      <SettingsCard title="Keyboard Shortcuts" description="Set a keyboard key for each POS action.">
        {options.posShortcutKeys.map((key) => (
          <TextField key={key} name={`keyboardShortcuts.pos.${key}`} label={humanize(key)} placeholder="e.g. shift+e" />
        ))}
      </SettingsCard>
      <SettingsCard title="POS Settings">
        {POS_TOGGLES.map(([key, label]) => (
          <CheckboxField key={key} name={`posSettings.${key}`} label={label} />
        ))}
      </SettingsCard>
      <SettingsCard title="Weighing Scale Barcode">
        <TextField name="weighingScaleSetting.label_prefix" label="Barcode prefix" />
        <SelectField name="weighingScaleSetting.product_sku_length" label="Product SKU length" options={numOptions(options.weighingScaleRanges.productSkuLength)} />
        <SelectField name="weighingScaleSetting.qty_length" label="Qty integer length" options={numOptions(options.weighingScaleRanges.qtyLength)} />
        <SelectField name="weighingScaleSetting.qty_length_decimal" label="Qty fractional length" options={numOptions(options.weighingScaleRanges.qtyLengthDecimal)} />
      </SettingsCard>
    </>
  );
}

// ============================ 7. Purchases ============================
function PurchasesTab({ options }: TabProps) {
  const { watch } = useFormContext();
  return (
    <SettingsCard>
      <CheckboxField name="purchaseInDiffCurrency" label="Enable purchase in other currency" />
      {truthy(watch('purchaseInDiffCurrency')) && (
        <>
          <SelectField name="purchaseCurrencyId" label="Purchase currency" options={options.currencies} placeholder="Select currency" />
          <TextField name="pExchangeRate" label="Purchase currency exchange rate" type="number" step="0.001" />
        </>
      )}
      <CheckboxField name="enableEditingProductFromPurchase" label="Update product price from purchase screen" />
      <CheckboxField name="enablePurchaseStatus" label="Enable purchase status" />
      <CheckboxField name="enableLotNumber" label="Enable lot number" />
      <CheckboxField name="commonSettings.enable_purchase_order" label="Enable Purchase Order" />
      <CheckboxField name="commonSettings.enable_purchase_requisition" label="Enable Purchase Requisition" />
    </SettingsCard>
  );
}

// ============================ 8. Payment ============================
function PaymentTab({ options }: TabProps) {
  return (
    <SettingsCard title="Cash Denominations">
      <TextField name="posSettings.cash_denominations" label="Cash Denominations" help="Comma separated, e.g. 1,2,5,10,20,50,100" className="sm:col-span-2" />
      <SelectField name="posSettings.enable_cash_denomination_on" label="Enable cash denomination on" options={options.cashDenominationOn} />
      <CheckboxField name="posSettings.cash_denomination_strict_check" label="Strict check" />
    </SettingsCard>
  );
}

// ============================ 9. Dashboard ============================
function DashboardTab() {
  return (
    <SettingsCard>
      <TextField name="stockExpiryAlertDays" label="View stock expiry alert for (days)" required type="number" />
    </SettingsCard>
  );
}

// ============================ 10. System ============================
function SystemTab({ options }: TabProps) {
  return (
    <SettingsCard>
      <SelectField name="themeColor" label="Theme color" options={options.themeColors} />
      <SelectField name="commonSettings.default_datatable_page_entries" label="Default datatable page entries" options={options.datatablePageEntries} />
      <CheckboxField name="enableTooltip" label="Show help text / tooltips" />
    </SettingsCard>
  );
}

// ============================ 11. Prefixes ============================
const PREFIX_KEYS: [string, string][] = [
  ['purchase', 'Purchase'],
  ['purchase_return', 'Purchase Return'],
  ['purchase_requisition', 'Purchase Requisition'],
  ['purchase_order', 'Purchase Order'],
  ['stock_transfer', 'Stock Transfer'],
  ['stock_adjustment', 'Stock Adjustment'],
  ['sell_return', 'Sell Return'],
  ['expense', 'Expense'],
  ['contacts', 'Contacts'],
  ['purchase_payment', 'Purchase Payment'],
  ['sell_payment', 'Sell Payment'],
  ['expense_payment', 'Expense Payment'],
  ['business_location', 'Business Location'],
  ['username', 'Username'],
  ['subscription', 'Subscription'],
  ['draft', 'Draft'],
  ['sales_order', 'Sales Order'],
];

function PrefixesTab() {
  return (
    <SettingsCard title="Prefixes" description="Reference number prefixes for each transaction type.">
      {PREFIX_KEYS.map(([key, label]) => (
        <TextField key={key} name={`refNoPrefixes.${key}`} label={label} />
      ))}
    </SettingsCard>
  );
}

// ============================ 12. Email ============================
function EmailTab() {
  return (
    <SettingsCard title="Email Settings">
      <CheckboxField name="emailSettings.use_superadmin_settings" label="Use superadmin email settings" />
      <TextField name="emailSettings.mail_driver" label="Mail driver" placeholder="smtp" />
      <TextField name="emailSettings.mail_host" label="Host" />
      <TextField name="emailSettings.mail_port" label="Port" />
      <TextField name="emailSettings.mail_username" label="Username" />
      <TextField name="emailSettings.mail_password" label="Password" type="password" />
      <TextField name="emailSettings.mail_encryption" label="Encryption" placeholder="tls" />
      <TextField name="emailSettings.mail_from_address" label="From address" type="email" />
      <TextField name="emailSettings.mail_from_name" label="From name" />
    </SettingsCard>
  );
}

// ============================ 13. SMS ============================
function SmsTab() {
  return (
    <>
      <SettingsCard title="SMS Settings">
        <TextField name="smsSettings.sms_service" label="SMS Service" placeholder="nexmo / twilio / other" />
      </SettingsCard>
      <SettingsCard title="Nexmo">
        <TextField name="smsSettings.nexmo_key" label="Nexmo Key" />
        <TextField name="smsSettings.nexmo_secret" label="Nexmo Secret" />
        <TextField name="smsSettings.nexmo_from" label="Nexmo From" />
      </SettingsCard>
      <SettingsCard title="Twilio">
        <TextField name="smsSettings.twilio_sid" label="Twilio SID" />
        <TextField name="smsSettings.twilio_token" label="Twilio Token" />
        <TextField name="smsSettings.twilio_from" label="Twilio From" />
      </SettingsCard>
      <SettingsCard title="Other Gateway">
        <TextField name="smsSettings.url" label="URL" className="sm:col-span-2" />
        <TextField name="smsSettings.send_to_param_name" label="Send to param name" />
        <TextField name="smsSettings.msg_param_name" label="Message param name" />
        <TextField name="smsSettings.request_method" label="Request method" placeholder="get / post" />
        {range(3).map((i) => (
          <TextField key={`h${i}`} name={`smsSettings.header_${i}`} label={`Header ${i}`} />
        ))}
        {range(3).map((i) => (
          <TextField key={`hv${i}`} name={`smsSettings.header_val_${i}`} label={`Header ${i} value`} />
        ))}
        {range(10).map((i) => (
          <TextField key={`p${i}`} name={`smsSettings.param_${i}`} label={`Param ${i}`} />
        ))}
        {range(10).map((i) => (
          <TextField key={`pv${i}`} name={`smsSettings.param_val_${i}`} label={`Param ${i} value`} />
        ))}
      </SettingsCard>
    </>
  );
}

// ============================ 14. Reward Point ============================
function RewardPointTab({ options }: TabProps) {
  const { watch } = useFormContext();
  return (
    <SettingsCard>
      <CheckboxField name="enableRp" label="Enable Reward Point" />
      {truthy(watch('enableRp')) && (
        <>
          <TextField name="rpName" label="Reward point display name" />
          <TextField name="amountForUnitRp" label="Amount spent for unit point" type="number" step="0.01" />
          <TextField name="minOrderTotalForRp" label="Min order total to earn" type="number" step="0.01" />
          <TextField name="maxRpPerOrder" label="Max points per order" type="number" />
          <TextField name="redeemAmountPerUnitRp" label="Redeem amount per point" type="number" step="0.01" />
          <TextField name="minOrderTotalForRedeem" label="Min order total for redeem" type="number" step="0.01" />
          <TextField name="minRedeemPoint" label="Min redeem point" type="number" />
          <TextField name="maxRedeemPoint" label="Max redeem point" type="number" />
          <TextField name="rpExpiryPeriod" label="Reward point expiry period" type="number" />
          <SelectField name="rpExpiryType" label="Expiry type" options={options.rpExpiryTypes} />
        </>
      )}
    </SettingsCard>
  );
}

// ============================ 15. Modules ============================
function ModulesTab({ options }: TabProps) {
  const { watch, setValue } = useFormContext();
  const enabled = (watch('enabledModules') as string[]) ?? [];
  const toggle = (key: string, on: boolean) => {
    const next = on ? [...new Set([...enabled, key])] : enabled.filter((m) => m !== key);
    setValue('enabledModules', next, { shouldDirty: true });
  };
  return (
    <SettingsCard title="Modules" description="Enable or disable modules for this business.">
      {options.availableModules.map((m) => {
        const key = String(m.value);
        return (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 py-1">
            <input
              type="checkbox"
              checked={enabled.includes(key)}
              onChange={(e) => toggle(key, e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm font-medium">{m.label}</span>
          </label>
        );
      })}
    </SettingsCard>
  );
}

// ============================ 16. Custom Labels ============================
function LabelGroup({ group, count, prefix = 'custom_field' }: { group: string; count: number; prefix?: string }) {
  return (
    <>
      {range(count).map((i) => (
        <TextField
          key={i}
          name={`customLabels.${group}.${prefix}_${i}`}
          label={`${prefix === 'custom_pay' ? 'Custom Payment' : 'Custom Field'} ${i}`}
        />
      ))}
    </>
  );
}

function CustomLabelsTab() {
  return (
    <>
      <SettingsCard title="Payments"><LabelGroup group="payments" count={7} prefix="custom_pay" /></SettingsCard>
      <SettingsCard title="Contact"><LabelGroup group="contact" count={10} /></SettingsCard>
      <SettingsCard title="Product"><LabelGroup group="product" count={4} /></SettingsCard>
      <SettingsCard title="Location"><LabelGroup group="location" count={4} /></SettingsCard>
      <SettingsCard title="User"><LabelGroup group="user" count={4} /></SettingsCard>
      <SettingsCard title="Purchase">
        {range(4).map((i) => (
          <div key={i} className="space-y-1.5">
            <TextField name={`customLabels.purchase.custom_field_${i}`} label={`Custom Field ${i}`} />
            <CheckboxField name={`customLabels.purchase.is_custom_field_${i}_required`} label="Required" />
          </div>
        ))}
      </SettingsCard>
      <SettingsCard title="Purchase Shipping">
        {range(5).map((i) => (
          <div key={i} className="space-y-1.5">
            <TextField name={`customLabels.purchase_shipping.custom_field_${i}`} label={`Custom Field ${i}`} />
            <CheckboxField name={`customLabels.purchase_shipping.is_custom_field_${i}_required`} label="Required" />
          </div>
        ))}
      </SettingsCard>
      <SettingsCard title="Sell">
        {range(4).map((i) => (
          <div key={i} className="space-y-1.5">
            <TextField name={`customLabels.sell.custom_field_${i}`} label={`Custom Field ${i}`} />
            <CheckboxField name={`customLabels.sell.is_custom_field_${i}_required`} label="Required" />
          </div>
        ))}
      </SettingsCard>
      <SettingsCard title="Sale Shipping">
        {range(5).map((i) => (
          <div key={i} className="space-y-1.5">
            <TextField name={`customLabels.shipping.custom_field_${i}`} label={`Custom Field ${i}`} />
            <CheckboxField name={`customLabels.shipping.is_custom_field_${i}_required`} label="Required" />
            <CheckboxField name={`customLabels.shipping.is_custom_field_${i}_contact_default`} label="Contact default" />
          </div>
        ))}
      </SettingsCard>
      <SettingsCard title="Types of Service"><LabelGroup group="types_of_service" count={6} /></SettingsCard>
    </>
  );
}

// ============================ registry ============================
export interface TabDef {
  key: string;
  label: string;
  Component: (props: TabProps) => JSX.Element;
}

export const SETTINGS_TABS: TabDef[] = [
  { key: 'business', label: 'Business', Component: BusinessTab },
  { key: 'tax', label: 'Tax', Component: TaxTab },
  { key: 'product', label: 'Product', Component: ProductTab },
  { key: 'contact', label: 'Contact', Component: ContactTab },
  { key: 'sale', label: 'Sale', Component: SaleTab },
  { key: 'pos', label: 'POS', Component: PosTab },
  { key: 'purchases', label: 'Purchases', Component: PurchasesTab },
  { key: 'payment', label: 'Payment', Component: PaymentTab },
  { key: 'dashboard', label: 'Dashboard', Component: DashboardTab },
  { key: 'system', label: 'System', Component: SystemTab },
  { key: 'prefixes', label: 'Prefixes', Component: PrefixesTab },
  { key: 'email', label: 'Email', Component: EmailTab },
  { key: 'sms', label: 'SMS', Component: SmsTab },
  { key: 'reward', label: 'Reward Point', Component: RewardPointTab },
  { key: 'modules', label: 'Modules', Component: ModulesTab },
  { key: 'labels', label: 'Custom Labels', Component: CustomLabelsTab },
];
