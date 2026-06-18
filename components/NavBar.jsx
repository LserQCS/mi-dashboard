import { useRouter } from "next/router";
import Link from "next/link";

const TABS = [
  { href: "/",            label: "📦 Disponibilidad" },
  { href: "/operacional", label: "📊 Operacional"    },
];

export default function NavBar() {
  const { pathname } = useRouter();
  return (
    <div style={{
      background: "#111827",
      borderBottom: "1px solid #1f2d45",
      padding: "0 2rem",
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: 48,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 24 }}>
        <div style={{ width: 6, height: 22, background: "#3b82f6", borderRadius: 3 }} />
        <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.9rem" }}>Logística</span>
      </div>
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} style={{
            padding: "5px 16px",
            borderRadius: 8,
            fontSize: "0.8rem",
            fontWeight: active ? 700 : 400,
            textDecoration: "none",
            border: active ? "1px solid #3b82f6" : "1px solid transparent",
            background: active ? "rgba(59,130,246,0.15)" : "transparent",
            color: active ? "#93c5fd" : "#94a3b8",
            transition: "all 0.15s",
          }}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
