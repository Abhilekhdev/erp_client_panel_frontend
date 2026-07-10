/** Business Settings — API + form types. Mirrors the NestJS business-settings module. */

export interface Option {
  value: string | number | boolean;
  label: string;
}

export interface BusinessSettingsOptions {
  currencies: Option[];
  taxRates: Option[];
  units: Option[];
  accountingMethods: Option[];
  dateFormats: Option[];
  timeFormats: Option[];
  currencySymbolPlacements: Option[];
  months: Option[];
  precisions: Option[];
  salesCommissionAgents: Option[];
  itemAdditionMethods: Option[];
  expiryTypes: Option[];
  onProductExpiry: Option[];
  sellPriceTax: Option[];
  amountRoundingMethods: Option[];
  commissionCalculationTypes: Option[];
  cashDenominationOn: Option[];
  rpExpiryTypes: Option[];
  themeColors: Option[];
  datatablePageEntries: Option[];
  availableModules: Option[];
  weighingScaleRanges: {
    productSkuLength: number[];
    qtyLength: number[];
    qtyLengthDecimal: number[];
  };
  posShortcutKeys: string[];
}

/** Loose bag for any jsonb-column settings sub-object. */
export type SettingsBag = Record<string, unknown>;

/** The `business` row as serialized by the API (Prisma → JSON; Decimals arrive as strings). */
export interface BusinessRow {
  id: number;
  name: string;
  startDate: string | null;
  defaultProfitPercent: string | number | null;
  currencyId: number;
  currencySymbolPlacement: string | null;
  timeZone: string | null;
  logo: string | null;
  loginLogo: string | null;
  fyStartMonth: number | null;
  accountingMethod: string | null;
  transactionEditDays: number | null;
  dateFormat: string | null;
  timeFormat: string | null;
  currencyPrecision: number | null;
  quantityPrecision: number | null;
  codeLabel1: string | null;
  code1: string | null;
  codeLabel2: string | null;
  code2: string | null;

  taxLabel1: string | null;
  taxNumber1: string | null;
  taxLabel2: string | null;
  taxNumber2: string | null;
  enableInlineTax: boolean | null;

  skuPrefix: string | null;
  enableProductExpiry: boolean | null;
  expiryType: string | null;
  onProductExpiry: string | null;
  stopSellingBefore: number | null;
  enableBrand: boolean | null;
  enableCategory: boolean | null;
  enableSubCategory: boolean | null;
  enablePriceTax: boolean | null;
  defaultUnit: number | null;
  enableSubUnits: boolean | null;
  enableRacks: boolean | null;
  enableRow: boolean | null;
  enablePosition: boolean | null;

  defaultSalesDiscount: string | number | null;
  defaultSalesTax: number | null;
  sellPriceTax: string | null;
  itemAdditionMethod: boolean | null;
  salesCmsnAgnt: string | null;

  purchaseInDiffCurrency: boolean | null;
  purchaseCurrencyId: number | null;
  pExchangeRate: string | number | null;
  enableEditingProductFromPurchase: boolean | null;
  enablePurchaseStatus: boolean | null;
  enableLotNumber: boolean | null;

  stockExpiryAlertDays: number | null;

  themeColor: string | null;
  enableTooltip: boolean | null;

  enableRp: boolean | null;
  rpName: string | null;
  amountForUnitRp: string | number | null;
  minOrderTotalForRp: string | number | null;
  maxRpPerOrder: number | null;
  redeemAmountPerUnitRp: string | number | null;
  minOrderTotalForRedeem: string | number | null;
  minRedeemPoint: number | null;
  maxRedeemPoint: number | null;
  rpExpiryPeriod: number | null;
  rpExpiryType: string | null;

  posSettings: SettingsBag | null;
  commonSettings: SettingsBag | null;
  refNoPrefixes: SettingsBag | null;
  customLabels: SettingsBag | null;
  emailSettings: SettingsBag | null;
  smsSettings: SettingsBag | null;
  weighingScaleSetting: SettingsBag | null;
  keyboardShortcuts: SettingsBag | null;
  enabledModules: string[] | null;
}

export interface BusinessSettingsResponse {
  business: BusinessRow;
  options: BusinessSettingsOptions;
}

/**
 * RHF form shape. Scalars/enums are strings (native inputs), toggles are booleans,
 * and each jsonb column is a nested bag addressed by dotted RHF paths (e.g. `posSettings.enable_msp`).
 */
export interface SettingsFormValues {
  name: string;
  startDate: string;
  defaultProfitPercent: string;
  currencyId: string;
  currencySymbolPlacement: string;
  timeZone: string;
  fyStartMonth: string;
  accountingMethod: string;
  transactionEditDays: string;
  dateFormat: string;
  timeFormat: string;
  currencyPrecision: string;
  quantityPrecision: string;
  codeLabel1: string;
  code1: string;
  codeLabel2: string;
  code2: string;

  taxLabel1: string;
  taxNumber1: string;
  taxLabel2: string;
  taxNumber2: string;
  enableInlineTax: boolean;

  skuPrefix: string;
  enableProductExpiry: boolean;
  expiryType: string;
  onProductExpiry: string;
  stopSellingBefore: string;
  enableBrand: boolean;
  enableCategory: boolean;
  enableSubCategory: boolean;
  enablePriceTax: boolean;
  defaultUnit: string;
  enableSubUnits: boolean;
  enableRacks: boolean;
  enableRow: boolean;
  enablePosition: boolean;

  defaultSalesDiscount: string;
  defaultSalesTax: string;
  sellPriceTax: string;
  itemAdditionMethod: string; // '0' | '1' → boolean on submit
  salesCmsnAgnt: string;

  purchaseInDiffCurrency: boolean;
  purchaseCurrencyId: string;
  pExchangeRate: string;
  enableEditingProductFromPurchase: boolean;
  enablePurchaseStatus: boolean;
  enableLotNumber: boolean;

  stockExpiryAlertDays: string;

  themeColor: string;
  enableTooltip: boolean;

  enableRp: boolean;
  rpName: string;
  amountForUnitRp: string;
  minOrderTotalForRp: string;
  maxRpPerOrder: string;
  redeemAmountPerUnitRp: string;
  minOrderTotalForRedeem: string;
  minRedeemPoint: string;
  maxRedeemPoint: string;
  rpExpiryPeriod: string;
  rpExpiryType: string;

  posSettings: SettingsBag;
  commonSettings: SettingsBag;
  refNoPrefixes: SettingsBag;
  customLabels: SettingsBag;
  emailSettings: SettingsBag;
  smsSettings: SettingsBag;
  weighingScaleSetting: SettingsBag;
  keyboardShortcuts: { pos: SettingsBag };
  enabledModules: string[];
}

/** Payload sent to PUT /business/settings (backend coerces string numbers/enums). */
export type UpdateBusinessSettingsPayload = Record<string, unknown>;
