import { jsx as _jsx } from "react/jsx-runtime";
export function Avatar({ className = "", ...props }) {
    return (_jsx("div", { className: `inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 ${className}`, ...props }));
}
export function AvatarFallback({ className = "", ...props }) {
    return (_jsx("div", { className: `flex h-full w-full items-center justify-center rounded-full ${className}`, ...props }));
}
export default Avatar;
