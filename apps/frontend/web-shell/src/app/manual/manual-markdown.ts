import { Marked } from 'marked';

export type ManualTocEntry = {
  id: string;
  label: string;
};

export type ParsedManual = {
  html: string;
  toc: ManualTocEntry[];
};

// Los títulos de sección del manual siguen el patrón "## N. Texto" (§0..§10).
// Se usa ese número para generar anchors estables (#s0..#s10), igual que en
// el Artifact de Claude que esta página reemplaza.
const SECTION_HEADING = /^(\d+)\.\s+(.+)$/;

export function parseManualMarkdown(markdown: string): ParsedManual {
  const toc: ManualTocEntry[] = [];
  const marked = new Marked();

  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens);
        const match = depth === 2 ? SECTION_HEADING.exec(text.trim()) : null;
        const id = match ? `s${match[1]}` : undefined;

        if (match) {
          toc.push({ id: `s${match[1]}`, label: `${match[1]}. ${match[2]}` });
        }

        return id
          ? `<h${depth} id="${id}">${html}</h${depth}>\n`
          : `<h${depth}>${html}</h${depth}>\n`;
      },
    },
  });

  const html = marked.parse(markdown) as string;
  return { html, toc };
}
