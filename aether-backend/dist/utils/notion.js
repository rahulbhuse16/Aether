"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTitle = extractTitle;
exports.extractIcon = extractIcon;
exports.getPageContentAsText = getPageContentAsText;
exports.classifyPageType = classifyPageType;
const MAX_BLOCKS = 300;
const MAX_CONTENT_CHARS = 12000; // keeps stored content + downstream AI prompt budget sane
const MAX_DEPTH = 3;
function extractTitle(page) {
    const props = page.properties || {};
    for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop.type === "title" && Array.isArray(prop.title) && prop.title.length > 0) {
            return prop.title.map((t) => t.plain_text).join("") || "Untitled";
        }
    }
    return "Untitled";
}
function extractIcon(page) {
    if (!page.icon)
        return null;
    if (page.icon.type === "emoji")
        return page.icon.emoji;
    if (page.icon.type === "file")
        return page.icon.file?.url ?? null;
    if (page.icon.type === "external")
        return page.icon.external?.url ?? null;
    return null;
}
/**
 * Recursively walks a Notion page's block children and flattens them into
 * readable, searchable plain text — preserving just enough structure
 * (headings, list markers, checkboxes) to stay useful without carrying
 * Notion's full rich-text block schema into storage.
 *
 * Bounded by MAX_BLOCKS/MAX_DEPTH so one huge page can't blow up sync time
 * or storage; bounded by MAX_CONTENT_CHARS so it stays AI-prompt-friendly.
 */
async function getPageContentAsText(notion, pageId) {
    const lines = [];
    let blocksFetched = 0;
    async function walk(blockId, depth) {
        let cursor;
        do {
            if (blocksFetched >= MAX_BLOCKS)
                return;
            const res = await notion.blocks.children.list({
                block_id: blockId,
                start_cursor: cursor,
                page_size: 50,
            });
            for (const block of res.results) {
                if (blocksFetched >= MAX_BLOCKS)
                    break;
                blocksFetched++;
                const text = extractBlockText(block);
                if (text)
                    lines.push(`${"  ".repeat(depth)}${text}`);
                if (block.has_children && depth < MAX_DEPTH) {
                    await walk(block.id, depth + 1);
                }
            }
            cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
        } while (cursor && blocksFetched < MAX_BLOCKS);
    }
    try {
        await walk(pageId, 0);
    }
    catch (error) {
        console.error(`getPageContentAsText error for page ${pageId}:`, error);
    }
    return lines.join("\n").slice(0, MAX_CONTENT_CHARS);
}
function extractBlockText(block) {
    const type = block.type;
    const data = block[type];
    if (!data)
        return null;
    const richText = data.rich_text?.map((t) => t.plain_text).join("") ?? "";
    switch (type) {
        case "heading_1":
            return richText ? `# ${richText}` : null;
        case "heading_2":
            return richText ? `## ${richText}` : null;
        case "heading_3":
            return richText ? `### ${richText}` : null;
        case "bulleted_list_item":
            return richText ? `- ${richText}` : null;
        case "numbered_list_item":
            return richText ? `1. ${richText}` : null;
        case "to_do":
            return richText ? `[${data.checked ? "x" : " "}] ${richText}` : null;
        case "quote":
            return richText ? `> ${richText}` : null;
        case "code":
            return richText ? `\`\`\`\n${richText}\n\`\`\`` : null;
        case "callout":
            return richText ? `Note: ${richText}` : null;
        case "paragraph":
            return richText || null;
        default:
            return richText || null;
    }
}
/**
 * Cheap heuristic classification — deliberately not an AI call, since
 * running that on every page during a full sync would be slow and
 * expensive. Good enough to power the meeting-notes flow and light
 * filtering; wrong guesses just mean a page needs manual selection
 * instead of showing up in a filtered view.
 */
function classifyPageType(title, content) {
    const t = title.toLowerCase();
    const c = content.slice(0, 500).toLowerCase();
    if (/\b(meeting|standup|sync|1:1|retro|retrospective)\b/.test(t))
        return "meeting_notes";
    if (/\b(adr|architecture decision|decision record)\b/.test(t))
        return "adr";
    if (/\b(guide|documentation|docs|readme|runbook|how to|setup)\b/.test(t))
        return "documentation";
    if (/attendees:|agenda:|action items:/.test(c))
        return "meeting_notes";
    return "general";
}
