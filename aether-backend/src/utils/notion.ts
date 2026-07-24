export function extractTitle(page: any): string {
    const props = page.properties || {};
    for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop.type === "title" && Array.isArray(prop.title) && prop.title.length > 0) {
            return prop.title.map((t: any) => t.plain_text).join("") || "Untitled";
        }
    }
    return "Untitled";
}

export function extractIcon(page: any): string | null {
    if (!page.icon) return null;
    if (page.icon.type === "emoji") return page.icon.emoji;
    if (page.icon.type === "file") return page.icon.file?.url ?? null;
    if (page.icon.type === "external") return page.icon.external?.url ?? null;
    return null;
}
