// src/pages/EquipmentManagementPage.tsx

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useProfile";
import EquipmentTable from "@/components/admin/EquipmentTable";
import EquipmentDialog from "@/components/equipment/EquipmentDialog";
import EquipmentCopyDialog from "@/components/equipment/EquipmentCopyDialog";
import { Button } from "@/components/ui/button";
import { Shield, Package, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Equipment } from "@/types/equipment";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { SkeletonList } from "@/components/ui/skeleton-list";

export default function EquipmentManagementPage() {
    const { data: currentUser } = useCurrentUser();
    const navigate = useNavigate();

    // ✅ ИЗМЕНЕНИЕ: Используем новый хук для получения полного списка оборудования
    const { data: allEquipment = [], isLoading, error, refetch } = useAllEquipment();

    const [dialogState, setDialogState] = useState<{
        isOpen: boolean;
        mode: 'create' | 'edit';
        equipment: Equipment | null;
    }>({ isOpen: false, mode: 'create', equipment: null });

    const [copyDialogState, setCopyDialogState] = useState<{
        isOpen: boolean;
        sourceEquipment: Equipment | null;
    }>({ isOpen: false, sourceEquipment: null });

    const isAdmin = currentUser?.role === "admin";
    const isManager = currentUser?.role === "manager" || isAdmin;

    useEffect(() => {
        if (!dialogState.isOpen) {
            document.body.style.overflow = '';
        }
    }, [dialogState.isOpen]);

    if (!isManager) {
        return (
            <div>
                <div className="text-center">
                    <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Доступ ограничен
                    </h1>
                    <p className="text-muted-foreground mb-4">
                        У вас нет прав для доступа к управлению оборудованием.
                    </p>
                    <Button onClick={() => navigate("/")}>
                        На главную
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4" role="status" aria-label="Загрузка оборудования">
                <SkeletonList count={8} compact />
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="text-center">
                    <div className="text-destructive mb-4">
                        <Shield className="w-16 h-16 mx-auto mb-2" />
                        <h2 className="text-xl font-semibold">Ошибка загрузки</h2>
                        <p className="text-muted-foreground">Не удалось загрузить список оборудования</p>
                    </div>
                    <Button onClick={() => void refetch()}>
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }

    const handleEditEquipment = (equipment: Equipment) => {
        setDialogState({ isOpen: true, mode: 'edit', equipment });
    };

    const handleCreateEquipment = () => {
        setDialogState({ isOpen: true, mode: 'create', equipment: null });
    };

    const handleCloseDialog = () => {
        setDialogState({ isOpen: false, mode: 'create', equipment: null });
    };

    const handleCopyEquipment = (equipment: Equipment) => {
        setCopyDialogState({ isOpen: true, sourceEquipment: equipment });
    };

    const handleCloseCopyDialog = () => {
        setCopyDialogState({ isOpen: false, sourceEquipment: null });
    };

    return (
        <div className="space-y-6">

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-success" />
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Управление оборудованием
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Добавление, редактирование и удаление оборудования для аренды
                        </p>
                    </div>
                </div>
                <Button onClick={handleCreateEquipment} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Создать оборудование
                </Button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6">
                {/* ✅ ИЗМЕНЕНИЕ: Передаем полный список оборудования в таблицу */}
                <EquipmentTable
                    onEditEquipment={handleEditEquipment}
                    onCopyEquipment={handleCopyEquipment}
                    equipment={allEquipment}
                />
            </div>

            {/* Блоки с советами и состояниями остаются без изменений */}
            <div className="bg-info-soft border border-primary/30 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3">💡 Полезные советы</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-foreground">
                    <div>
                        <p className="font-medium mb-2">Добавление оборудования:</p>
                        <ul className="space-y-1">
                            <li>• Указывайте подробное описание для клиентов</li>
                            <li>• Добавляйте серийные номера для учета</li>
                            <li>• Устанавливайте актуальные тарифы</li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-medium mb-2">Управление:</p>
                        <ul className="space-y-1">
                            <li>• Используйте поиск для быстрого нахождения</li>
                            <li>• Выделяйте несколько элементов для массовых операций</li>
                            <li>• Регулярно обновляйте состояние оборудования</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3">Состояния оборудования</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div className="bg-success-soft text-success p-2 rounded text-center">
                        <div className="font-medium">Великолепно</div>
                        <div className="text-xs">Как новое</div>
                    </div>
                    <div className="bg-info-soft text-foreground p-2 rounded text-center">
                        <div className="font-medium">Отлично</div>
                        <div className="text-xs">Минимальный износ</div>
                    </div>
                    <div className="bg-warning-soft text-warning p-2 rounded text-center">
                        <div className="font-medium">Хорошо</div>
                        <div className="text-xs">Небольшие потертости</div>
                    </div>
                    <div className="bg-warning-soft text-warning p-2 rounded text-center">
                        <div className="font-medium">Удовлетворительно</div>
                        <div className="text-xs">Заметный износ</div>
                    </div>
                    <div className="bg-danger-soft text-destructive p-2 rounded text-center">
                        <div className="font-medium">Требует ремонта</div>
                        <div className="text-xs">Не сдается</div>
                    </div>
                </div>
            </div>

            <EquipmentDialog 
                isOpen={dialogState.isOpen}
                onClose={handleCloseDialog}
                mode={dialogState.mode}
                equipment={dialogState.equipment || undefined}
            />

            {copyDialogState.sourceEquipment && (
                <EquipmentCopyDialog
                    isOpen={copyDialogState.isOpen}
                    onClose={handleCloseCopyDialog}
                    sourceEquipment={copyDialogState.sourceEquipment}
                />
            )}
        </div>
    );
}