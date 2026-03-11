import { randomUUID } from "node:crypto";
import { getDatabase } from "../database";
import type { Template } from "../../../src/types";

type CreateTemplateInput = {
  id?: string;
  name: string;
  prompt: string;
};

type UpdateTemplateInput = {
  id: string;
  name?: string;
  prompt?: string;
};

const builtInTemplates: Template[] = [
  { id: "general", name: "General", prompt: "Summarize the meeting into key points, decisions, and action items.", isBuiltIn: true, createdAt: 0 },
  { id: "one-on-one", name: "One-on-One", prompt: "Highlight updates, blockers, feedback, and next steps.", isBuiltIn: true, createdAt: 0 },
  { id: "standup", name: "Standup", prompt: "Organize updates into yesterday, today, blockers, and risks.", isBuiltIn: true, createdAt: 0 },
  { id: "sales-call", name: "Sales Call", prompt: "Capture pain points, objections, buying signals, and next actions.", isBuiltIn: true, createdAt: 0 },
  { id: "user-interview", name: "User Interview", prompt: "Summarize goals, workflows, friction points, and memorable quotes.", isBuiltIn: true, createdAt: 0 },
  { id: "customer-discovery", name: "Customer Discovery", prompt: "Surface motivations, unmet needs, alternatives, and urgency.", isBuiltIn: true, createdAt: 0 },
  { id: "weekly-team", name: "Weekly Team", prompt: "Group the discussion into wins, risks, dependencies, and follow-ups.", isBuiltIn: true, createdAt: 0 },
  { id: "investor-pitch", name: "Investor Pitch", prompt: "Capture feedback on market, product, traction, risks, and asks.", isBuiltIn: true, createdAt: 0 },
];

export function listTemplates(): Template[] {
  return getDatabase()
    .prepare(
      `
        SELECT
          id,
          name,
          prompt,
          is_built_in AS isBuiltIn,
          created_at AS createdAt
        FROM templates
        ORDER BY is_built_in DESC, name COLLATE NOCASE ASC
      `,
    )
    .all() as Template[];
}

export function getTemplate(id: string): Template | null {
  return (
    (getDatabase()
      .prepare(
        `
          SELECT
            id,
            name,
            prompt,
            is_built_in AS isBuiltIn,
            created_at AS createdAt
          FROM templates
          WHERE id = ?
        `,
      )
      .get(id) as Template | undefined) ?? null
  );
}

function normalizeTemplateName(name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Template name is required.");
  }

  return normalizedName;
}

function normalizeTemplatePrompt(prompt: string): string {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    throw new Error("Template prompt is required.");
  }

  return normalizedPrompt;
}

export function createTemplate(input: CreateTemplateInput): Template {
  const templateId = input.id ?? randomUUID();
  const createdAt = Date.now();

  getDatabase()
    .prepare(
      `
        INSERT INTO templates (
          id,
          name,
          prompt,
          is_built_in,
          created_at
        ) VALUES (?, ?, ?, 0, ?)
      `,
    )
    .run(templateId, normalizeTemplateName(input.name), normalizeTemplatePrompt(input.prompt), createdAt);

  return getTemplate(templateId) as Template;
}

export function updateTemplate(input: UpdateTemplateInput): Template {
  const existingTemplate = getTemplate(input.id);
  if (!existingTemplate) {
    throw new Error(`Template ${input.id} was not found.`);
  }

  if (existingTemplate.isBuiltIn) {
    throw new Error("Built-in templates cannot be edited.");
  }

  const name = input.name ? normalizeTemplateName(input.name) : existingTemplate.name;
  const prompt = input.prompt ? normalizeTemplatePrompt(input.prompt) : existingTemplate.prompt;

  getDatabase()
    .prepare(
      `
        UPDATE templates
        SET
          name = ?,
          prompt = ?
        WHERE id = ?
          AND is_built_in = 0
      `,
    )
    .run(name, prompt, input.id);

  return getTemplate(input.id) as Template;
}

export function deleteTemplate(id: string): void {
  const existingTemplate = getTemplate(id);
  if (!existingTemplate) {
    return;
  }

  if (existingTemplate.isBuiltIn) {
    throw new Error("Built-in templates cannot be deleted.");
  }

  getDatabase().prepare("DELETE FROM templates WHERE id = ?").run(id);
}

export function seedBuiltInTemplates(): void {
  const db = getDatabase();
  const statement = db.prepare(
    `
      INSERT INTO templates (id, name, prompt, is_built_in, created_at)
      VALUES (@id, @name, @prompt, @is_built_in, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        prompt = excluded.prompt,
        is_built_in = excluded.is_built_in,
        created_at = templates.created_at
    `,
  );

  const transaction = db.transaction(() => {
    for (const template of builtInTemplates) {
      statement.run({
        id: template.id,
        name: template.name,
        prompt: template.prompt,
        is_built_in: 1,
        created_at: Date.now(),
      });
    }
  });

  transaction();
}
