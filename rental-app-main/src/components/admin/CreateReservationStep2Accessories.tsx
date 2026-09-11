// src/components/admin/CreateReservationStep2Accessories.tsx
import { Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip } from "lucide-react";
import { useCreateReservationContext } from "@/contexts/CreateReservationContext";

export const CreateReservationStep2Accessories = () => {
    const { form, equipmentWithAccessories } = useCreateReservationContext();
    const { control } = form;

    return (
        <div className="space-y-4 overflow-hidden flex flex-col flex-1">
            <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 pb-4">
                    {equipmentWithAccessories.map(equipmentItem => (
                        <Card key={equipmentItem.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Paperclip className="h-4 w-4" />
                                    {equipmentItem.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Controller
                                    name={`selected_accessories.${equipmentItem.id}`}
                                    control={control}
                                    render={({ field }) => (
                                        <div className="space-y-2">
                                            {equipmentItem.accessories.map(acc => (
                                                <div key={acc.id} className="flex items-center justify-between hover:bg-muted p-2 rounded">
                                                    <Label htmlFor={`acc-${equipmentItem.id}-${acc.id}`} className="flex items-center gap-2 font-normal cursor-pointer">
                                                        <Checkbox id={`acc-${equipmentItem.id}-${acc.id}`}
                                                                  checked={field.value?.includes(acc.id)}
                                                                  onCheckedChange={(checked) => {
                                                                      const currentIds = field.value || [];
                                                                      const newIds = checked ? [...currentIds, acc.id] : currentIds.filter(id => id !== acc.id);
                                                                      field.onChange(newIds);
                                                                  }}
                                                        />
                                                        {acc.name}
                                                    </Label>
                                                    <span className="text-xs text-muted-foreground">{acc.price} ₽</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};