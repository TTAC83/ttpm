import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SaveOperation<T> {
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
  description: string;
}

interface SaveOptions {
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useSaveWithRetry = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeWithRetry = async <T,>(
    operation: SaveOperation<T>,
    options: SaveOptions = {}
  ): Promise<T | null> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      onSuccess,
      onError,
    } = options;

    let lastError: Error | null = null;
    const completedOperations: Array<() => Promise<void>> = [];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          setRetryCount(attempt);
          toast({
            title: "Retrying...",
            description: `Attempt ${attempt + 1} of ${maxRetries + 1}`,
          });
          await sleep(retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
        }

        const result = await operation.execute();
        
        // Success - store rollback if provided
        if (operation.rollback) {
          completedOperations.push(operation.rollback);
        }

        setRetryCount(0);
        onSuccess?.();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`${operation.description} failed (attempt ${attempt + 1}):`, error);

        // Don't retry on validation errors or 403/404
        if (
          lastError.message.includes("Validation") ||
          lastError.message.includes("Access denied") ||
          lastError.message.includes("not found")
        ) {
          break;
        }
      }
    }

    // All retries failed - attempt rollback
    if (completedOperations.length > 0) {
      toast({
        title: "Rolling back changes...",
        description: "Attempting to restore previous state",
      });

      try {
        // Rollback in reverse order
        for (let i = completedOperations.length - 1; i >= 0; i--) {
          await completedOperations[i]();
        }

        toast({
          title: "Rollback successful",
          description: "Changes have been reverted",
          variant: "destructive",
        });
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
        toast({
          title: "Rollback failed",
          description: "Please refresh the page and try again",
          variant: "destructive",
        });
      }
    }

    onError?.(lastError!);
    return null;
  };

  const executeTransactionalSave = async <T,>(
    operations: SaveOperation<T>[],
    options: SaveOptions = {}
  ): Promise<T[] | null> => {
    setIsSaving(true);
    const completedOperations: Array<() => Promise<void>> = [];
    const results: T[] = [];

    try {
      toast({
        title: "Saving...",
        description: "Processing your changes",
      });

      for (const operation of operations) {
        const result = await executeWithRetry(operation, {
          ...options,
          onSuccess: undefined, // Don't call individual success callbacks
          onError: undefined, // Don't call individual error callbacks
        });

        if (result === null) {
          // Operation failed - rollback all completed operations
          if (completedOperations.length > 0) {
            toast({
              title: "Rolling back changes...",
              description: "Reverting completed operations",
            });

            for (let i = completedOperations.length - 1; i >= 0; i--) {
              try {
                await completedOperations[i]();
              } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
              }
            }
          }

          toast({
            title: "Save failed",
            description: `Failed to complete: ${operation.description}`,
            variant: "destructive",
          });

          options.onError?.(new Error(`Failed to complete: ${operation.description}`));
          return null;
        }

        results.push(result);
        if (operation.rollback) {
          completedOperations.push(operation.rollback);
        }
      }

      toast({
        title: "Success",
        description: "All changes saved successfully",
      });

      options.onSuccess?.();
      return results;
    } finally {
      setIsSaving(false);
      setRetryCount(0);
    }
  };

  return {
    isSaving,
    retryCount,
    executeWithRetry,
    executeTransactionalSave,
  };
};
