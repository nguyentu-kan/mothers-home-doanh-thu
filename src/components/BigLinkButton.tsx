import Link from "next/link";

export default function BigLinkButton({
  href,
  icon,
  label,
  color = "#1B3A5C",
}: {
  href: string;
  icon: string;
  label: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl py-8 text-white font-bold text-xl shadow active:scale-[0.98] transition"
      style={{ backgroundColor: color }}
    >
      <span className="text-4xl">{icon}</span>
      {label}
    </Link>
  );
}
