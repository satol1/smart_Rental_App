import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useProfile";
export default function RequireAuth({ children, role }) {
    const { data: user, isLoading } = useCurrentUser();
    const location = useLocation();
    if (isLoading) {
        return _jsx("p", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044F..." });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true, state: { from: location.pathname } });
    }
    if (role && !(Array.isArray(role) ? role.includes(user.role) : user.role === role)) {
        return _jsx(Navigate, { to: "/forbidden", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
