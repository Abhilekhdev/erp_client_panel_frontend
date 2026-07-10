import type {
  BusinessRow,
  SettingsBag,
  SettingsFormValues,
  UpdateBusinessSettingsPayload,
} from './business-settings.types';

const str = (v: unknown): string => (v == null ? '' : String(v));
const bag = (v: SettingsBag | null | undefined): SettingsBag => v ?? {};

/** BusinessRow (API) → RHF form values. Scalars become strings, toggles booleans, jsonb bags objects. */
export function buildDefaults(b: BusinessRow): SettingsFormValues {
  const ks = (b.keyboardShortcuts ?? {}) as { pos?: SettingsBag };
  return {
    name: str(b.name),
    startDate: b.startDate ? b.startDate.slice(0, 10) : '',
    defaultProfitPercent: str(b.defaultProfitPercent),
    currencyId: str(b.currencyId),
    currencySymbolPlacement: str(b.currencySymbolPlacement),
    timeZone: str(b.timeZone),
    fyStartMonth: str(b.fyStartMonth),
    accountingMethod: str(b.accountingMethod),
    transactionEditDays: str(b.transactionEditDays),
    dateFormat: str(b.dateFormat),
    timeFormat: str(b.timeFormat),
    currencyPrecision: str(b.currencyPrecision),
    quantityPrecision: str(b.quantityPrecision),
    codeLabel1: str(b.codeLabel1),
    code1: str(b.code1),
    codeLabel2: str(b.codeLabel2),
    code2: str(b.code2),

    taxLabel1: str(b.taxLabel1),
    taxNumber1: str(b.taxNumber1),
    taxLabel2: str(b.taxLabel2),
    taxNumber2: str(b.taxNumber2),
    enableInlineTax: Boolean(b.enableInlineTax),

    skuPrefix: str(b.skuPrefix),
    enableProductExpiry: Boolean(b.enableProductExpiry),
    expiryType: str(b.expiryType),
    onProductExpiry: str(b.onProductExpiry),
    stopSellingBefore: str(b.stopSellingBefore),
    enableBrand: Boolean(b.enableBrand),
    enableCategory: Boolean(b.enableCategory),
    enableSubCategory: Boolean(b.enableSubCategory),
    enablePriceTax: Boolean(b.enablePriceTax),
    defaultUnit: str(b.defaultUnit),
    enableSubUnits: Boolean(b.enableSubUnits),
    enableRacks: Boolean(b.enableRacks),
    enableRow: Boolean(b.enableRow),
    enablePosition: Boolean(b.enablePosition),

    defaultSalesDiscount: str(b.defaultSalesDiscount),
    defaultSalesTax: str(b.defaultSalesTax),
    sellPriceTax: str(b.sellPriceTax),
    itemAdditionMethod: b.itemAdditionMethod ? '1' : '0',
    salesCmsnAgnt: str(b.salesCmsnAgnt),

    purchaseInDiffCurrency: Boolean(b.purchaseInDiffCurrency),
    purchaseCurrencyId: str(b.purchaseCurrencyId),
    pExchangeRate: str(b.pExchangeRate),
    enableEditingProductFromPurchase: Boolean(b.enableEditingProductFromPurchase),
    enablePurchaseStatus: Boolean(b.enablePurchaseStatus),
    enableLotNumber: Boolean(b.enableLotNumber),

    stockExpiryAlertDays: str(b.stockExpiryAlertDays),

    themeColor: str(b.themeColor),
    enableTooltip: Boolean(b.enableTooltip),

    enableRp: Boolean(b.enableRp),
    rpName: str(b.rpName),
    amountForUnitRp: str(b.amountForUnitRp),
    minOrderTotalForRp: str(b.minOrderTotalForRp),
    maxRpPerOrder: str(b.maxRpPerOrder),
    redeemAmountPerUnitRp: str(b.redeemAmountPerUnitRp),
    minOrderTotalForRedeem: str(b.minOrderTotalForRedeem),
    minRedeemPoint: str(b.minRedeemPoint),
    maxRedeemPoint: str(b.maxRedeemPoint),
    rpExpiryPeriod: str(b.rpExpiryPeriod),
    rpExpiryType: str(b.rpExpiryType),

    posSettings: bag(b.posSettings),
    commonSettings: bag(b.commonSettings),
    refNoPrefixes: bag(b.refNoPrefixes),
    customLabels: bag(b.customLabels),
    emailSettings: bag(b.emailSettings),
    smsSettings: bag(b.smsSettings),
    weighingScaleSetting: bag(b.weighingScaleSetting),
    keyboardShortcuts: { pos: bag(ks.pos) },
    enabledModules: b.enabledModules ?? [],
  };
}

// number-or-null (empty string → null so nullable columns clear instead of becoming 0)
const numOrNull = (v: string): number | null => (v === '' ? null : Number(v));
// enum-or-undefined (never send '' to a Prisma enum)
const enumOrUndef = (v: string): string | undefined => (v === '' ? undefined : v);

/** RHF form values → PUT /business/settings payload. */
export function toPayload(v: SettingsFormValues): UpdateBusinessSettingsPayload {
  return {
    name: v.name.trim(),
    startDate: v.startDate === '' ? null : v.startDate,
    defaultProfitPercent: numOrNull(v.defaultProfitPercent) ?? 0,
    currencyId: Number(v.currencyId),
    currencySymbolPlacement: enumOrUndef(v.currencySymbolPlacement),
    timeZone: v.timeZone,
    fyStartMonth: numOrNull(v.fyStartMonth) ?? undefined,
    accountingMethod: enumOrUndef(v.accountingMethod),
    transactionEditDays: Number(v.transactionEditDays || 0),
    dateFormat: v.dateFormat,
    timeFormat: enumOrUndef(v.timeFormat),
    currencyPrecision: numOrNull(v.currencyPrecision) ?? undefined,
    quantityPrecision: numOrNull(v.quantityPrecision) ?? undefined,
    codeLabel1: v.codeLabel1,
    code1: v.code1,
    codeLabel2: v.codeLabel2,
    code2: v.code2,

    taxLabel1: v.taxLabel1,
    taxNumber1: v.taxNumber1,
    taxLabel2: v.taxLabel2,
    taxNumber2: v.taxNumber2,
    enableInlineTax: v.enableInlineTax,

    skuPrefix: v.skuPrefix,
    enableProductExpiry: v.enableProductExpiry,
    expiryType: enumOrUndef(v.expiryType),
    onProductExpiry: enumOrUndef(v.onProductExpiry),
    stopSellingBefore: numOrNull(v.stopSellingBefore),
    enableBrand: v.enableBrand,
    enableCategory: v.enableCategory,
    enableSubCategory: v.enableSubCategory,
    enablePriceTax: v.enablePriceTax,
    defaultUnit: numOrNull(v.defaultUnit),
    enableSubUnits: v.enableSubUnits,
    enableRacks: v.enableRacks,
    enableRow: v.enableRow,
    enablePosition: v.enablePosition,

    defaultSalesDiscount: numOrNull(v.defaultSalesDiscount),
    defaultSalesTax: numOrNull(v.defaultSalesTax),
    sellPriceTax: enumOrUndef(v.sellPriceTax),
    itemAdditionMethod: v.itemAdditionMethod === '1',
    salesCmsnAgnt: v.salesCmsnAgnt === '' ? null : v.salesCmsnAgnt,

    purchaseInDiffCurrency: v.purchaseInDiffCurrency,
    purchaseCurrencyId: v.purchaseInDiffCurrency ? numOrNull(v.purchaseCurrencyId) : null,
    pExchangeRate: numOrNull(v.pExchangeRate) ?? undefined,
    enableEditingProductFromPurchase: v.enableEditingProductFromPurchase,
    enablePurchaseStatus: v.enablePurchaseStatus,
    enableLotNumber: v.enableLotNumber,

    stockExpiryAlertDays: Number(v.stockExpiryAlertDays || 0),

    themeColor: v.themeColor,
    enableTooltip: v.enableTooltip,

    enableRp: v.enableRp,
    rpName: v.rpName,
    amountForUnitRp: numOrNull(v.amountForUnitRp) ?? undefined,
    minOrderTotalForRp: numOrNull(v.minOrderTotalForRp) ?? undefined,
    maxRpPerOrder: numOrNull(v.maxRpPerOrder),
    redeemAmountPerUnitRp: numOrNull(v.redeemAmountPerUnitRp) ?? undefined,
    minOrderTotalForRedeem: numOrNull(v.minOrderTotalForRedeem) ?? undefined,
    minRedeemPoint: numOrNull(v.minRedeemPoint),
    maxRedeemPoint: numOrNull(v.maxRedeemPoint),
    rpExpiryPeriod: numOrNull(v.rpExpiryPeriod),
    rpExpiryType: enumOrUndef(v.rpExpiryType),

    posSettings: v.posSettings,
    commonSettings: v.commonSettings,
    refNoPrefixes: v.refNoPrefixes,
    customLabels: v.customLabels,
    emailSettings: v.emailSettings,
    smsSettings: v.smsSettings,
    weighingScaleSetting: v.weighingScaleSetting,
    keyboardShortcuts: v.keyboardShortcuts,
    enabledModules: v.enabledModules,
  };
}
