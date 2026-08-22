import Link from "next/link";

export default function Nav({ current }) {
  const items = [
    { href: "/", label: "Queues" },
    { href: "/inbox", label: "Inbox" },
  ];

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Returns operations</p>
        <h1>Policy reviewer</h1>
      </div>
      <nav>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={current === item.href ? "nav-link active" : "nav-link"}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
