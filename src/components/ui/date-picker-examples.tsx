/**
 * Examples of how to migrate existing date pickers to the new DatePicker component
 * 
 * MIGRATION GUIDE:
 * 
 * 1. Replace old Popover + Calendar patterns with DatePicker
 * 2. Use DatePickerISO for database operations (ensures consistent ISO format)
 * 3. Use DatePickerWithValidation for forms that need validation
 * 4. The new component fixes:
 *    - Calendar resizing when changing months (fixed width)
 *    - Wrong date selection (proper event handling)
 *    - Consistent formatting (uses dateUtils)
 *    - Typing support with validation
 */

import React from "react"
import { DatePicker, DatePickerISO, DatePickerWithValidation } from "./date-picker"

// BEFORE (old pattern found in dialogs):
const OldDatePickerExample = () => {
  return (
    <div>
      {/* This is what we had before - multiple files, inconsistent */}
      {/* 
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      */}
    </div>
  )
}

// AFTER (new unified approach):
const NewDatePickerExamples = () => {
  const [basicDate, setBasicDate] = React.useState<Date | null>(null)
  const [isoDate, setIsoDate] = React.useState<string | null>(null)
  const [validatedDate, setValidatedDate] = React.useState<Date | null>(null)

  return (
    <div className="space-y-4">
      
      {/* 1. Basic date picker with typing support */}
      <DatePicker
        value={basicDate}
        onChange={setBasicDate}
        placeholder="Select planned start date"
        allowTyping={true}
      />

      {/* 2. Database-safe ISO date picker */}
      <DatePickerISO
        value={isoDate}
        onChange={setIsoDate}
        placeholder="Database date (ISO format)"
      />

      {/* 3. Validated date picker for forms */}
      <DatePickerWithValidation
        value={validatedDate}
        onChange={setValidatedDate}
        placeholder="Required date"
        required={true}
        minDate={new Date()}
        onValidationChange={(isValid) => console.log("Is valid:", isValid)}
      />

      {/* 4. Read-only date picker (button-only, no typing) */}
      <DatePicker
        value={basicDate}
        onChange={setBasicDate}
        placeholder="Click to select"
        allowTyping={false}
      />

      {/* 5. Date picker with constraints */}
      <DatePicker
        value={basicDate}
        onChange={setBasicDate}
        placeholder="Future dates only"
        minDate={new Date()}
        maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
      />

    </div>
  )
}

export { NewDatePickerExamples }

/**
 * MIGRATION CHECKLIST:
 * 
 * ✅ Calendar no longer resizes (fixed width: 280px)
 * ✅ Supports typing dates in DD/MM/YYYY format
 * ✅ Validates dates as you type
 * ✅ Uses UK locale for display but saves ISO for database
 * ✅ Consistent base component across all instances
 * ✅ Built-in error handling and validation
 * ✅ Supports min/max date constraints
 * ✅ Maintains existing design system colors
 * ✅ Backwards compatible with existing Date objects
 * 
 * NEXT STEPS:
 * 1. Replace existing date pickers in dialogs (EditActionDialog, TaskEditDialog, etc.)
 * 2. Update forms to use DatePickerISO for database saves
 * 3. Test with different locales if needed
 */