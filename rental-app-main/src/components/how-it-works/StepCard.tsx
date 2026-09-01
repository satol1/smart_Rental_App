import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  colorScheme = 'blue'
}: StepCardProps) {
  // Цветовые схемы для разных шагов
  const colorSchemes = {
    blue: {
      circle: 'bg-sky-100',
      number: 'text-sky-700',
      iconBg: 'border-sky-100',
      icon: 'text-sky-600'
    },
    green: {
      circle: 'bg-emerald-100',
      number: 'text-emerald-700',
      iconBg: 'border-emerald-100',
      icon: 'text-emerald-600'
    },
    purple: {
      circle: 'bg-purple-100',
      number: 'text-purple-700',
      iconBg: 'border-purple-100',
      icon: 'text-purple-600'
    },
    orange: {
      circle: 'bg-orange-100',
      number: 'text-orange-700',
      iconBg: 'border-orange-100',
      icon: 'text-orange-600'
    }
  };

  const colors = colorSchemes[colorScheme];
  return (
    <Card className={cn("h-full transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Номер шага в кружке */}
          <div className="relative">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", colors.circle)}>
              <span className={cn("text-2xl font-bold", colors.number)}>{stepNumber}</span>
            </div>
            {/* Иконка в правом верхнем углу кружка */}
            <div className={cn("absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border-2", colors.iconBg)}>
              <Icon className={cn("w-4 h-4", colors.icon)} />
            </div>
          </div>
          
          {/* Заголовок */}
          <h3 className="text-xl font-semibold text-gray-900">
            {title}
          </h3>
          
          {/* Описание */}
          <p className="text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
