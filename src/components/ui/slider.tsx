"use client";
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex h-6 w-full touch-none select-none items-center", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-2">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={props["aria-label"]}
        className="block h-5 w-5 cursor-pointer rounded-full border-2 border-primary bg-bg shadow focus-visible:outline-2 focus-visible:outline-primary"
      />
    </SliderPrimitive.Root>
  );
}
