export function PostSkeleton() {
    return (
        <div className="bg-card border-b sm:border sm:rounded-2xl sm:shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <div className="h-9 w-9 rounded-full skeleton" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 skeleton" />
                    <div className="h-2 w-16 skeleton" />
                </div>
            </div>

            {/* Image */}
            <div className="aspect-square w-full skeleton" />

            {/* Actions */}
            <div className="px-3 pt-2 pb-3 sm:px-4 space-y-2">
                <div className="flex items-center gap-3">
                    <div className="h-6 w-12 skeleton" />
                    <div className="h-6 w-12 skeleton" />
                    <div className="h-6 w-12 skeleton" />
                </div>
                <div className="h-3 w-20 skeleton" />
                <div className="h-3 w-3/4 skeleton" />
            </div>
        </div>
    );
}