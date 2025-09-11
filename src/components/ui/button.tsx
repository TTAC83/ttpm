import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-thingtrax-blue text-white hover:bg-thingtrax-blue/90 hover:shadow-thingtrax-glow rounded-thingtrax-corners",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-thingtrax-corners",
        outline: "border border-thingtrax-blue/20 bg-transparent text-thingtrax-blue hover:bg-thingtrax-blue/10 hover:border-thingtrax-blue/40 rounded-thingtrax-corners",
        secondary: "bg-thingtrax-light-gray text-thingtrax-dark-gray hover:bg-thingtrax-light-gray/80 rounded-thingtrax-corners",
        ghost: "hover:bg-thingtrax-blue/10 hover:text-thingtrax-blue rounded-thingtrax-corners",
        link: "text-thingtrax-blue underline-offset-4 hover:underline",
        premium: "bg-gradient-thingtrax text-white hover:shadow-premium-glow rounded-thingtrax-corners before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        thingtrax: "bg-thingtrax-blue text-white hover:bg-thingtrax-blue/90 shadow-thingtrax rounded-thingtrax-corners thingtrax-corners",
      },
      size: {
        default: "h-10 px-4 py-2 text-body",
        sm: "h-9 px-3 text-small",
        lg: "h-12 px-8 text-medium font-semibold",
        icon: "h-10 w-10",
        big: "h-14 px-10 text-big font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
