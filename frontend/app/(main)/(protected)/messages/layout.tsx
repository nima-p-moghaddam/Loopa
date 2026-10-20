export default function MessagesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // تغییر max-w-2xl به max-w-4xl برای استفاده از فضای آزاد شده
        <div className="-mx-4 lg:mx-0 -mt-6 lg:mt-0 lg:max-w-4xl lg:mx-auto">
            {children}
        </div>
    );
}