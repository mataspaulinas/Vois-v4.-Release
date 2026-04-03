import { CSSProperties, Fragment, ReactNode } from "react";

type CopilotRichMessageProps = {
  content: string;
  compact?: boolean;
};

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; code: string }
  | { type: "table"; rows: string[][] };

export function CopilotRichMessage({ content, compact = false }: CopilotRichMessageProps) {
  const blocks = parseBlocks(content);
  return (
    <div
      className="copilot-rich-message"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 12,
        color: "inherit",
      }}
    >
      {blocks.map((block, index) => renderBlock(block, index, compact))}
    </div>
  );
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const buffer: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buffer.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", code: buffer.join("\n") });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length as 1 | 2 | 3, text: headingMatch[2] });
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const buffer: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buffer.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: buffer });
      continue;
    }

    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) {
      const rows: string[][] = [splitTableRow(trimmed)];
      i += 2;
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(splitTableRow(lines[i].trim()));
        i += 1;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.*)$/);
    if (unordered) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        const match = next.match(/^[-*]\s+(.*)$/);
        if (!match) break;
        items.push(match[1]);
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        const match = next.match(/^\d+\.\s+(.*)$/);
        if (!match) break;
        items.push(match[1]);
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const buffer: string[] = [];
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (
        next.startsWith("```") ||
        next.startsWith(">") ||
        /^#{1,3}\s+/.test(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        (isTableRow(next) && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim()))
      ) {
        break;
      }
      buffer.push(next);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: buffer.join(" ") });
  }

  return blocks.length ? blocks : [{ type: "paragraph", text: content }];
}

function renderBlock(block: Block, index: number, compact: boolean) {
  switch (block.type) {
    case "heading": {
      const size = block.level === 1 ? 22 : block.level === 2 ? 18 : 15;
      return (
        <h4
          key={index}
          style={{
            fontSize: compact ? size - 2 : size,
            fontWeight: 700,
            lineHeight: 1.2,
            color: "var(--color-text-primary)",
          }}
        >
          {renderInline(block.text)}
        </h4>
      );
    }
    case "paragraph":
      return (
        <p key={index} style={paragraphStyle(compact)}>
          {renderInline(block.text)}
        </p>
      );
    case "blockquote":
      return (
        <blockquote
          key={index}
          style={{
            margin: 0,
            padding: compact ? "8px 12px" : "10px 14px",
            borderLeft: "3px solid var(--color-accent)",
            background: "var(--color-bg-muted)",
            borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            color: "var(--color-text-secondary)",
          }}
        >
          {block.lines.map((line, lineIndex) => (
            <p key={lineIndex} style={paragraphStyle(compact)}>
              {renderInline(line)}
            </p>
          ))}
        </blockquote>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          key={index}
          style={{
            margin: 0,
            paddingLeft: compact ? 18 : 22,
            display: "grid",
            gap: compact ? 4 : 6,
            color: "var(--color-text-primary)",
          }}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex} style={paragraphStyle(compact)}>
              {renderInline(item)}
            </li>
          ))}
        </Tag>
      );
    }
    case "code":
      return (
        <pre
          key={index}
          style={{
            margin: 0,
            padding: compact ? "10px 12px" : "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "#111827",
            color: "#F9FAFB",
            fontSize: compact ? 12 : 13,
            lineHeight: 1.55,
            overflowX: "auto",
            fontFamily: "var(--font-mono)",
          }}
        >
          <code>{block.code}</code>
        </pre>
      );
    case "table":
      return (
        <div key={index} style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: compact ? 12 : 13,
            }}
          >
            <thead>
              <tr>
                {block.rows[0].map((cell, cellIndex) => (
                  <th key={cellIndex} style={tableCellStyle(true)}>
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} style={tableCellStyle(false)}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code
          key={index}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.94em",
            background: "var(--color-bg-muted)",
            borderRadius: 6,
            padding: "0 5px",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={index}>{token.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{token}</Fragment>;
  });
}

function paragraphStyle(compact: boolean): CSSProperties {
  return {
    margin: 0,
    fontSize: compact ? 13 : 14,
    lineHeight: compact ? 1.45 : 1.6,
    color: "var(--color-text-primary)",
  };
}

function tableCellStyle(header: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    borderBottom: "1px solid var(--color-border-subtle)",
    textAlign: "left",
    verticalAlign: "top",
    color: header ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    fontWeight: header ? 600 : 400,
  };
}

function isTableRow(line: string) {
  return line.includes("|");
}

function isTableSeparator(line: string) {
  return /^\|?[\s:-]+\|[\s|:-]*$/.test(line);
}

function splitTableRow(line: string) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((part) => part.trim());
}
