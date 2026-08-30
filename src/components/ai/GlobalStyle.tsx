"use client";
// A plain global <style> tag, deliberately NOT styled-jsx.
//
// `<style jsx global>` blocks that interpolate theme tokens make next-swc's styled-jsx
// transform hang indefinitely on this project: `next dev` sat at "Compiling /ai …" at
// 100% CPU forever and never served the route. Reproduced in isolation — the same file
// transforms in 12ms with `styledJsx: false` and never finishes with it on, and swapping
// a single `${T.faint}` for its literal hex made the hang disappear.
//
// styled-jsx bought nothing here anyway: every one of these blocks was already `global`,
// so there was no scoping to gain, only a transform to get stuck in.
//
// The prop is `rules`, NOT `css`. next.config.ts sets `compiler.styledComponents`, whose
// SWC transform claims any JSX `css` prop as the styled-components css prop: it lifted
// this CSS into a styled-components sheet and rewrote every selector to `.cKCzmb .ai-prose`
// — scoped to a generated class no element of ours carried, so the whole stylesheet
// silently did nothing. Do not rename this back.
export default function GlobalStyle({ rules }: { rules: string }) {
  return <style dangerouslySetInnerHTML={{ __html: rules }} />;
}
