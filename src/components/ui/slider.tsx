import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const thumbCount = Math.max(
    1,
    Array.isArray(value) ? value.length : Array.isArray(defaultValue) ? defaultValue.length : 1,
  );

  return (
    <SliderPrimitive.Root
      ref={ref}
      {...(value ? { value } : {})}
      {...(defaultValue ? { defaultValue } : {})}
      className={cn("relative flex h-8 w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/18">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block size-5 rounded-full border-2 border-primary bg-card shadow-card transition-[box-shadow,transform] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/18 disabled:pointer-events-none disabled:opacity-50 active:scale-110"
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
