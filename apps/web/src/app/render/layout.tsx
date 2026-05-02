/**
 * Layout for the internal /render/[id] route. Strips the app shell so the
 * headless browser captures only the template content. Inherits the root
 * `<html>` / `<body>` from `app/layout.tsx`.
 */
export default function RenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        // The export service captures whatever this main paints; we want a
        // transparent surface so the template's own card colour wins.
        background: "transparent",
      }}
    >
      {children}
    </main>
  );
}
