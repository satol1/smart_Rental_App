import { jsx as _jsx } from "react/jsx-runtime";
import { useSearchStore } from "../store/searchStore";
import { Input } from "@/components/ui/input";
export default function SearchInput() {
    const { query, setQuery } = useSearchStore();
    return (_jsx(Input, { type: "text", placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E...", value: query, onChange: (e) => setQuery(e.target.value), className: "w-full max-w-sm" }));
}
