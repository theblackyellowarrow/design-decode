function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitiseContext(context) {
  return String(context || '')
    .slice(0, 1200)
    .replace(/[<>]/g, '')
    .trim();
}

export function exportSingleLens({ methodName, text, imageName, context, inferential }) {
  const ctx = sanitiseContext(context);
  const note = inferential ? '\n*Note: This lens can exceed visible evidence. Treat unsupported claims as inference.*\n' : '';
  const contextLine = ctx ? `\n**Context:** ${ctx}` : '';
  const md = [
    `# ${methodName}`,
    '',
    `**Design Decode** — critical image reading`,
    `**Image:** ${imageName}`,
    `**Lens:** ${methodName}${contextLine}`,
    note,
    '---',
    '',
    text,
    ''
  ].join('\n');
  downloadMarkdown(md, `design-decode-${methodName.toLowerCase().replace(/\s+/g, '-')}.md`);
}
