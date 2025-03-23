import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('custom-pulse bg-muted', className)}
      style={{ borderRadius: '0.375rem' }}
      {...props}
    />
  );
}

export { Skeleton };
