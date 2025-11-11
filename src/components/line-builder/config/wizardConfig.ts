import { WizardConfig } from "../types/lineWizard";

export const lineWizardConfig: WizardConfig = {
  tableName: 'lines',
  positionsTable: 'positions',
  equipmentTable: 'equipment',
  camerasTable: 'cameras',
  iotDevicesTable: 'iot_devices',
  projectIdField: 'line_id',
};

export const solutionsLineWizardConfig: WizardConfig = {
  tableName: 'solutions_lines',
  positionsTable: 'positions',
  equipmentTable: 'equipment',
  camerasTable: 'cameras',
  iotDevicesTable: 'iot_devices',
  projectIdField: 'solutions_line_id',
};
