import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptEquipmentListProps {
    rentalData: Pick<AdminRentalOut, 'equipment' | 'accessory_links'>;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    isCompact?: boolean;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    useCard?: boolean;
}

export default function ReceiptEquipmentList({ rentalData }: ReceiptEquipmentListProps) {
    // Группируем аксессуары по оборудованию
    type EquipmentWithAccessories = AdminRentalOut['equipment'][number] & { accessories: AdminRentalOut['accessory_links'][number]['accessory'][] };

    const equipmentWithAccessories = useMemo<EquipmentWithAccessories[]>(() => {
        const equipmentMap = new Map<number, EquipmentWithAccessories>();

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

    return (
        <section className="receipt-section receipt-equipment-table mb-5">
            <h3 className="receipt-section-title mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <Receipt className="h-4 w-4" />
                Оборудование и аксессуары
            </h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-8">№</TableHead>
                        <TableHead>Наименование</TableHead>
                        <TableHead>Серийный номер</TableHead>
                        <TableHead>Аксессуары</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {equipmentWithAccessories.map((equipment, index) => (
                        <TableRow key={equipment.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                                <p className="font-medium text-gray-900">{equipment.name}</p>
                                <p className="text-xs text-gray-500">{equipment.brand}</p>
                            </TableCell>
                            <TableCell>{equipment.serial_number || 'Не указан'}</TableCell>
                            <TableCell>
                                {equipment.accessories.length > 0 ? (
                                    <ul className="space-y-0.5 text-sm">
                                        {equipment.accessories.map((accessory) => (
                                            <li key={accessory.id} className="text-gray-700">
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
        </section>
    );
}
