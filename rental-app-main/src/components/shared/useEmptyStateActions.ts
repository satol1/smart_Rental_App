// src/components/shared/useEmptyStateActions.ts

import { useNavigate } from "react-router-dom";

// Хук для стандартных действий в пустом состоянии
export function useEmptyStateActions() {
    const navigate = useNavigate();

    const goToEquipmentSelection = () => {
        navigate("/");
    };

    const goToHowItWorks = () => {
        navigate("/how-it-works");
    };

    return {
        goToEquipmentSelection,
        goToHowItWorks
    };
}
