interface Props {
  value: string | null | undefined;
  max: number;
}

export function CharacterCounter({ value, max }: Props) {
  const count = value?.length ?? 0;
  const ratio = count / max;
  const tone =
    ratio < 0.7 ? "text-muted-foreground" : ratio < 1 ? "text-amber-500" : "text-destructive";
  return (
    <p className={`mt-1 text-end text-[11px] tabular-nums ${tone}`}>
      {count} / {max}
    </p>
  );
}
