/**
 * Configuration for master attribute data types.
 * To add a new data type: add an entry here and update the dialog UI for any unique fields.
 */

export interface DataTypeConfig {
  label: string;
  value: string;
  /** Which unit-of-measure options to show (key into UNIT_OPTIONS) */
  unitGroup: string | null;
  /** Which validation types are available */
  validationTypes: { label: string; value: string }[];
  /** Whether to show the min/max date toggle */
  showMinMaxDate?: boolean;
}

export const DATA_TYPES: DataTypeConfig[] = [
  {
    label: 'Decimal',
    value: 'decimal',
    unitGroup: 'measurement',
    validationTypes: [
      { label: 'Single Value', value: 'single_value' },
      { label: 'Range', value: 'range' },
    ],
  },
  {
    label: 'Date',
    value: 'date',
    unitGroup: 'date_format',
    validationTypes: [
      { label: 'Single Value', value: 'single_value' },
      { label: 'Multiple Values', value: 'multiple_values' },
    ],
    showMinMaxDate: true,
  },
  {
    label: 'Alphanumeric',
    value: 'alphanumeric',
    unitGroup: null, // no unit of measure
    validationTypes: [
      { label: 'Single Value', value: 'single_value' },
      { label: 'Multiple Values', value: 'multiple_values' },
    ],
  },
  {
    label: 'Julian Date',
    value: 'julian_date',
    unitGroup: 'julian_format',
    validationTypes: [
      { label: 'Single Value', value: 'single_value' },
    ],
  },
];

/** Unit of measure options grouped by data type */
export const UNIT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  measurement: [
    { label: 'Meters', value: 'meters' },
    { label: 'Centimeters', value: 'centimeters' },
    { label: 'Millimeters', value: 'millimeters' },
    { label: 'Kilograms', value: 'kilograms' },
    { label: 'Grams', value: 'grams' },
    { label: 'Count', value: 'count' },
    { label: 'Litres', value: 'litres' },
    { label: 'Millilitres', value: 'millilitres' },
    { label: '°C', value: 'celsius' },
    { label: '°F', value: 'fahrenheit' },
    { label: '%', value: 'percent' },
    { label: 'ppm', value: 'ppm' },
  ],
  date_format: [
    { label: 'MM/dd/yyyy', value: 'MM/dd/yyyy' },
    { label: 'dd-MM-yyyy', value: 'dd-MM-yyyy' },
    { label: 'ddMMM', value: 'ddMMM' },
    { label: 'dd MMM', value: 'dd MMM' },
    { label: 'MM/dd/yy', value: 'MM/dd/yy' },
    { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
  ],
  julian_format: [
    { label: 'yyyyddd', value: 'yyyyddd' },
    { label: 'yyyy', value: 'yyyy' },
    { label: 'ddd', value: 'ddd' },
  ],
};

export function getDataTypeConfig(dataType: string): DataTypeConfig | undefined {
  return DATA_TYPES.find((dt) => dt.value === dataType);
}

export function getUnitOptions(dataType: string): { label: string; value: string }[] {
  const config = getDataTypeConfig(dataType);
  if (!config?.unitGroup) return [];
  return UNIT_OPTIONS[config.unitGroup] || [];
}
