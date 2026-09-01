import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
            <h1 className="text-8xl font-extrabold text-blue-600">404</h1>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Страница не найдена
            </h2>
            <p className="max-w-md text-lg text-gray-600">
                Извините, но мы не смогли найти запрашиваемую страницу.
                Она могла быть удалена, перемещена, либо вы ошиблись в адресе.
            </p>
            <div className="pt-4">
                <Button asChild size="lg" className="rounded-full shadow-lg">
                    <Link to="/">Вернуться на главную</Link>
                </Button>
            </div>
        </div>
    );
}
