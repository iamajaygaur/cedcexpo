"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Radix Select forbids empty string item values — map "" ↔ sentinel. */
const EMPTY_VALUE = "__cedc_select_empty__";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function toRadixValue(value: string) {
  return value === "" ? EMPTY_VALUE : value;
}

function fromRadixValue(value: string) {
  return value === EMPTY_VALUE ? "" : value;
}

function collectOptions(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === "option") {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement> & {
        children?: React.ReactNode;
      };
      options.push({
        value: props.value == null ? "" : String(props.value),
        label: String(props.children ?? props.label ?? props.value ?? ""),
        disabled: Boolean(props.disabled),
      });
      return;
    }

    if (child.type === "optgroup") {
      const props = child.props as { children?: React.ReactNode };
      options.push(...collectOptions(props.children));
    }
  });

  return options;
}

type SelectProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
  placeholder?: string;
  "aria-label"?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
};

/** Width/flex sizing belongs on the wrapper so toolbar selects don't force a new line. */
function partitionSelectClassName(className?: string) {
  if (!className) {
    return { wrapperClassName: "w-full", triggerClassName: undefined };
  }

  const wrapper: string[] = [];
  const trigger: string[] = [];

  for (const token of className.split(/\s+/).filter(Boolean)) {
    if (
      /^(min-|max-)?w-/.test(token) ||
      token === "shrink-0" ||
      token === "shrink" ||
      token === "grow" ||
      token === "grow-0" ||
      token === "flex-1" ||
      token === "flex-none"
    ) {
      wrapper.push(token);
    } else {
      trigger.push(token);
    }
  }

  return {
    wrapperClassName: wrapper.length > 0 ? wrapper.join(" ") : "w-full",
    triggerClassName: trigger.length > 0 ? trigger.join(" ") : undefined,
  };
}

/**
 * Custom dropdown used across the app.
 * Drop-in compatible with native <select> + <option> usage (name, value,
 * defaultValue, onChange) while rendering a floating menu.
 */
function Select({
  id,
  name,
  value,
  defaultValue,
  disabled = false,
  required = false,
  className,
  children,
  placeholder = "Select…",
  "aria-label": ariaLabel,
  onChange,
  onValueChange,
}: SelectProps) {
  const options = React.useMemo(() => collectOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(
    () => defaultValue ?? options[0]?.value ?? "",
  );

  const currentValue = isControlled ? (value ?? "") : internalValue;
  const selected = options.find((o) => o.value === currentValue);
  const label = selected?.label || placeholder;
  const { wrapperClassName, triggerClassName } =
    partitionSelectClassName(className);

  function emitChange(nextRaw: string) {
    const next = fromRadixValue(nextRaw);
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
    if (onChange) {
      const event = {
        target: { value: next, name: name ?? "" },
        currentTarget: { value: next, name: name ?? "" },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }
  }

  // Avoid passing empty string into Radix Root value.
  const radixValue = toRadixValue(currentValue);

  return (
    <div className={cn("relative min-w-0", wrapperClassName)}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={currentValue}
          required={required}
          disabled={disabled}
        />
      ) : null}

      <SelectPrimitive.Root
        value={radixValue}
        onValueChange={emitChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border,box-shadow,background-color]",
            "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[placeholder]:text-muted-foreground",
            "data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/50",
            triggerClassName,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {label}
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground opacity-80"
              aria-hidden
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className={cn(
              "z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-card text-foreground shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={`${option.value}::${option.label}`}
                  value={toRadixValue(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center rounded-sm py-2 pr-8 pl-3 text-sm outline-none select-none",
                    "focus:bg-muted data-[highlighted]:bg-muted",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                    "data-[state=checked]:bg-muted data-[state=checked]:font-medium",
                  )}
                >
                  <SelectPrimitive.ItemText>
                    <span className="truncate">{option.label}</span>
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <Check className="size-3.5 text-foreground" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export { Select };
