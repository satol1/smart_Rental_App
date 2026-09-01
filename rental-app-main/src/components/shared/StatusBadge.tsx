// path: rental-app-main/src/components/shared/StatusBadge.tsx

import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, type OrderStatus } from "@/constants/statusConstants";

interface Props {
    status: OrderStatus;
}

export default function StatusBadge({ status }: Props) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.cancelled; // Fallback

    return (
        <Badge variant="outline" className={`font-medium ${config.badgeClass}`}>
            {config.text}
        </Badge>
    );
}
