import "./present.css";

export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="present-root min-h-screen text-2xl bg-navy-900">
      <div className="max-w-[1920px] mx-auto px-12 py-8">{children}</div>
    </div>
  );
}
