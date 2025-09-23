import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDateUK, parseUKDate, toISODateString } from "@/lib/dateUtils"

export interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
  required?: boolean
  allowTyping?: boolean
  formatDisplay?: (date: Date) => string
  parseInput?: (input: string) => Date | null
  minDate?: Date
  maxDate?: Date
  "data-testid"?: string
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({
    value,
    onChange,
    placeholder = "DD/MM/YYYY",
    disabled = false,
    className,
    error,
    required = false,
    allowTyping = true,
    formatDisplay = formatDateUK,
    parseInput = parseUKDate,
    minDate,
    maxDate,
    "data-testid": testId,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const [isTyping, setIsTyping] = React.useState(false)

    // Sync input value with prop value
    React.useEffect(() => {
      if (value && !isTyping) {
        setInputValue(formatDisplay(value))
      } else if (!value && !isTyping) {
        setInputValue("")
      }
    }, [value, formatDisplay, isTyping])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      setIsTyping(true)

      // Try to parse the input as user types
      if (newValue.trim() === "") {
        onChange?.(null)
        return
      }

      const parsedDate = parseInput(newValue)
      if (parsedDate && isValid(parsedDate)) {
        // Check min/max constraints
        if (minDate && parsedDate < minDate) return
        if (maxDate && parsedDate > maxDate) return
        
        onChange?.(parsedDate)
      }
    }

    const handleInputBlur = () => {
      setIsTyping(false)
      // Reformat the input to ensure consistency
      if (value) {
        setInputValue(formatDisplay(value))
      }
    }

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleInputBlur()
      }
    }

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        onChange?.(date)
        setIsOpen(false)
        setIsTyping(false)
      }
    }

    const displayValue = value ? formatDisplay(value) : ""
    const showError = error && error.length > 0

    return (
      <div className="relative">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              {allowTyping ? (
                <Input
                  ref={ref}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  placeholder={value ? "" : placeholder}
                  disabled={disabled}
                  required={required}
                  data-testid={testId}
                  className={cn(
                    "pr-10",
                    showError && "border-destructive focus-visible:ring-destructive",
                    className
                  )}
                  {...props}
                />
              ) : (
                <Button
                  ref={ref as React.Ref<HTMLButtonElement>}
                  variant="outline"
                  disabled={disabled}
                  data-testid={testId}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground",
                    showError && "border-destructive",
                    className
                  )}
                  {...props}
                >
                  {value ? displayValue : placeholder}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="sr-only">Open calendar</span>
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align="start"
            sideOffset={4}
          >
            <Calendar
              mode="single"
              selected={value || undefined}
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (disabled) return true
                if (minDate && date < minDate) return true
                if (maxDate && date > maxDate) return true
                return false
              }}
              initialFocus
              fixedWeeks
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {showError && (
          <p className="text-sm text-destructive mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

DatePicker.displayName = "DatePicker"

export { DatePicker }

// Convenience exports for common use cases
export const DatePickerWithValidation = React.forwardRef<
  HTMLInputElement,
  DatePickerProps & {
    name?: string
    onValidationChange?: (isValid: boolean) => void
  }
>(({ value, onChange, onValidationChange, required, minDate, maxDate, ...props }, ref) => {
  const [error, setError] = React.useState<string>("")

  const handleChange = (date: Date | null) => {
    let errorMessage = ""
    
    if (required && !date) {
      errorMessage = "Date is required"
    } else if (date) {
      if (minDate && date < minDate) {
        errorMessage = `Date must be after ${formatDateUK(minDate)}`
      } else if (maxDate && date > maxDate) {
        errorMessage = `Date must be before ${formatDateUK(maxDate)}`
      }
    }

    setError(errorMessage)
    onValidationChange?.(errorMessage === "")
    onChange?.(date)
  }

  return (
    <DatePicker
      ref={ref}
      value={value}
      onChange={handleChange}
      error={error}
      required={required}
      minDate={minDate}
      maxDate={maxDate}
      {...props}
    />
  )
})

DatePickerWithValidation.displayName = "DatePickerWithValidation"

// Database-safe date picker that always returns ISO strings
export const DatePickerISO = React.forwardRef<
  HTMLInputElement,
  Omit<DatePickerProps, "value" | "onChange"> & {
    value?: string | null
    onChange?: (isoString: string | null) => void
  }
>(({ value, onChange, ...props }, ref) => {
  const dateValue = value ? new Date(value) : null
  
  const handleChange = (date: Date | null) => {
    onChange?.(date ? toISODateString(date) : null)
  }

  return (
    <DatePicker
      ref={ref}
      value={dateValue}
      onChange={handleChange}
      {...props}
    />
  )
})

DatePickerISO.displayName = "DatePickerISO"