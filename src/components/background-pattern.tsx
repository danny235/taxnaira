export function BackgroundPattern() {
    return (
        <div className="fixed inset-0 -z-10 h-full w-full bg-background pointer-events-none">
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[500px] w-full bg-primary/5 opacity-40 blur-[120px]"></div>
        </div>
    );
}
