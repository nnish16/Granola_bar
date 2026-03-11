import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo } from "react";
import { cn } from "../../lib/utils";
import type { NoteBlock as NoteBlockModel } from "../../types";
import EnhanceButton from "./EnhanceButton";

type NoteBlockProps = {
  block: NoteBlockModel;
  onChange: (blockId: string, newContent: string) => void;
  onEnhance?: (blockId: string) => void;
  isEnhancing?: boolean;
  onSave: () => void;
};

function buildEditorContent(block: NoteBlockModel): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: block.content ? [{ type: "text", text: block.content }] : [],
      },
    ],
  };
}

export default function NoteBlock({ block, onChange, onEnhance, isEnhancing = false, onSave }: NoteBlockProps): JSX.Element {
  const editorContent = useMemo(() => buildEditorContent(block), [block.blockType, block.content]);
  const editor = useEditor({
    editable: block.source === "user",
    extensions: [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        hardBreak: false,
        horizontalRule: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder: block.blockType === "heading" ? "Add a section title" : "Write a note…",
      }),
    ],
    content: editorContent,
    editorProps: {
      attributes: {
        class: cn(
          "rounded-2xl px-3 py-2 text-[15px] leading-6 outline-none",
          "bg-transparent text-[#0F0F0F] font-normal dark:text-zinc-100",
          block.blockType === "heading" && "text-lg font-semibold",
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (block.id) {
        onChange(block.id, currentEditor.getText());
      }
    },
  });

  useEffect(() => {
    if (!editor || block.source !== "user" || editor.isFocused) {
      return;
    }

    if (editor.getText() !== block.content) {
      editor.commands.setContent(editorContent, false);
    }
  }, [block.content, block.source, editor, editorContent]);

  if (block.source === "ai") {
    return (
      <div className="group relative rounded-3xl border border-transparent px-2 py-1 transition hover:border-border/70">
        {/* Phase 5 keeps AI blocks as read-only text instead of a live editor instance. */}
        <div className="rounded-2xl border-l-2 border-gray-200 bg-gray-50/80 px-3 py-2 text-[15px] italic leading-6 text-[#6B7280] dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400">
          <p>{block.content || "AI enhancement"}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative rounded-3xl border border-transparent px-2 py-1 transition hover:border-border/70"
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!event.currentTarget.contains(nextTarget)) {
          onSave();
        }
      }}
    >
      {block.id && onEnhance ? (
        <div className="absolute right-3 top-3 z-10">
          <EnhanceButton
            isBusy={isEnhancing}
            onClick={() => {
              onEnhance(block.id as string);
            }}
          />
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
