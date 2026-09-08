import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepCardProps {
  icon: LucideIcon;
  stepNumber: number;
  title: string;
  description: string;
  className?: string;
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange';
}

export default function StepCard({
  icon: Icon,
  stepNumber,
  title,
  description,
  className,
}: StepCardProps) {
  return (
    <article className={cn("grid grid-cols-[2.75rem_1fr] gap-4 py-7 sm:grid-cols-[4rem_1fr] sm:gap-6", className)}>
      <span className="pt-0.5 text-2xl font-medium tabular-nums text-muted-foreground" aria-hidden="true">
        {stepNumber}
      </span>
      <div>
        <h2 className="mb-2 flex items-center gap-3 text-xl font-semibold text-foreground">
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        <p className="max-w-[72ch] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </article>
  );
}
