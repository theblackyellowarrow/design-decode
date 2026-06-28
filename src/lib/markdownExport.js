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

export function exportFullSession({ results, methods, imageName, context, selected }) {
  const ctx = sanitiseContext(context);
  const date = new Date().toISOString().split('T')[0];
  const contextLine = ctx ? `\n**Context:** ${ctx}` : '';
  const sections = selected.map((key) => {
    const method = methods.find((m) => m.key === key);
    const text = results[key];
    if (!text) return null;
    const name = method?.name || key;
    const note = method?.inferential
      ? '\n*Note: This lens can exceed visible evidence. Treat unsupported claims as inference.*\n'
      : '';
    return `## ${name}${note}\n\n${text}\n\n---`;
  }).filter(Boolean);

  if (!sections.length) return;

  const md = [
    `# Design Decode — Full Session`,
    '',
    `**Image:** ${imageName}`,
    `**Date:** ${date}${contextLine}`,
    '',
    '---',
    '',
    ...sections
  ].join('\n');
  downloadMarkdown(md, 'design-decode-session.md');
}
