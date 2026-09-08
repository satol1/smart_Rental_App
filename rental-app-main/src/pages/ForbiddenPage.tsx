import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
            <h1 className="text-8xl font-extrabold text-red-500">403</h1>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Доступ запрещен
            </h2>
            <p className="max-w-md text-lg text-gray-600">
                У вас нет прав для просмотра этого раздела.
                Если вы считаете, что это ошибка, обратитесь к администратору.
            </p>
            <div className="pt-4 flex gap-4">
                <Button variant="outline" size="lg" className="rounded-full shadow-sm" onClick={() => navigate(-1)}>
                    Назад
                </Button>
                <Button asChild size="lg" className="rounded-full shadow-lg">
                    <Link to="/">На главную</Link>
                </Button>
            </div>
        </div>
    );
}
