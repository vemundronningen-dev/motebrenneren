"use client";

import { formatKr } from "@/lib/format";

const DIGITS = "0123456789".split("");

function DigitColumn({ digit }: { digit: number }) {
  return (
    <span
      className="relative inline-block w-[0.62em] overflow-hidden align-top"
      style={{ height: "1em" }}
    >
      <span
        className="absolute left-0 top-0 block transition-transform duration-200 ease-out"
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block text-center" style={{ height: "1em", lineHeight: "1em" }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Stor teller med rullende siffer (odometer-effekt), norsk tallformat. */
export default function RollingNumber({
  value,
  suffix = " kr",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const formatted = formatKr(value); // "1 234 567"
  return (
    <span className={`tabular inline-flex items-baseline ${className ?? ""}`}>
      {formatted.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <DigitColumn key={i} digit={Number(ch)} />
        ) : (
          <span key={i} className="inline-block w-[0.32em]" />
        ),
      )}
      <span className="ml-2">{suffix}</span>
    </span>
  );
}
