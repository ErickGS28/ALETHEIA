import * as React from 'react';
import { cn } from '../utils/cn';

const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<'label'>>(
  ({ className, ...props }, ref) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor lo provee el consumidor
    <label
      ref={ref}
      className={cn(
        'block text-sm font-medium text-foreground/80 font-sans',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export { Label };
