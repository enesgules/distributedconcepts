import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

type SliderProps = SliderPrimitive.Root.Props & {
  ariaLabel: string;
  formatValue?: (value: number) => string;
};

function Slider({
  ariaLabel,
  className,
  defaultValue,
  formatValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderProps) {
  const values =
    typeof value === "number"
      ? [value]
      : value ??
        (typeof defaultValue === "number"
          ? [defaultValue]
          : defaultValue ?? [min]);

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-zinc-800 select-none data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-[var(--read)] select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            index={index}
            getAriaLabel={() => ariaLabel}
            getAriaValueText={
              formatValue
                ? (_formattedValue, numericValue) =>
                    formatValue(numericValue)
                : undefined
            }
            className="relative block size-4 shrink-0 rounded-full border border-cyan-300 bg-[var(--surface-panel-strong)] shadow-[0_0_0_3px_rgba(34,211,238,0.12)] transition-[box-shadow,scale] duration-150 select-none after:absolute after:-inset-3 hover:shadow-[0_0_0_5px_rgba(34,211,238,0.16)] active:scale-110 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider };
