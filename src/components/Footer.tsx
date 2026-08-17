import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line mt-16 px-4 py-6 text-center text-xs text-muted">
      <p>
        Ratene er grove estimater av total timekostnad. Ikke sint, bare
        skuffet.
      </p>
      <p className="mt-2 flex justify-center gap-4">
        <Link href="/" className="hover:text-foreground">
          Møtebrenneren
        </Link>
        <Link href="/personvern" className="hover:text-foreground">
          Personvern
        </Link>
      </p>
    </footer>
  );
}
