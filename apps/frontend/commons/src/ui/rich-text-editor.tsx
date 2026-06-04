'use client';

import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, Node, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Eye,
  FileCode2,
  Highlighter,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Redo2,
  SeparatorHorizontal,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import * as React from 'react';
import { cn } from '../utils/cn';
import { sanitizeDocumentHtml } from '../utils/sanitize';
import { Button } from './button';

/* ─── Extensiones custom ───────────────────────────────────────────────── */

// Tamaño de fuente sobre el mark textStyle (Color también opera sobre él).
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { fontSize?: string | null }) =>
          attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
      },
    };
  },
});

// Salto de página: nodo atómico que en impresión fuerza `break-after: page`.
const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },
  renderHTML() {
    return [
      'div',
      { 'data-page-break': 'true', class: 'clm-page-break', contenteditable: 'false' },
    ];
  },
});

function buildExtensions(compact: boolean, placeholder: string) {
  const base = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    FontSize,
    Color,
    Highlight.configure({ multicolor: false }),
    Link.configure({ openOnClick: false, autolink: true }),
    Image.configure({ allowBase64: true, inline: false }),
    Placeholder.configure({ placeholder }),
  ];
  if (compact) return base;
  return [
    ...base,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    PageBreak,
  ];
}

/* ─── Toolbar ──────────────────────────────────────────────────────────── */

function Divider() {
  return <span className="mx-0.5 h-6 w-[2px] shrink-0 bg-border" aria-hidden />;
}

interface TBtnProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function TBtn({ label, onClick, active, disabled, children }: TBtnProps) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'neutral'}
      size="sm"
      className={cn('h-8 w-8 p-0', active && 'translate-x-[2px] translate-y-[2px] shadow-none')}
      aria-label={label}
      aria-pressed={active}
      title={label}
      // Evita perder selección del editor al hacer clic en el botón.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

const SELECT_CLS =
  'h-8 rounded-base border-2 border-border bg-background px-1.5 text-xs font-base shadow-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '32px'];

/* ─── Componente ───────────────────────────────────────────────────────── */

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
  /** Versión reducida (sin headings/tablas/salto de página) para header/footer. */
  compact?: boolean;
  /** Permite alternar a vista de código HTML. Default: !compact. */
  allowHtmlSource?: boolean;
  className?: string;
}

type Mode = 'edit' | 'html' | 'preview';

/**
 * Editor de texto enriquecido (TipTap / ProseMirror). Entra y sale HTML, por lo
 * que es un reemplazo directo del editor anterior. Compartido vía
 * `@aletheia/frontend-commons`; lo usan el editor de plantillas y el de contrato.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: editor TipTap con varios modos (edit/html/preview) y manejadores de formato
export function RichTextEditor({
  value,
  onChange,
  ariaLabel = 'Editor de contenido',
  compact = false,
  allowHtmlSource,
  className,
}: RichTextEditorProps) {
  const showHtml = allowHtmlSource ?? !compact;
  const [mode, setMode] = React.useState<Mode>('edit');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const placeholder = compact
    ? 'Escribe el encabezado/pie…'
    : 'Escribe el contenido del documento…';

  const editor = useEditor({
    extensions: buildExtensions(compact, placeholder),
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose-clm clm-editor max-w-none focus:outline-none',
          compact ? 'min-h-[120px] px-3 py-2 text-sm' : 'min-h-[260px] px-4 py-3 text-sm',
        ),
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel,
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  // Sincroniza contenido externo (p. ej. al cargar una plantilla) sin pisar lo
  // que el usuario escribe.
  React.useEffect(() => {
    if (!editor || mode !== 'edit') return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor, mode]);

  const onPickImage = () => fileRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/') || !editor) return;
    const reader = new FileReader();
    reader.onload = () =>
      editor
        .chain()
        .focus()
        .setImage({ src: String(reader.result) })
        .run();
    reader.readAsDataURL(file);
  };

  const onImageUrl = () => {
    if (!editor) return;
    const url = window.prompt('URL de la imagen:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const onLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL del enlace (vacío para quitar):', prev ?? 'https://');
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    if (url === '') chain.unsetLink().run();
    else chain.setLink({ href: url }).run();
  };

  const headingValue = editor?.isActive('heading', { level: 1 })
    ? '1'
    : editor?.isActive('heading', { level: 2 })
      ? '2'
      : editor?.isActive('heading', { level: 3 })
        ? '3'
        : 'p';

  return (
    <div
      className={cn('rounded-base border-2 border-border bg-background shadow-shadow', className)}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-border p-2">
        {mode === 'edit' && editor && (
          <>
            <TBtn label="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
              <Undo2 className="h-4 w-4" />
            </TBtn>
            <TBtn label="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
              <Redo2 className="h-4 w-4" />
            </TBtn>
            <Divider />

            <TBtn
              label="Negrita"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </TBtn>
            <TBtn
              label="Itálica"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </TBtn>
            <TBtn
              label="Subrayado"
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </TBtn>
            <TBtn
              label="Tachado"
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-4 w-4" />
            </TBtn>

            {/* Color de texto + resaltado */}
            <label
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-base border-2 border-border bg-background shadow-shadow"
              title="Color de texto"
            >
              <input
                type="color"
                className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                aria-label="Color de texto"
              />
            </label>
            <TBtn
              label="Resaltado"
              active={editor.isActive('highlight')}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="h-4 w-4" />
            </TBtn>
            <Divider />

            {!compact && (
              <select
                className={SELECT_CLS}
                value={headingValue}
                aria-label="Estilo de párrafo"
                onChange={(e) => {
                  const v = e.target.value;
                  const chain = editor.chain().focus();
                  if (v === 'p') chain.setParagraph().run();
                  else chain.toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
                }}
              >
                <option value="p">Párrafo</option>
                <option value="1">Título 1</option>
                <option value="2">Título 2</option>
                <option value="3">Título 3</option>
              </select>
            )}
            <select
              className={SELECT_CLS}
              defaultValue=""
              aria-label="Tamaño de fuente"
              onChange={(e) => {
                const v = e.target.value;
                if (v) editor.chain().focus().setMark('textStyle', { fontSize: v }).run();
              }}
            >
              <option value="">Tamaño</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('px', '')}
                </option>
              ))}
            </select>
            <Divider />

            <TBtn
              label="Alinear a la izquierda"
              active={editor.isActive({ textAlign: 'left' })}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-4 w-4" />
            </TBtn>
            <TBtn
              label="Centrar"
              active={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-4 w-4" />
            </TBtn>
            <TBtn
              label="Alinear a la derecha"
              active={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="h-4 w-4" />
            </TBtn>
            <TBtn
              label="Justificar"
              active={editor.isActive({ textAlign: 'justify' })}
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            >
              <AlignJustify className="h-4 w-4" />
            </TBtn>

            {!compact && (
              <>
                <Divider />
                <TBtn
                  label="Lista con viñetas"
                  active={editor.isActive('bulletList')}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  <List className="h-4 w-4" />
                </TBtn>
                <TBtn
                  label="Lista numerada"
                  active={editor.isActive('orderedList')}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="h-4 w-4" />
                </TBtn>
                <TBtn
                  label="Cita"
                  active={editor.isActive('blockquote')}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                  <Quote className="h-4 w-4" />
                </TBtn>
                <TBtn
                  label="Bloque de código"
                  active={editor.isActive('codeBlock')}
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                  <Code2 className="h-4 w-4" />
                </TBtn>
              </>
            )}
            <Divider />

            <TBtn label="Enlace" active={editor.isActive('link')} onClick={onLink}>
              <Link2 className="h-4 w-4" />
            </TBtn>
            <TBtn label="Insertar imagen (archivo)" onClick={onPickImage}>
              <ImagePlus className="h-4 w-4" />
            </TBtn>
            <TBtn label="Insertar imagen (URL)" onClick={onImageUrl}>
              <ImageIcon className="h-4 w-4" />
            </TBtn>

            {!compact && (
              <>
                <TBtn
                  label="Insertar tabla"
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run()
                  }
                >
                  <TableIcon className="h-4 w-4" />
                </TBtn>
                <TBtn
                  label="Línea horizontal"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                  <Minus className="h-4 w-4" />
                </TBtn>
                <TBtn
                  label="Salto de página"
                  onClick={() =>
                    editor.chain().focus().insertContent('<div data-page-break="true"></div>').run()
                  }
                >
                  <SeparatorHorizontal className="h-4 w-4" />
                </TBtn>
              </>
            )}
            <TBtn
              label="Limpiar formato"
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              <Eraser className="h-4 w-4" />
            </TBtn>
          </>
        )}

        {/* Selector de modo (derecha) */}
        <div className="ml-auto flex items-center gap-1">
          <TBtn label="Editar" active={mode === 'edit'} onClick={() => setMode('edit')}>
            <Pencil className="h-4 w-4" />
          </TBtn>
          {showHtml && (
            <TBtn label="Código HTML" active={mode === 'html'} onClick={() => setMode('html')}>
              <FileCode2 className="h-4 w-4" />
            </TBtn>
          )}
          <TBtn label="Vista previa" active={mode === 'preview'} onClick={() => setMode('preview')}>
            <Eye className="h-4 w-4" />
          </TBtn>
        </div>
      </div>

      {/* Cuerpo */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <div className={mode === 'edit' ? '' : 'hidden'}>
        <EditorContent editor={editor} />
      </div>

      {mode === 'html' && (
        <textarea
          value={value}
          aria-label="Código HTML"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full resize-y bg-background p-4 font-sans text-xs outline-none',
            compact ? 'min-h-[120px]' : 'min-h-[260px]',
          )}
        />
      )}

      {mode === 'preview' && (
        <div
          className={cn(
            'prose-clm max-w-none px-4 py-3 text-sm',
            compact ? 'min-h-[120px]' : 'min-h-[260px]',
          )}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML saneado con DOMPurify (sanitizeDocumentHtml).
          dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(value) }}
        />
      )}
    </div>
  );
}
