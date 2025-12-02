import JSZip from 'jszip';
import { ChangeType, TrackedItem, DocxData } from '../types';

export const parseDocx = async (file: File): Promise<DocxData> => {
  let zip;
  try {
      zip = await JSZip.loadAsync(file);
  } catch (error: any) {
      console.error("JSZip Load Error:", error);
      if (error.message && (error.message.includes("end of central directory") || error.message.includes("corrupted"))) {
          throw new Error(`Failed to parse "${file.name}". The file is not a valid DOCX document or is corrupted.`);
      }
      throw new Error(`Failed to read "${file.name}". ${error.message}`);
  }
  
  const documentXmlContent = await zip.file("word/document.xml")?.async("text");
  if (!documentXmlContent) throw new Error(`Invalid DOCX: "${file.name}" is missing 'word/document.xml'.`);

  const commentsXmlContent = await zip.file("word/comments.xml")?.async("text");
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXmlContent, "application/xml");
  const commentsDoc = commentsXmlContent ? parser.parseFromString(commentsXmlContent, "application/xml") : null;

  const commentMap = new Map<string, string>();
  if (commentsDoc) {
    const commentNodes = commentsDoc.getElementsByTagName("w:comment");
    for (let i = 0; i < commentNodes.length; i++) {
      const c = commentNodes[i];
      const id = c.getAttribute("w:id");
      const textNodes = c.getElementsByTagName("w:t");
      let commentText = "";
      for (let j = 0; j < textNodes.length; j++) {
        commentText += textNodes[j].textContent || "";
      }
      if (id) commentMap.set(id, commentText);
    }
  }

  const items: TrackedItem[] = [];
  let fullText = "";
  let currentSection = "Start of Document";
  
  const getText = (node: Element) => {
    const tNodes = node.getElementsByTagName("w:t");
    let t = "";
    for (let i = 0; i < tNodes.length; i++) {
      t += tNodes[i].textContent;
    }
    return t;
  };

  const paragraphs = xmlDoc.getElementsByTagName("w:p");
  
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const pText = getText(p); 
    fullText += pText + "\n";

    // 0. Update Section Context if this is a heading
    const pPr = p.getElementsByTagName("w:pPr")[0];
    if (pPr) {
        const pStyle = pPr.getElementsByTagName("w:pStyle")[0];
        if (pStyle) {
            const styleVal = pStyle.getAttribute("w:val");
            // Basic heuristic: checks for "Heading" (e.g. Heading1) or "Title"
            // We strip non-alphanumeric to be safe against case variations or localized names if they keep english IDs
            if (styleVal && (styleVal.toLowerCase().includes("heading") || styleVal.toLowerCase().includes("title"))) {
                // Only update if there is actual text
                if (pText.trim().length > 0) {
                     // If the length is reasonable for a header (e.g. < 200 chars), use it. 
                     // Otherwise it might be a false positive or weird formatting.
                     if (pText.trim().length < 200) {
                        currentSection = pText.trim();
                     }
                }
            }
        }
        // Also check for outline level which definitely indicates structure
        const outlineLvl = pPr.getElementsByTagName("w:outlineLvl")[0];
        if (outlineLvl && pText.trim().length > 0 && pText.trim().length < 200) {
            currentSection = pText.trim();
        }
    }

    // 1. Check for Insertions
    const insertions = p.getElementsByTagName("w:ins");
    for (let j = 0; j < insertions.length; j++) {
      const ins = insertions[j];
      const text = getText(ins);
      if (text.trim()) {
        items.push({
          id: `ins-${i}-${j}`,
          type: ChangeType.INSERTION,
          text: text,
          context: pText,
          sectionContext: currentSection,
          author: ins.getAttribute("w:author") || "Unknown",
          date: ins.getAttribute("w:date") || undefined,
          paragraphIndex: i + 1
        });
      }
    }

    // 2. Check for Deletions
    const deletions = p.getElementsByTagName("w:del");
    for (let j = 0; j < deletions.length; j++) {
      const del = deletions[j];
      const text = getText(del);
      if (text.trim()) {
        items.push({
          id: `del-${i}-${j}`,
          type: ChangeType.DELETION,
          text: text,
          context: pText,
          sectionContext: currentSection,
          author: del.getAttribute("w:author") || "Unknown",
          date: del.getAttribute("w:date") || undefined,
          paragraphIndex: i + 1
        });
      }
    }

    // 3. Check for Comments
    const references = p.getElementsByTagName("w:commentReference");
    for (let j = 0; j < references.length; j++) {
      const ref = references[j];
      const id = ref.getAttribute("w:id");
      if (id && commentMap.has(id)) {
        items.push({
          id: `com-${id}`,
          type: ChangeType.COMMENT,
          text: "Text in vicinity of comment", 
          context: pText,
          sectionContext: currentSection,
          commentContent: commentMap.get(id),
          paragraphIndex: i + 1
        });
      }
    }
  }

  return {
    fullText,
    items
  };
};