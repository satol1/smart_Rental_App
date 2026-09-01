import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptEquipmentListProps {
    rentalData: Pick<AdminRentalOut, 'equipment' | 'accessory_links'>;
    isCompact?: boolean;
    useCard?: boolean;
}

export default function ReceiptEquipmentList({ rentalData, isCompact = false, useCard = true }: ReceiptEquipmentListProps) {
    // Группируем аксессуары по оборудованию
    const equipmentWithAccessories = useMemo(() => {
        const equipmentMap = new Map();
        
        // Добавляем оборудование
        rentalData.equipment.forEach(equipment => {
            equipmentMap.set(equipment.id, {
                ...equipment,
                accessories: []
            });
        });
        
        // Добавляем аксессуары к соответствующему оборудованию
        rentalData.accessory_links.forEach(link => {
            const equipment = equipmentMap.get(link.equipment_id);
            if (equipment) {
                equipment.accessories.push(link.accessory);
            }
        });
        
        return Array.from(equipmentMap.values());
    }, [rentalData.equipment, rentalData.accessory_links]);

    const content = (
        <>
            <h3 className={`flex items-center gap-2 ${isCompact ? 'text-base' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`}>
                <Receipt className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
                Оборудование и аксессуары
            </h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className={isCompact ? "text-xs" : ""}>№</TableHead>
                        <TableHead className={isCompact ? "text-xs" : ""}>Наименование</TableHead>
                        <TableHead className={isCompact ? "text-xs" : ""}>Серийный номер</TableHead>
                        <TableHead className={isCompact ? "text-xs" : ""}>Аксессуары</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {equipmentWithAccessories.map((equipment, index) => (
                        <TableRow key={equipment.id}>
                            <TableCell className={isCompact ? "text-xs" : ""}>{index + 1}</TableCell>
                            <TableCell className={isCompact ? "text-xs" : ""}>
                                <div>
                                    <p className="font-medium">{equipment.name}</p>
                                    <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-600`}>{equipment.brand}</p>
                                </div>
                            </TableCell>
                            <TableCell className={isCompact ? "text-xs" : ""}>{equipment.serial_number || 'Не указан'}</TableCell>
                            <TableCell className={isCompact ? "text-xs" : ""}>
                                {equipment.accessories.length > 0 ? (
                                    <ul className={`${isCompact ? 'text-xs space-y-0' : 'text-sm space-y-1'}`}>
                                        {equipment.accessories.map((accessory: any, accIndex: number) => (
                                            <li key={accessory.id} className="text-gray-600">
                                                • {accessory.name}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="text-gray-400">Нет</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );

    if (!useCard) {
        return (
            <div className="border-t pt-2 mt-2">
                {content}
            </div>
        );
    }

    return (
        <Card className={isCompact ? "mb-3" : "mb-6"}>
            <CardHeader className={isCompact ? "pb-2" : "pb-3"}>
                {content}
            </CardHeader>
        </Card>
    );
}
