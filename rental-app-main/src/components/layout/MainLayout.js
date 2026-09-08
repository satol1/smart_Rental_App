import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense } from "react";
import Header from "./Header";
import AnimatedOutlet from "@/components/shared/AnimatedOutlet";
import PageFallback from "@/components/shared/PageFallback";
export default function MainLayout() {
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [_jsx(Header, {}), _jsx("main", { children: _jsx(Suspense, { fallback: _jsx(PageFallback, {}), children: _jsx(AnimatedOutlet, {}) }) })] }));
}
