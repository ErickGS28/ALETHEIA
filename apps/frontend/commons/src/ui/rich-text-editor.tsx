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
  Braces,
  ChevronDown,
  Code2,
  Eraser,
  Eye,
  FileCode2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
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

/* ─── Variables de contrato ────────────────────────────────────────────── */

export interface ContractVariable {
  id: string;
  label: string;
}

/** Catálogo por defecto de variables insertables en plantillas/contratos. */
export const CONTRACT_VARIABLES: ContractVariable[] = [
  { id: 'contrato.folio', label: 'Folio del contrato' },
  { id: 'contrato.tipo', label: 'Tipo de contrato' },
  { id: 'contrato.fecha', label: 'Fecha del contrato' },
  { id: 'proveedor.nombre', label: 'Nombre del proveedor' },
  { id: 'proveedor.rfc', label: 'RFC del proveedor' },
  { id: 'proveedor.domicilio', label: 'Domicilio del proveedor' },
  { id: 'sociedad.nombre', label: 'Razón social (sociedad)' },
  { id: 'apoderado.nombre', label: 'Apoderado legal' },
  { id: 'monto.total', label: 'Monto total' },
  { id: 'vigencia.inicio', label: 'Inicio de vigencia' },
  { id: 'vigencia.fin', label: 'Fin de vigencia' },
];

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

// Variable de contrato: nodo inline atómico que se renderiza como píldora {{id}}.
const Variable = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { id: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },
  renderHTML({ node }) {
    const id = String(node.attrs.id ?? '');
    return [
      'span',
      { 'data-variable': id, class: 'clm-variable', contenteditable: 'false' },
      `{{${id}}}`,
    ];
  },
  renderText({ node }) {
    return `{{${node.attrs.id}}}`;
  },
});

function buildExtensions(compact: boolean, placeholder: string) {
  const base = [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    FontSize,
    Color,
    Highlight.configure({ multicolor: false }),
    Link.configure({ openOnClick: false, autolink: true }),
    Image.configure({ allowBase64: true, inline: false }),
    Variable,
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

/* ─── Toolbar primitives ───────────────────────────────────────────────── */

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-border/25" aria-hidden />;
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
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-sm border-2 border-transparent text-foreground transition-colors',
        'hover:bg-secondary-background disabled:pointer-events-none disabled:opacity-40',
        active && 'border-border bg-main text-main-foreground',
      )}
    >
      {children}
    </button>
  );
}

const SELECT_CLS =
  'h-8 rounded-sm border-2 border-border bg-background px-2 text-xs font-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

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
  /** Variables insertables. Si se omite (y no es compact), usa CONTRACT_VARIABLES. */
  variables?: ContractVariable[];
  className?: string;
}

type Mode = 'edit' | 'html' | 'preview';
type PopKind = 'link' | 'image' | null;

/**
 * Editor de texto enriquecido (TipTap / ProseMirror) estilo documento.
 * Entra y sale HTML. Compartido vía `@aletheia/frontend-commons`; lo usan el
 * editor de plantillas y el de contrato.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: editor TipTap con modos, formato y variables
export function RichTextEditor({
  value,
  onChange,
  ariaLabel = 'Editor de contenido',
  compact = false,
  allowHtmlSource,
  variables,
  className,
}: RichTextEditorProps) {
  const showHtml = allowHtmlSource ?? !compact;
  const vars = variables ?? (compact ? [] : CONTRACT_VARIABLES);
  const [mode, setMode] = React.useState<Mode>('edit');
  const [pop, setPop] = React.useState<PopKind>(null);
  const [popValue, setPopValue] = React.useState('');
  const [varsOpen, setVarsOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const popInputRef = React.useRef<HTMLInputElement>(null);

  // Enfoca el input del popover (enlace/imagen) al abrirse.
  React.useEffect(() => {
    if (pop) popInputRef.current?.focus();
  }, [pop]);

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
          compact ? 'min-h-[120px] px-3 py-2 text-sm' : 'min-h-[55vh] px-8 py-10 text-sm sm:px-12',
        ),
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel,
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  React.useEffect(() => {
    if (!editor || mode !== 'edit') return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, false);
  }, [value, editor, mode]);

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

  // Popover inline (reemplaza window.prompt) para enlace e imagen por URL.
  const openPop = (kind: Exclude<PopKind, null>) => {
    if (!editor) return;
    setPop(kind);
    setPopValue(kind === 'link' ? ((editor.getAttributes('link').href as string) ?? '') : '');
  };
  const applyPop = () => {
    if (!editor || !pop) return;
    const url = popValue.trim();
    if (pop === 'link') {
      const chain = editor.chain().focus().extendMarkRange('link');
      url ? chain.setLink({ href: url }).run() : chain.unsetLink().run();
    } else if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setPop(null);
    setPopValue('');
  };

  const insertVariable = (id: string) => {
    editor?.chain().focus().insertContent({ type: 'variable', attrs: { id } }).run();
    setVarsOpen(false);
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
      className={cn(
        'overflow-hidden rounded-base border-2 border-border bg-background shadow-shadow',
        className,
      )}
    >
      {/* Toolbar (sticky) */}
      <div className="sticky top-0 z-20 border-b-2 border-border bg-background">
        <div className="flex flex-wrap items-center gap-0.5 p-2">
          {mode === 'edit' && editor && (
            <>
              <TBtn label="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
                <Undo2 className="h-4 w-4" />
              </TBtn>
              <TBtn label="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
                <Redo2 className="h-4 w-4" />
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
                value={(editor.getAttributes('textStyle').fontSize as string) || ''}
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
              <label
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border-2 border-transparent hover:bg-secondary-background"
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
                </>
              )}
              <Divider />

              <TBtn label="Enlace" active={editor.isActive('link')} onClick={() => openPop('link')}>
                <Link2 className="h-4 w-4" />
              </TBtn>
              <TBtn label="Insertar imagen (archivo)" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="h-4 w-4" />
              </TBtn>

              {!compact && vars.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setVarsOpen((v) => !v)}
                    className="flex h-8 items-center gap-1.5 rounded-sm border-2 border-border bg-accent px-2 text-xs font-base text-accent-foreground shadow-sm"
                    title="Insertar variable"
                  >
                    <Braces className="h-3.5 w-3.5" /> Variable <ChevronDown className="h-3 w-3" />
                  </button>
                  {varsOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-default"
                        aria-hidden
                        onClick={() => setVarsOpen(false)}
                      />
                      <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-base border-2 border-border bg-background py-1 shadow-lg">
                        {vars.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertVariable(v.id)}
                            className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-secondary-background"
                          >
                            <span className="text-sm">{v.label}</span>
                            <span className="font-sans text-xs text-muted-foreground">{`{{${v.id}}}`}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {!compact && (
                <div className="relative">
                  <TBtn label="Más opciones" onClick={() => setMoreOpen((v) => !v)}>
                    <MoreHorizontal className="h-4 w-4" />
                  </TBtn>
                  {moreOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-default"
                        aria-hidden
                        onClick={() => setMoreOpen(false)}
                      />
                      <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-base border-2 border-border bg-background py-1 shadow-lg">
                        {[
                          {
                            label: 'Cita',
                            icon: <Quote className="h-4 w-4" />,
                            run: () => editor.chain().focus().toggleBlockquote().run(),
                          },
                          {
                            label: 'Bloque de código',
                            icon: <Code2 className="h-4 w-4" />,
                            run: () => editor.chain().focus().toggleCodeBlock().run(),
                          },
                          {
                            label: 'Insertar tabla',
                            icon: <TableIcon className="h-4 w-4" />,
                            run: () =>
                              editor
                                .chain()
                                .focus()
                                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                                .run(),
                          },
                          {
                            label: 'Línea horizontal',
                            icon: <Minus className="h-4 w-4" />,
                            run: () => editor.chain().focus().setHorizontalRule().run(),
                          },
                          {
                            label: 'Salto de página',
                            icon: <SeparatorHorizontal className="h-4 w-4" />,
                            run: () =>
                              editor
                                .chain()
                                .focus()
                                .insertContent('<div data-page-break="true"></div>')
                                .run(),
                          },
                          {
                            label: 'Limpiar formato',
                            icon: <Eraser className="h-4 w-4" />,
                            run: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
                          },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              item.run();
                              setMoreOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-secondary-background"
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Selector de modo (derecha) */}
          <div className="ml-auto flex items-center gap-0.5">
            <TBtn label="Editar" active={mode === 'edit'} onClick={() => setMode('edit')}>
              <Pencil className="h-4 w-4" />
            </TBtn>
            {showHtml && (
              <TBtn label="Código HTML" active={mode === 'html'} onClick={() => setMode('html')}>
                <FileCode2 className="h-4 w-4" />
              </TBtn>
            )}
            <TBtn
              label="Vista previa"
              active={mode === 'preview'}
              onClick={() => setMode('preview')}
            >
              <Eye className="h-4 w-4" />
            </TBtn>
          </div>
        </div>

        {/* Popover inline para enlace / imagen */}
        {pop && (
          <div className="flex items-center gap-2 border-t-2 border-border bg-secondary-background px-2 py-2">
            <input
              ref={popInputRef}
              value={popValue}
              onChange={(e) => setPopValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyPop();
                if (e.key === 'Escape') setPop(null);
              }}
              placeholder={pop === 'link' ? 'https://… (vacío para quitar)' : 'URL de la imagen'}
              className="h-8 flex-1 rounded-sm border-2 border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            />
            <Button type="button" size="sm" onClick={applyPop}>
              Aplicar
            </Button>
            <Button type="button" size="sm" variant="neutral" onClick={() => setPop(null)}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Cuerpo */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <div
        className={
          mode === 'edit'
            ? compact
              ? ''
              : 'bg-secondary-background px-3 py-4 sm:px-6 sm:py-6'
            : 'hidden'
        }
      >
        <div
          className={
            compact
              ? ''
              : 'mx-auto max-w-[820px] rounded-sm border-2 border-border bg-background shadow-sm'
          }
        >
          <EditorContent editor={editor} />
        </div>
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
