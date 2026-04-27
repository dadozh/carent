"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronRight, Copy, CopyPlus, Eye, GripHorizontal, Minus, Plus, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createDefaultContractTemplateDocument,
  resolveTemplateText,
  type ContractTemplateBlock,
  type ContractTemplateDocument,
} from "@/lib/contract-template-content";
import { useContractTemplates } from "@/lib/use-contract-templates";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n-config";
import { useI18n } from "@/lib/i18n";

// PDF coordinate constants — must stay in sync with contract-pdf.ts
const PDF_PAGE_W = 595.28;
const PDF_PAGE_H = 841.89;
const PDF_MARGIN = 18;
const USABLE_W = PDF_PAGE_W - 2 * PDF_MARGIN;
const USABLE_H = PDF_PAGE_H - 2 * PDF_MARGIN;
const MARGIN_L_PCT = (PDF_MARGIN / PDF_PAGE_W) * 100;
const MARGIN_T_PCT = (PDF_MARGIN / PDF_PAGE_H) * 100;
const USABLE_W_PCT = (USABLE_W / PDF_PAGE_W) * 100;
const USABLE_H_PCT = (USABLE_H / PDF_PAGE_H) * 100;
const CANVAS_W_PX = 1440;
const PT_TO_PX = CANVAS_W_PX / PDF_PAGE_W;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function blockLeft(x: number) { return MARGIN_L_PCT + x * USABLE_W_PCT / 100; }
function blockTop(y: number)  { return MARGIN_T_PCT + y * USABLE_H_PCT / 100; }
function blockWidth(w: number) { return w * USABLE_W_PCT / 100; }
function blockMinH(h: number, pageH: number) { return (h / pageH) * USABLE_H_PCT; }
function pxToTemplateX(px: number, rectW: number) { return (px / rectW) * (100 / USABLE_W_PCT) * 100; }
function pxToTemplateY(px: number, rectH: number) { return (px / rectH) * (100 / USABLE_H_PCT) * 100; }

function createNewBlock(index: number): ContractTemplateBlock {
  return {
    id: `block-${Date.now()}-${index}`,
    text: "New text",
    x: 8, y: 8 + index * 4,
    width: 36, height: 14,
    fontSize: 9, align: "left", bold: false,
  };
}

export function ContractEditorPage({ language }: { language: Locale }) {
  const { t } = useI18n();
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { templates, placeholders, loading, updateTemplateDraft, publishTemplate } = useContractTemplates();

  const selectedTemplate = useMemo(
    () => templates.find((tmpl) => tmpl.language === language) ?? null,
    [templates, language]
  );

  const [editorName, setEditorName] = useState("");
  const [draft, setDraft] = useState<ContractTemplateDocument | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<Locale | "">("");
  const [duplicating, setDuplicating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    blockId: string; pointerX: number; pointerY: number; blockX: number; blockY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    blockId: string; pointerX: number; blockWidth: number; blockX: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedTemplate) return;
    setEditorName(selectedTemplate.name);
    setDraft(selectedTemplate.draft);
    setSelectedBlockId(selectedTemplate.draft.blocks[0]?.id ?? null);
    setEditingBlockId(null);
    setMessage(null);
  }, [selectedTemplate]);

  useEffect(() => {
    if (!dragState) return;
    function handlePointerMove(event: PointerEvent) {
      if (!canvasRef.current || !draft || !dragState) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = pxToTemplateX(event.clientX - dragState.pointerX, rect.width);
      const dy = pxToTemplateY(event.clientY - dragState.pointerY, rect.height);
      setDraft({
        ...draft,
        blocks: draft.blocks.map((block) => block.id !== dragState.blockId ? block : {
          ...block,
          x: clamp(dragState.blockX + dx, 0, 100 - block.width),
          y: clamp(dragState.blockY + dy, 0, 100 - (block.height / draft.pageHeight) * 100),
        }),
      });
    }
    function handlePointerUp() { setDragState(null); }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, draft]);

  useEffect(() => {
    if (!resizeState) return;
    function handlePointerMove(event: PointerEvent) {
      if (!canvasRef.current || !draft || !resizeState) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dw = pxToTemplateX(event.clientX - resizeState.pointerX, rect.width);
      const nextWidth = clamp(resizeState.blockWidth + dw, 10, 100 - resizeState.blockX);
      setDraft({
        ...draft,
        blocks: draft.blocks.map((block) =>
          block.id === resizeState.blockId ? { ...block, width: nextWidth } : block
        ),
      });
    }
    function handlePointerUp() { setResizeState(null); }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizeState, draft]);

  const selectedBlock = draft?.blocks.find((b) => b.id === selectedBlockId) ?? null;
  const placeholderSamples = useMemo(
    () => Object.fromEntries(placeholders.map((p) => [p.token, p.sample])),
    [placeholders]
  );

  function updateBlock(blockId: string, patch: Partial<ContractTemplateBlock>) {
    if (!draft) return;
    setDraft({ ...draft, blocks: draft.blocks.map((b) => b.id === blockId ? { ...b, ...patch } : b) });
  }

  function handleAddBlock() {
    if (!draft) return;
    const block = createNewBlock(draft.blocks.length + 1);
    setDraft({ ...draft, blocks: [...draft.blocks, block] });
    setSelectedBlockId(block.id);
  }

  function handleDeleteBlock() {
    if (!draft || !selectedBlock) return;
    const blocks = draft.blocks.filter((b) => b.id !== selectedBlock.id);
    setDraft({ ...draft, blocks });
    setSelectedBlockId(blocks[0]?.id ?? null);
  }

  async function handleSave() {
    if (!draft || !selectedTemplate) return;
    setSaving(true); setMessage(null);
    try {
      const tmpl = await updateTemplateDraft(language, { name: editorName, draft });
      setEditorName(tmpl.name);
      setDraft(tmpl.draft);
      setMessage(t("settings.contracts.saved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("settings.contracts.saveError"));
    } finally { setSaving(false); }
  }

  async function handlePreview() {
    if (!draft) return;
    setPreviewing(true);
    try {
      const response = await fetch(`/api/contract-templates/${language}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editorName, draft }),
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setMessage(data.error ?? t("settings.contracts.previewError"));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setMessage(t("settings.contracts.previewError"));
    } finally { setPreviewing(false); }
  }

  async function handlePublish() {
    if (!draft || !selectedTemplate) return;
    setPublishing(true); setMessage(null);
    try {
      await updateTemplateDraft(language, { name: editorName, draft });
      await publishTemplate(language);
      setMessage(t("settings.contracts.published"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("settings.contracts.publishError"));
    } finally { setPublishing(false); }
  }

  async function handleDuplicate() {
    if (!draft || !duplicateTarget) return;
    setDuplicating(true); setMessage(null);
    try {
      await updateTemplateDraft(duplicateTarget, { name: editorName, draft });
      router.push(`/settings/contracts/${duplicateTarget}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("settings.contracts.duplicateError"));
      setDuplicating(false);
    }
  }

  function handleResetToDefaults() {
    if (!draft) return;
    if (!window.confirm(t("settings.contracts.resetConfirm"))) return;
    const defaultBlocks = createDefaultContractTemplateDocument(language).blocks;
    const defaultTextById = Object.fromEntries(defaultBlocks.map((b) => [b.id, b.text]));
    setDraft({
      ...draft,
      blocks: draft.blocks.map((b) =>
        b.id in defaultTextById ? { ...b, text: defaultTextById[b.id]! } : b
      ),
    });
    setEditingBlockId(null);
    setMessage(t("settings.contracts.resetDone"));
  }

  const busy = saving || publishing || previewing || duplicating;
  const otherTemplates = templates.filter((tmpl) => tmpl.language !== language);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/settings/contracts" className="text-muted-foreground hover:text-foreground">
            {t("settings.contracts.title")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{LOCALE_LABELS[language]}</span>
          {selectedTemplate && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${selectedTemplate.published ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
              {selectedTemplate.published ? t("settings.contracts.publishedStatus") : t("settings.contracts.draftOnly")}
            </span>
          )}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {otherTemplates.length > 0 && draft && (
            <div className="flex items-center gap-1">
              <select
                value={duplicateTarget}
                onChange={(e) => setDuplicateTarget(e.target.value as Locale | "")}
                disabled={busy}
                className="rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">{t("settings.contracts.duplicateTo")}</option>
                {otherTemplates.map((tmpl) => (
                  <option key={tmpl.language} value={tmpl.language}>{LOCALE_LABELS[tmpl.language]}</option>
                ))}
              </select>
              {duplicateTarget && (
                <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={busy}>
                  <CopyPlus className="mr-1.5 h-3.5 w-3.5" />
                  {duplicating ? t("common.loading") : t("settings.contracts.duplicate")}
                </Button>
              )}
            </div>
          )}
          <Input
            value={editorName}
            onChange={(e) => setEditorName(e.target.value)}
            className="w-44"
            disabled={!draft}
          />
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={busy || !draft}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {previewing ? t("common.loading") : t("settings.contracts.preview")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={busy || !draft}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? t("common.loading") : t("common.save")}
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={busy || !draft}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {publishing ? t("common.loading") : t("settings.contracts.publish")}
          </Button>
        </div>
      </div>

      {/* Block toolbar + message */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleAddBlock} disabled={!draft}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("settings.contracts.addTextBlock")}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDeleteBlock} disabled={!selectedBlock}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("settings.contracts.removeSelected")}
        </Button>
        <Button variant="outline" size="sm" onClick={handleResetToDefaults} disabled={busy || !draft} className="ml-auto text-muted-foreground">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {t("settings.contracts.resetToDefaults")}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>

      {/* Editor grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !draft ? (
        <p className="text-sm text-muted-foreground">{t("settings.contracts.draftOnly")}</p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_280px]">
          {/* Canvas */}
          <div className="overflow-auto rounded-lg bg-slate-100 p-6 shadow-inner">
            <div style={{ width: `${CANVAS_W_PX}px` }}>
              <div
                ref={canvasRef}
                className="relative w-full bg-white shadow-xl"
                style={{ aspectRatio: `${PDF_PAGE_W} / ${PDF_PAGE_H}` }}
              >
                <div
                  className="pointer-events-none absolute border border-dashed border-slate-300/70"
                  style={{ left: `${MARGIN_L_PCT}%`, top: `${MARGIN_T_PCT}%`, width: `${USABLE_W_PCT}%`, height: `${USABLE_H_PCT}%` }}
                />
                {draft.blocks.map((block, index) => {
                  const isSelected = block.id === selectedBlockId;
                  const isEditing = block.id === editingBlockId;
                  const textStyle = {
                    fontSize: `${block.fontSize * PT_TO_PX}px`,
                    fontWeight: block.bold ? 700 : 400,
                    textAlign: block.align,
                    lineHeight: 1.3,
                  } as const;
                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`absolute overflow-hidden rounded border text-left ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-dashed border-slate-300"} bg-white/85`}
                      style={{
                        left: `${blockLeft(block.x)}%`,
                        top: `${blockTop(block.y)}%`,
                        width: `${blockWidth(block.width)}%`,
                        minHeight: `${blockMinH(block.height, draft.pageHeight)}%`,
                      }}
                    >
                      {isEditing ? (
                        <div
                          className="flex items-center gap-0.5 border-b bg-slate-50 px-1 py-0.5"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <ToolbarButton active={block.bold} onMouseDown={() => updateBlock(block.id, { bold: !block.bold })}>
                            <Bold className="h-3 w-3" />
                          </ToolbarButton>
                          <ToolbarButton active={block.align === "left"} onMouseDown={() => updateBlock(block.id, { align: "left" })}>
                            <AlignLeft className="h-3 w-3" />
                          </ToolbarButton>
                          <ToolbarButton active={block.align === "center"} onMouseDown={() => updateBlock(block.id, { align: "center" })}>
                            <AlignCenter className="h-3 w-3" />
                          </ToolbarButton>
                          <ToolbarButton active={block.align === "right"} onMouseDown={() => updateBlock(block.id, { align: "right" })}>
                            <AlignRight className="h-3 w-3" />
                          </ToolbarButton>
                          <span className="mx-0.5 h-3 w-px bg-slate-300" />
                          <ToolbarButton onMouseDown={() => updateBlock(block.id, { fontSize: clamp(block.fontSize - 1, 7, 22) })}>
                            <Minus className="h-3 w-3" />
                          </ToolbarButton>
                          <span className="w-5 text-center text-[10px] tabular-nums">{block.fontSize}</span>
                          <ToolbarButton onMouseDown={() => updateBlock(block.id, { fontSize: clamp(block.fontSize + 1, 7, 22) })}>
                            <Plus className="h-3 w-3" />
                          </ToolbarButton>
                        </div>
                      ) : (
                        <div
                          className="flex cursor-grab items-center gap-1 border-b bg-slate-50 px-2 py-1 text-[10px] text-slate-500"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            setDragState({ blockId: block.id, pointerX: event.clientX, pointerY: event.clientY, blockX: block.x, blockY: block.y });
                          }}
                        >
                          <GripHorizontal className="h-3 w-3" />
                          <span>{t("settings.contracts.drag")}</span>
                        </div>
                      )}
                      {isEditing ? (
                        <textarea
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          value={block.text}
                          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                          onBlur={() => setEditingBlockId(null)}
                          onKeyDown={(e) => { if (e.key === "Escape") setEditingBlockId(null); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full resize-none bg-transparent px-2 py-1 outline-none"
                          style={{ ...textStyle, minHeight: `${blockMinH(block.height, draft.pageHeight)}%` }}
                        />
                      ) : (
                        <div
                          className="px-2 py-1 whitespace-pre-wrap break-words text-slate-900"
                          style={textStyle}
                          onDoubleClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); setEditingBlockId(block.id); }}
                        >
                          {resolveTemplateText(block.text, placeholderSamples) || `${t("settings.contracts.block")} ${index + 1}`}
                        </div>
                      )}
                      {isSelected && !isEditing && (
                        <div
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-primary/10 hover:bg-primary/30"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setResizeState({ blockId: block.id, pointerX: event.clientX, blockWidth: block.width, blockX: block.x });
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.contracts.blockSettings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedBlock ? (
                  <p className="text-sm text-muted-foreground">{t("settings.contracts.noBlockSelected")}</p>
                ) : (
                  <>
                    <div className="grid gap-3 grid-cols-2">
                      <NumberField label={t("settings.contracts.x")} value={selectedBlock.x}
                        onChange={(v) => updateBlock(selectedBlock.id, { x: clamp(v, 0, 100 - selectedBlock.width) })} />
                      <NumberField label={t("settings.contracts.y")} value={selectedBlock.y}
                        onChange={(v) => updateBlock(selectedBlock.id, { y: clamp(v, 0, 100 - (selectedBlock.height / draft.pageHeight) * 100) })} />
                      <NumberField label={t("settings.contracts.width")} value={selectedBlock.width}
                        onChange={(v) => { const w = clamp(v, 10, 92); updateBlock(selectedBlock.id, { width: w, x: clamp(selectedBlock.x, 0, 100 - w) }); }} />
                      <NumberField label={t("settings.contracts.height")} value={selectedBlock.height}
                        onChange={(v) => { const h = clamp(v, 4, 140); updateBlock(selectedBlock.id, { height: h, y: clamp(selectedBlock.y, 0, 100 - (h / draft.pageHeight) * 100) }); }} />
                      <NumberField label={t("settings.contracts.fontSize")} value={selectedBlock.fontSize}
                        onChange={(v) => updateBlock(selectedBlock.id, { fontSize: clamp(v, 7, 22) })} />
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{t("settings.contracts.align")}</label>
                        <select
                          value={selectedBlock.align}
                          onChange={(e) => updateBlock(selectedBlock.id, { align: e.target.value as ContractTemplateBlock["align"] })}
                          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <option value="left">{t("settings.contracts.alignLeft")}</option>
                          <option value="center">{t("settings.contracts.alignCenter")}</option>
                          <option value="right">{t("settings.contracts.alignRight")}</option>
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(selectedBlock.bold)}
                        onChange={(e) => updateBlock(selectedBlock.id, { bold: e.target.checked })}
                        className="h-4 w-4" />
                      {t("settings.contracts.bold")}
                    </label>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.contracts.placeholders")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {placeholders.map((placeholder) => (
                  <button
                    key={placeholder.token}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left hover:bg-muted/40"
                    onClick={() => {
                      if (!selectedBlock) return;
                      updateBlock(selectedBlock.id, { text: `${selectedBlock.text}${selectedBlock.text ? "\n" : ""}${placeholder.token}` });
                    }}
                  >
                    <div>
                      <p className="font-mono text-xs">{placeholder.token}</p>
                      <p className="text-xs text-muted-foreground">{placeholder.label}</p>
                    </div>
                    <Copy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ children, active, onMouseDown }: { children: React.ReactNode; active?: boolean; onMouseDown: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      className={`rounded p-0.5 ${active ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
