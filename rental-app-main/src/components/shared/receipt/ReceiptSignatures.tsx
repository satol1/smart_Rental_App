function SignatureField({ label }: { label: string }) {
    return (
        <div className="receipt-sign-field flex items-end gap-2">
            <span className="shrink-0 text-sm text-foreground">{label}</span>
            <span className="receipt-sign-line h-6 flex-1 border-b border-foreground" />
        </div>
    );
}

export default function ReceiptSignatures() {
    return (
        <section className="receipt-section receipt-signatures mt-6">
            <p className="receipt-signatures-statement mb-5 text-sm text-foreground">
                Оборудование получил в исправном состоянии, с условиями аренды ознакомлен и согласен.
            </p>
            <div className="grid grid-cols-2 gap-10">
                <div className="receipt-signatures-client space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Клиент</h3>
                    <SignatureField label="ФИО" />
                    <SignatureField label="Подпись" />
                    <SignatureField label="Дата" />
                </div>
                <div className="receipt-signatures-manager space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Менеджер</h3>
                    <SignatureField label="Подпись" />
                    <SignatureField label="Дата" />
                    <p className="receipt-signatures-stamp pt-2 text-sm text-foreground">М.П.</p>
                </div>
            </div>
        </section>
    );
}
