import { supabase } from "@/integrations/supabase/client";

/**
 * Migrates vision equipment (lights, PLCs, HMIs) from iot_devices table to camera fields.
 * This script identifies iot_devices that should be camera accessories and moves them.
 */
export async function migrateVisionEquipmentToCameras() {
  console.log("Starting vision equipment migration...");
  
  try {
    // Step 1: Get all IoT devices with their hardware types
    const { data: iotDevices, error: iotError } = await supabase
      .from('iot_devices')
      .select(`
        id,
        name,
        equipment_id,
        hardware_master_id,
        hardware_master:hardware_master_id (
          id,
          hardware_type
        )
      `);

    if (iotError) throw iotError;

    if (!iotDevices || iotDevices.length === 0) {
      console.log("No IoT devices found to migrate.");
      return { success: true, migrated: 0 };
    }

    // Step 2: Get all cameras with their equipment_ids
    const { data: cameras, error: camerasError } = await supabase
      .from('cameras')
      .select('id, equipment_id, light_id, plc_master_id, hmi_master_id')
      .returns<Array<{
        id: string;
        equipment_id: string;
        light_id: string | null;
        plc_master_id: string | null;
        hmi_master_id: string | null;
      }>>();

    if (camerasError) throw camerasError;

    let migratedCount = 0;
    const errors = [];

    // Step 3: Process each IoT device
    for (const iotDevice of iotDevices) {
      const hardwareType = (iotDevice.hardware_master as any)?.hardware_type;
      
      // Only process Lights, PLCs, and HMIs
      if (!['Light', 'PLC', 'HMI'].includes(hardwareType)) {
        continue;
      }

      // Find camera with same equipment_id
      const camera = cameras?.find(c => c.equipment_id === iotDevice.equipment_id);
      
      if (!camera) {
        console.warn(`No camera found for ${hardwareType} device ${iotDevice.id} on equipment ${iotDevice.equipment_id}`);
        continue;
      }

      try {
        // Update the camera based on hardware type
        const updateData: any = {};
        
        if (hardwareType === 'Light') {
          if (!camera.light_id) {
            updateData.light_id = iotDevice.hardware_master_id;
            updateData.light_required = true;
          }
        } else if (hardwareType === 'PLC') {
          if (!camera.plc_master_id) {
            updateData.plc_master_id = iotDevice.hardware_master_id;
            updateData.plc_attached = true;
          }
        } else if (hardwareType === 'HMI') {
          if (!camera.hmi_master_id) {
            updateData.hmi_master_id = iotDevice.hardware_master_id;
            updateData.hmi_required = true;
          }
        }

        if (Object.keys(updateData).length > 0) {
          // Update camera
          const { error: updateError } = await supabase
            .from('cameras')
            .update(updateData)
            .eq('id', camera.id);

          if (updateError) throw updateError;

          // Delete the IoT device entry
          const { error: deleteError } = await supabase
            .from('iot_devices')
            .delete()
            .eq('id', iotDevice.id);

          if (deleteError) throw deleteError;

          migratedCount++;
          console.log(`Migrated ${hardwareType} ${iotDevice.id} to camera ${camera.id}`);
        }
      } catch (error) {
        console.error(`Error migrating ${hardwareType} ${iotDevice.id}:`, error);
        errors.push({ deviceId: iotDevice.id, hardwareType, error });
      }
    }

    console.log(`Migration complete. Migrated ${migratedCount} devices.`);
    
    if (errors.length > 0) {
      console.error("Errors encountered during migration:", errors);
    }

    return {
      success: true,
      migrated: migratedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Migration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
