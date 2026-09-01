// src/components/admin/UserTableToolbar.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

interface Props {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onAddUser: () => void;
    filteredUserCount: number;
    isAdmin: boolean;
}

export function UserTableToolbar({
                                     searchQuery,
                                     onSearchChange,
                                     onAddUser,
                                     filteredUserCount,
                                     isAdmin
                                 }: Props) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-grow max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                    placeholder="Поиск пользователей..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                />
            </div>
            <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                    Найдено: {filteredUserCount}
                </p>
                {isAdmin && (
                    <Button size="sm" onClick={onAddUser}>
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить
                    </Button>
                )}
            </div>
        </div>
    );
}