import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { ReactNode } from "react"

type Props = {
    title: string
    status?: ReactNode
    children: ReactNode
    footer?: ReactNode
    className?: string
}

export default function CardShell({ title, status, children, footer, className = "" }: Props) {
    return (
        <Card className={`w-full rounded-xl border shadow-sm hover:shadow-md transition ${className}`}>
            <CardHeader className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">{title}</h3>
                {status && <div>{status}</div>}
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
                {children}
            </CardContent>
            {footer && <CardFooter className="pt-2">{footer}</CardFooter>}
        </Card>
    )
}
