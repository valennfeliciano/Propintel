type GaugeTone = { text: string };

export default function ScoreGauge({ score, tone }: { score: number; tone: GaugeTone }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);

  return (
    <svg
      viewBox="0 0 108 108"
      className="h-28 w-28 shrink-0 -rotate-90"
      role="img"
      aria-label={`Score ${score} out of 100`}
    >
      <circle cx="54" cy="54" r={r} fill="none" strokeWidth="9" className="stroke-slate-100" />
      <circle
        cx="54"
        cy="54"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        className={tone.text}
        style={{
          stroke: "currentColor",
          strokeDasharray: `${circumference}`,
          strokeDashoffset: `${circumference}`,
          "--gauge-offset": `${offset}`,
          animation: "gauge-fill 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        } as React.CSSProperties}
      />
      <text
        x="54"
        y="54"
        textAnchor="middle"
        dominantBaseline="central"
        className={`rotate-90 font-mono text-[26px] font-bold ${tone.text}`}
        style={{ transformOrigin: "54px 54px" }}
      >
        {score}
      </text>
    </svg>
  );
}
