'use client';

/**
 * Word-doc style transcript editor.
 *
 * Each paragraph corresponds to one transcription segment and carries its
 * `start`/`end` timestamps + `speakerId` as ProseMirror attributes. Users edit
 * freely — Tiptap handles split/merge/type/delete/paste/undo. On every change
 * we walk the doc and re-emit `segments[]` for the save pipeline.
 *
 * Audio sync:
 *  - **click anywhere** → seek to that paragraph's start
 *  - **playback highlight** → CSS class applied to the paragraph whose
 *    [start, end] contains the current audio time. We DON'T re-render the
 *    editor for this (would lose focus / break IME) — a side-effect ref
 *    updates the DOM class directly.
 *
 * Per-word timestamps from Whisper are *preserved* on the segment (used for
 * future fine-grained features) but not currently displayed.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import type { Editor, NodeViewProps } from '@tiptap/react';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import Placeholder from '@tiptap/extension-placeholder';
import { Check, Plus, UserPlus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MAX_SPEAKERS, createSpeaker } from '@/lib/speakers';
import type {
  AudioPlayerRef,
  Speaker,
  TranscriptionSegment,
  WordTiming,
} from '@/types';

interface TranscriptEditorProps {
  segments: TranscriptionSegment[];
  speakers: Speaker[];
  onSegmentsChange?: (segments: TranscriptionSegment[]) => void;
  onSpeakersChange?: (speakers: Speaker[]) => void;
  audioPlayerRef?: AudioPlayerRef | null;
  /** Live audio playback position (seconds). */
  currentTime?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Karaoke highlight extension                                        */
/* ------------------------------------------------------------------ */
/**
 * Highlights the currently-spoken word (and its paragraph) as the audio plays.
 *
 * Architecture: ProseMirror Decorations — a *visual overlay* the editor view
 * paints on top of the contentEditable. The editable document itself is never
 * modified, so playback highlight can't fight with text editing.
 *
 * Edit-resilience: each paragraph carries its `words[]` snapshot as an attr.
 * On each tick we walk the doc, find the paragraph containing `currentTime`,
 * find the word inside it whose [start, end] contains `currentTime`, and
 * locate that word's text in the *current* paragraph content (which the user
 * may have edited). If we can't find it, we fall back to highlighting the
 * whole paragraph — same as before words existed.
 */

const karaokeKey = new PluginKey<KaraokeState>('karaoke');

interface KaraokeState {
  currentTime: number;
  decorations: DecorationSet;
}

function normalizeForMatch(s: string) {
  // Strip leading/trailing punctuation so "Hola," still matches "Hola".
  return s.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function buildDecorations(doc: PMNode, currentTime: number): DecorationSet {
  const decos: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return true;

    const start = Number(node.attrs.start ?? 0);
    const end = Number(node.attrs.end ?? 0);
    // Quick reject: skip paragraphs outside the current time window.
    if (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      (currentTime < start || currentTime > end + 0.25)
    ) {
      return false;
    }

    // Paragraph-level highlight always when we're inside its window.
    decos.push(
      Decoration.node(pos, pos + node.nodeSize, { class: 'karaoke-paragraph' }),
    );

    // Word-level highlight (if we have word timings).
    const words = node.attrs.words as WordTiming[] | null;
    if (!Array.isArray(words) || words.length === 0) return false;

    const text = node.textContent;
    const lowerText = text.toLowerCase();
    let cursor = 0;
    for (const w of words) {
      const norm = normalizeForMatch(w.word);
      if (!norm) continue;
      const idx = lowerText.indexOf(norm, cursor);
      if (idx < 0) continue; // word edited away; skip silently
      const wordFrom = idx;
      const wordTo = idx + norm.length;
      cursor = wordTo;

      if (currentTime >= w.start && currentTime <= w.end + 0.05) {
        // ProseMirror positions: paragraph node opens at `pos`, content
        // starts at `pos + 1`. Offsets into textContent map 1:1 to PM
        // positions inside a paragraph of inline-only content.
        decos.push(
          Decoration.inline(pos + 1 + wordFrom, pos + 1 + wordTo, {
            class: 'karaoke-word',
          }),
        );
        break;
      }
    }
    return false;
  });

  return DecorationSet.create(doc, decos);
}

const KaraokeHighlight = Extension.create({
  name: 'karaokeHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin<KaraokeState>({
        key: karaokeKey,
        state: {
          init: () => ({ currentTime: 0, decorations: DecorationSet.empty }),
          apply: (tr, prev, _oldState, newState) => {
            const meta = tr.getMeta(karaokeKey) as { currentTime?: number } | undefined;
            const nextTime =
              typeof meta?.currentTime === 'number' ? meta.currentTime : prev.currentTime;
            // Recompute when time changes OR the doc was edited.
            if (meta || tr.docChanged) {
              return {
                currentTime: nextTime,
                decorations: buildDecorations(newState.doc, nextTime),
              };
            }
            // Otherwise: keep decorations but remap positions through any tx.
            return {
              currentTime: nextTime,
              decorations: prev.decorations.map(tr.mapping, tr.doc),
            };
          },
        },
        props: {
          decorations(state: EditorState) {
            return karaokeKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});

/* ------------------------------------------------------------------ */
/* Custom paragraph node                                              */
/* ------------------------------------------------------------------ */

interface ParagraphAttrs {
  speakerId: string | null;
  start: number;
  end: number;
  /** Word timings as a JSON blob, opaque to ProseMirror. */
  words: WordTiming[] | null;
}

const TranscriptParagraph = Node.create({
  name: 'paragraph',
  group: 'block',
  content: 'inline*',
  // Allow paragraphs to be split with Enter / joined with Backspace; default behavior.
  defining: true,

  addAttributes() {
    return {
      speakerId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-speaker-id'),
        renderHTML: (attrs) =>
          attrs.speakerId ? { 'data-speaker-id': attrs.speakerId } : {},
      },
      start: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-start')) || 0,
        renderHTML: (attrs) => ({ 'data-start': String(attrs.start ?? 0) }),
      },
      end: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-end')) || 0,
        renderHTML: (attrs) => ({ 'data-end': String(attrs.end ?? 0) }),
      },
      words: {
        default: null,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-words');
          if (!raw) return null;
          try { return JSON.parse(raw); } catch { return null; }
        },
        // Don't serialize the words array into the DOM — it's too large and we
        // don't need it on the rendered HTML. Kept in memory via attrs only.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'p' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpeakerParagraphView);
  },
});

/* ------------------------------------------------------------------ */
/* Node view: speaker chip + editable content                         */
/* ------------------------------------------------------------------ */

function SpeakerParagraphView({ node, updateAttributes, extension }: NodeViewProps) {
  const speakers = (extension.options.speakers ?? []) as Speaker[];
  const onSpeakersChange = extension.options.onSpeakersChange as
    | ((next: Speaker[]) => void)
    | undefined;
  const speakerId = node.attrs.speakerId as string | null;
  const speaker =
    speakers.find((s) => s.id === speakerId) ??
    speakers.find((s) => s.name.toLowerCase() === (speakerId ?? '').toLowerCase()) ??
    null;

  const assignSpeaker = (id: string | null) => {
    updateAttributes({ speakerId: id });
  };

  const addNewSpeaker = () => {
    if (!onSpeakersChange) return;
    if (speakers.length >= MAX_SPEAKERS) return;
    const fresh = createSpeaker(speakers);
    onSpeakersChange([...speakers, fresh]);
    assignSpeaker(fresh.id);
  };

  const canAddMore = !!onSpeakersChange && speakers.length < MAX_SPEAKERS;

  return (
    <NodeViewWrapper
      as="div"
      className="transcript-paragraph group relative flex items-start gap-4 rounded-md px-2 py-2.5 transition-colors"
    >
      {/* Speaker gutter — fixed width so paragraphs all align */}
      <div
        contentEditable={false}
        className="flex w-24 shrink-0 select-none justify-end pt-[5px]"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {speaker ? (
              <button
                type="button"
                className="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1"
                style={{ backgroundColor: speaker.color }}
                title="Change speaker"
              >
                {speaker.name}
              </button>
            ) : (
              <button
                type="button"
                title="Assign speaker"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400 transition-colors hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 focus:outline-none focus-visible:border-neutral-400 focus-visible:text-neutral-700"
              >
                <Plus className="size-2.5" strokeWidth={2.5} />
                Speaker
              </button>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="w-44 rounded-lg border-neutral-200 p-1 shadow-lg"
          >
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Assign speaker
            </div>
            {speakers.length === 0 && (
              <div className="px-2 py-2 text-[12px] text-neutral-500">
                No speakers configured
              </div>
            )}
            {speakers.map((s) => {
              const selected = speaker?.id === s.id;
              return (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    assignSpeaker(s.id);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px]"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/5"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 truncate text-neutral-800">
                    {s.name}
                  </span>
                  {selected && (
                    <Check className="size-3.5 text-neutral-500" />
                  )}
                </DropdownMenuItem>
              );
            })}
            {(speaker || canAddMore) && (
              <DropdownMenuSeparator className="my-1" />
            )}
            {canAddMore && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  addNewSpeaker();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-neutral-700"
              >
                <UserPlus className="size-3.5 text-neutral-500" />
                <span className="flex-1">New speaker</span>
                <span className="text-[10px] text-neutral-400">
                  {speakers.length}/{MAX_SPEAKERS}
                </span>
              </DropdownMenuItem>
            )}
            {speaker && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  assignSpeaker(null);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-neutral-600"
              >
                <X className="size-3.5" />
                <span className="flex-1">Clear speaker</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NodeViewContent
        as="div"
        className="flex-1 text-[15px] leading-[1.7] text-neutral-900 outline-none"
      />
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------------ */
/* Serialization helpers                                              */
/* ------------------------------------------------------------------ */

function segmentsToDoc(segments: TranscriptionSegment[]) {
  if (segments.length === 0) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { speakerId: null, start: 0, end: 0, words: null },
        },
      ],
    };
  }
  return {
    type: 'doc',
    content: segments.map((s) => ({
      type: 'paragraph',
      attrs: {
        speakerId: s.speakerId ?? null,
        start: s.start ?? 0,
        end: s.end ?? 0,
        words: s.words ?? null,
      },
      content: s.text ? [{ type: 'text', text: s.text }] : [],
    })),
  };
}

/**
 * Linearly interpolate word timestamps to match a possibly-edited text.
 *
 * If `originalWords` cover the original text well, we slide a cursor through
 * the new text and keep a word's timestamp if its text still appears at the
 * matching position. Otherwise we fall back to evenly distributing the
 * paragraph's [start, end] across the new text. Cheap heuristic — good enough
 * for free editing where most words survive intact.
 */
function rebuildWords(
  newText: string,
  segStart: number,
  segEnd: number,
  originalWords: WordTiming[] | null,
): WordTiming[] | null {
  const tokens = newText.match(/\S+/g);
  if (!tokens || tokens.length === 0) return null;

  // If we have original word timings, try to keep matches in order.
  if (originalWords && originalWords.length > 0) {
    const out: WordTiming[] = [];
    let cursor = 0;
    for (const tok of tokens) {
      const matchAt = originalWords.findIndex(
        (w, i) => i >= cursor && w.word.trim() === tok,
      );
      if (matchAt >= 0) {
        out.push({ ...originalWords[matchAt] });
        cursor = matchAt + 1;
      } else {
        // No timing match — defer; we'll interpolate below.
        out.push({ word: tok, start: NaN, end: NaN });
      }
    }
    // Fill NaN spans by interpolating between neighbors with known timings.
    fillNaNTimings(out, segStart, segEnd);
    return out;
  }

  // No prior word data — evenly distribute the paragraph window.
  const span = Math.max(0, segEnd - segStart);
  const slice = tokens.length > 0 ? span / tokens.length : 0;
  return tokens.map((tok, i) => ({
    word: tok,
    start: segStart + i * slice,
    end: segStart + (i + 1) * slice,
  }));
}

function fillNaNTimings(words: WordTiming[], segStart: number, segEnd: number) {
  // Forward pass: replace NaN.start with previous .end (or segStart).
  let prevEnd = segStart;
  for (const w of words) {
    if (!Number.isFinite(w.start)) w.start = prevEnd;
    if (!Number.isFinite(w.end)) w.end = w.start; // placeholder
    prevEnd = w.end;
  }
  // Backward pass: replace any trailing zero-duration words by interpolating
  // toward segEnd.
  let nextStart = segEnd;
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (w.end <= w.start) {
      const span = Math.max(0, nextStart - w.start);
      w.end = w.start + span / Math.max(1, i + 1);
    }
    nextStart = w.start;
  }
}

function docToSegments(
  editor: Editor,
  baseSegments: TranscriptionSegment[],
): TranscriptionSegment[] {
  const segments: TranscriptionSegment[] = [];
  let idx = 0;

  editor.state.doc.forEach((node) => {
    if (node.type.name !== 'paragraph') return;
    const text = node.textContent;
    const attrs = node.attrs as ParagraphAttrs;

    // Carry over fields like `id`/`seek` from the matching original segment
    // when possible (positional match — best-effort).
    const original = baseSegments[idx];

    segments.push({
      id: original?.id ?? idx,
      seek: original?.seek ?? 0,
      start: attrs.start ?? 0,
      end: attrs.end ?? 0,
      text,
      speakerId: attrs.speakerId ?? undefined,
      words: rebuildWords(text, attrs.start ?? 0, attrs.end ?? 0, attrs.words) ?? undefined,
    });
    idx += 1;
  });

  return segments;
}

/* ------------------------------------------------------------------ */
/* The component                                                      */
/* ------------------------------------------------------------------ */

export function TranscriptEditor({
  segments,
  speakers,
  onSegmentsChange,
  onSpeakersChange,
  audioPlayerRef,
  currentTime = 0,
  className,
}: TranscriptEditorProps) {
  // Keep a stable ref to the latest segments so the change handler can carry
  // over `id`/`seek` from the data we received without re-creating the editor.
  const baseSegmentsRef = useRef<TranscriptionSegment[]>(segments);
  baseSegmentsRef.current = segments;

  // Stable initial doc — built once. Subsequent prop changes (loading a
  // different audio) reset the editor via the `segments.length`-keyed effect.
  const initialDoc = useMemo(() => segmentsToDoc(segments), []);  // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe
    extensions: [
      Document,
      Text,
      History,
      Placeholder.configure({
        placeholder: 'Cap text encara. Comença a escriure o carrega un àudio.',
      }),
      TranscriptParagraph.configure({ speakers, onSpeakersChange }),
      KaraokeHighlight,
    ],
    content: initialDoc,
    editorProps: {
      attributes: {
        class: cn(
          // Tiptap targets `.ProseMirror` for the contentEditable host.
          'ProseMirror max-w-none min-h-full',
          'focus:outline-none',
        ),
      },
      // Single-click just places the cursor (default behavior). A deliberate
      // double-click seeks audio to that paragraph and plays — matches Descript
      // / Otter convention and keeps typing usable without jumping the audio.
      handleDoubleClick: (view, pos) => {
        const $pos = view.state.doc.resolve(pos);
        const para = $pos.node($pos.depth);
        if (para?.type.name === 'paragraph') {
          const start = Number(para.attrs.start ?? 0);
          if (Number.isFinite(start)) {
            audioPlayerRefRef.current?.seekTo(start);
            audioPlayerRefRef.current?.play();
            return true; // consume — we don't want to also select the word
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (!onSegmentsChange) return;
      const next = docToSegments(editor, baseSegmentsRef.current);
      onSegmentsChange(next);
    },
  });

  // Stable ref to audioPlayerRef so handleClick (closed over at editor-init
  // time) always sees the latest value.
  const audioPlayerRefRef = useRef<AudioPlayerRef | null>(audioPlayerRef ?? null);
  useEffect(() => {
    audioPlayerRefRef.current = audioPlayerRef ?? null;
  }, [audioPlayerRef]);

  // Reset editor content when a new audio loads (segments changed identity).
  // We compare on the underlying audio by checking if all paragraph starts
  // differ — cheaper than deep equality.
  useEffect(() => {
    if (!editor) return;
    const docFirstStart = editor.state.doc.firstChild?.attrs?.start ?? null;
    const newFirstStart = segments[0]?.start ?? null;
    const docCount = editor.state.doc.childCount;
    if (docCount !== segments.length || docFirstStart !== newFirstStart) {
      editor.commands.setContent(segmentsToDoc(segments), { emitUpdate: false });
    }
  }, [segments, editor]);

  // Keep speaker options + add-speaker callback in the extension up-to-date
  // without re-creating the editor (which would lose focus + selection).
  useEffect(() => {
    if (!editor) return;
    const ext = editor.extensionManager.extensions.find((e) => e.name === 'paragraph');
    if (ext) {
      ext.options.speakers = speakers;
      ext.options.onSpeakersChange = onSpeakersChange;
    }
  }, [editor, speakers, onSpeakersChange]);

  /* ------------- Playback highlight (ProseMirror decorations) -------------
     The KaraokeHighlight extension reads currentTime from a transaction meta
     and emits inline `.karaoke-word` + paragraph `.karaoke-paragraph` decos.
     We dispatch one no-op tx per tick — ProseMirror diffs and only repaints
     the changed decorations, so this stays cheap even on long docs. */
  const lastDispatchedTimeRef = useRef<number>(-1);
  const lastScrolledParaRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editor) return;
    // Skip dispatch if time hasn't moved by at least 50 ms (saves work when
    // a paused player keeps firing the same value).
    if (Math.abs(currentTime - lastDispatchedTimeRef.current) < 0.05) return;
    lastDispatchedTimeRef.current = currentTime;

    const tr = editor.state.tr.setMeta(karaokeKey, { currentTime });
    editor.view.dispatch(tr);

    // Auto-scroll the active paragraph into view (throttled to rAF, only when
    // the active paragraph actually changed).
    window.requestAnimationFrame(() => {
      const para = editor.view.dom.querySelector<HTMLElement>(
        '.karaoke-paragraph',
      );
      if (!para || para === lastScrolledParaRef.current) return;
      lastScrolledParaRef.current = para;
      para.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [currentTime, editor]);

  return (
    <div className={cn('h-full overflow-y-auto bg-white', className)}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
