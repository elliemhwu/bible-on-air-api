import { MigrationInterface, QueryRunner } from "typeorm";
import { OutlineBlockContent } from "../../blocks/block-content.types";
import { bookInTitle, htmlToLines, outlineToHtml, parseOutlineLines } from "../../blocks/outline";

/**
 * 本書大綱 becomes a structured outline block: the 書卷鳥瞰 template asks for
 * one, and existing rich-text outlines are converted where they read as an
 * outline (the rest stay rich text, so nothing is lost).
 */
export class OutlineBlocks1793347000000 implements MigrationInterface {
    name = 'OutlineBlocks1793347000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.setTemplateType(queryRunner, "richtext", "outline");

        const blocks: { id: string; content: { html?: string } | null; title: string | null }[] = await queryRunner.query(`
            SELECT b."id", b."content", a."title"
            FROM "blocks" b JOIN "articles" a ON a."id" = b."articleId"
            WHERE b."type" = 'richtext' AND b."subheading" = '本書大綱'`);
        for (const block of blocks) {
            const outline = parseOutlineLines(htmlToLines(block.content?.html ?? ""), bookInTitle(block.title ?? ""));
            if (!outline) continue;
            await queryRunner.query(
                `UPDATE "blocks" SET "type" = 'outline', "content" = $1 WHERE "id" = $2`,
                [JSON.stringify(outline), block.id],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.setTemplateType(queryRunner, "outline", "richtext");

        const blocks: { id: string; content: OutlineBlockContent }[] = await queryRunner.query(
            `SELECT "id", "content" FROM "blocks" WHERE "type" = 'outline'`,
        );
        for (const block of blocks) {
            await queryRunner.query(
                `UPDATE "blocks" SET "type" = 'richtext', "content" = $1 WHERE "id" = $2`,
                [JSON.stringify({ html: outlineToHtml(block.content) }), block.id],
            );
        }
    }

    /** Switch the 本書大綱 slot of every template between block types */
    private async setTemplateType(queryRunner: QueryRunner, from: string, to: string) {
        const templates: { id: number; blockDefinitions: { type: string; subheading: string | null }[] }[] =
            await queryRunner.query(`SELECT "id", "blockDefinitions" FROM "article_templates"`);
        for (const t of templates) {
            let changed = false;
            const defs = t.blockDefinitions.map((d) => {
                if (d.type !== from || d.subheading !== "本書大綱") return d;
                changed = true;
                return { ...d, type: to };
            });
            if (changed) {
                await queryRunner.query(`UPDATE "article_templates" SET "blockDefinitions" = $1 WHERE "id" = $2`, [
                    JSON.stringify(defs),
                    t.id,
                ]);
            }
        }
    }
}
