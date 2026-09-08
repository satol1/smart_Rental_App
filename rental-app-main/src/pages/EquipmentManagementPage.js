import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/EquipmentManagementPage.tsx
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useProfile";
import AdminNavigation from "@/components/admin/AdminNavigation";
import EquipmentTable from "@/components/admin/EquipmentTable";
import EquipmentDialog from "@/components/equipment/EquipmentDialog";
import EquipmentCopyDialog from "@/components/equipment/EquipmentCopyDialog";
import { Button } from "@/components/ui/button";
import { Shield, Package, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { SkeletonList } from "@/components/ui/skeleton-list";
export default function EquipmentManagementPage() {
    const { data: currentUser } = useCurrentUser();
    const navigate = useNavigate();
    // ✅ ИЗМЕНЕНИЕ: Используем новый хук для получения полного списка оборудования
    const { data: allEquipment = [], isLoading, error } = useAllEquipment();
    const [dialogState, setDialogState] = useState({ isOpen: false, mode: 'create', equipment: null });
    const [copyDialogState, setCopyDialogState] = useState({ isOpen: false, sourceEquipment: null });
    const isAdmin = currentUser?.role === "admin";
    const isManager = currentUser?.role === "manager" || isAdmin;
    useEffect(() => {
        if (!dialogState.isOpen) {
            document.body.style.overflow = '';
        }
    }, [dialogState.isOpen]);
    if (!isManager) {
        return (_jsx("div", { className: "max-w-7xl mx-auto px-4 py-8", children: _jsxs("div", { className: "text-center", children: [_jsx(Shield, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "\u0414\u043E\u0441\u0442\u0443\u043F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D" }), _jsx("p", { className: "text-gray-600 mb-4", children: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044E \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435\u043C." }), _jsx(Button, { onClick: () => navigate("/"), children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] }) }));
    }
    if (isLoading) {
        return (_jsx("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-4", role: "status", "aria-label": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F", children: _jsx(SkeletonList, { count: 8, compact: true }) }));
    }
    if (error) {
        return (_jsx("div", { className: "max-w-7xl mx-auto px-4 py-6", children: _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "text-red-500 mb-4", children: [_jsx(Shield, { className: "w-16 h-16 mx-auto mb-2" }), _jsx("h2", { className: "text-xl font-semibold", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" }), _jsx("p", { className: "text-gray-600", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" })] }), _jsx(Button, { onClick: () => window.location.reload(), children: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430" })] }) }));
    }
    const handleEditEquipment = (equipment) => {
        setDialogState({ isOpen: true, mode: 'edit', equipment });
    };
    const handleCreateEquipment = () => {
        setDialogState({ isOpen: true, mode: 'create', equipment: null });
    };
    const handleCloseDialog = () => {
        setDialogState({ isOpen: false, mode: 'create', equipment: null });
    };
    const handleCopyEquipment = (equipment) => {
        setCopyDialogState({ isOpen: true, sourceEquipment: equipment });
    };
    const handleCloseCopyDialog = () => {
        setCopyDialogState({ isOpen: false, sourceEquipment: null });
    };
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Package, { className: "w-8 h-8 text-green-600" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435\u043C" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435, \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F \u0434\u043B\u044F \u0430\u0440\u0435\u043D\u0434\u044B" })] })] }), _jsxs(Button, { onClick: handleCreateEquipment, className: "flex items-center gap-2", children: [_jsx(Plus, { className: "w-4 h-4" }), "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435"] })] }), _jsx("div", { className: "bg-white rounded-lg border shadow-sm p-6", children: _jsx(EquipmentTable, { onEditEquipment: handleEditEquipment, onCopyEquipment: handleCopyEquipment, equipment: allEquipment }) }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-blue-900 mb-3", children: "\uD83D\uDCA1 \u041F\u043E\u043B\u0435\u0437\u043D\u044B\u0435 \u0441\u043E\u0432\u0435\u0442\u044B" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium mb-2", children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F:" }), _jsxs("ul", { className: "space-y-1", children: [_jsx("li", { children: "\u2022 \u0423\u043A\u0430\u0437\u044B\u0432\u0430\u0439\u0442\u0435 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432" }), _jsx("li", { children: "\u2022 \u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0441\u0435\u0440\u0438\u0439\u043D\u044B\u0435 \u043D\u043E\u043C\u0435\u0440\u0430 \u0434\u043B\u044F \u0443\u0447\u0435\u0442\u0430" }), _jsx("li", { children: "\u2022 \u0423\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0439\u0442\u0435 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0442\u0430\u0440\u0438\u0444\u044B" })] })] }), _jsxs("div", { children: [_jsx("p", { className: "font-medium mb-2", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435:" }), _jsxs("ul", { className: "space-y-1", children: [_jsx("li", { children: "\u2022 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u0438\u0441\u043A \u0434\u043B\u044F \u0431\u044B\u0441\u0442\u0440\u043E\u0433\u043E \u043D\u0430\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F" }), _jsx("li", { children: "\u2022 \u0412\u044B\u0434\u0435\u043B\u044F\u0439\u0442\u0435 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u0434\u043B\u044F \u043C\u0430\u0441\u0441\u043E\u0432\u044B\u0445 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439" }), _jsx("li", { children: "\u2022 \u0420\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0439\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" })] })] })] })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-3", children: "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3 text-sm", children: [_jsxs("div", { className: "bg-green-100 text-green-800 p-2 rounded text-center", children: [_jsx("div", { className: "font-medium", children: "\u0412\u0435\u043B\u0438\u043A\u043E\u043B\u0435\u043F\u043D\u043E" }), _jsx("div", { className: "text-xs", children: "\u041A\u0430\u043A \u043D\u043E\u0432\u043E\u0435" })] }), _jsxs("div", { className: "bg-blue-100 text-blue-800 p-2 rounded text-center", children: [_jsx("div", { className: "font-medium", children: "\u041E\u0442\u043B\u0438\u0447\u043D\u043E" }), _jsx("div", { className: "text-xs", children: "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0438\u0437\u043D\u043E\u0441" })] }), _jsxs("div", { className: "bg-yellow-100 text-yellow-800 p-2 rounded text-center", children: [_jsx("div", { className: "font-medium", children: "\u0425\u043E\u0440\u043E\u0448\u043E" }), _jsx("div", { className: "text-xs", children: "\u041D\u0435\u0431\u043E\u043B\u044C\u0448\u0438\u0435 \u043F\u043E\u0442\u0435\u0440\u0442\u043E\u0441\u0442\u0438" })] }), _jsxs("div", { className: "bg-orange-100 text-orange-800 p-2 rounded text-center", children: [_jsx("div", { className: "font-medium", children: "\u0423\u0434\u043E\u0432\u043B\u0435\u0442\u0432\u043E\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u043E" }), _jsx("div", { className: "text-xs", children: "\u0417\u0430\u043C\u0435\u0442\u043D\u044B\u0439 \u0438\u0437\u043D\u043E\u0441" })] }), _jsxs("div", { className: "bg-red-100 text-red-800 p-2 rounded text-center", children: [_jsx("div", { className: "font-medium", children: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0440\u0435\u043C\u043E\u043D\u0442\u0430" }), _jsx("div", { className: "text-xs", children: "\u041D\u0435 \u0441\u0434\u0430\u0435\u0442\u0441\u044F" })] })] })] }), _jsx(EquipmentDialog, { isOpen: dialogState.isOpen, onClose: handleCloseDialog, mode: dialogState.mode, equipment: dialogState.equipment || undefined }), copyDialogState.sourceEquipment && (_jsx(EquipmentCopyDialog, { isOpen: copyDialogState.isOpen, onClose: handleCloseCopyDialog, sourceEquipment: copyDialogState.sourceEquipment }))] }));
}
