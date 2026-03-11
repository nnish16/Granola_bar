import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import { cn } from "../../lib/utils";
import type { NoteBlock as NoteBlockModel } from "../../types";
import EnhanceButton from "./EnhanceButton";

type NoteBlockProps = {
  block: NoteBlockModel;
  isSaving?: boolean;
  onChange: (block: NoteBlockModel) => void;
  onEnhance?: () => void;
  onSave: () => void;
};

function buildEditorContent(content: string): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: content ? [{ type: "text", text: content }] : [],
      },
    ],
  };
}

export default function NoteBlock({ block, isSaving = false, onChange, onEnhance, onSave }: NoteBlockProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder:
          block.blockType === "heading"
            ? "Add a section title"
            : block.source === "ai"
              ? "AI enhancement"
              : "Write a note…",
      }),
    ],
    content: buildEditorContent(block.content),
    editorProps: {
      attributes: {
        class: cn(
          "rounded-2xl px-3 py-2 text-[15px] leading-6 outline-none",
          block.source === "ai"
            ? "border-l-2 border-gray-200 bg-gray-50/80 text-[#6B7280] italic dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400"
            : "bg-transparent text-[#0F0F0F] dark:text-zinc-100",
          block.blockType === "heading" && "text-lg font-semibold",
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        ...block,
        content: currentEditor.getText(),
      });
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getText() !== block.content) {
      editor.commands.setContent(buildEditorContent(block.content), false);
    }
  }, [block.content, editor]);

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
      {block.source === "user" && onEnhance ? (
        <div className="absolute right-3 top-3 z-10">
          <EnhanceButton isBusy={isSaving} onClick={onEnhance} />
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
