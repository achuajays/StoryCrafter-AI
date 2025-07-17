import jsPDF from 'jspdf';
import { StoryOutput } from '../types';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH_PT - MARGIN * 2;
const FONT_FAMILY = 'times';

/**
 * Adds text to the PDF, handling word wrapping and automatic page breaks.
 * @returns The Y position after the text has been added.
 */
const addWrappedText = (
    doc: jsPDF, 
    text: string, 
    x: number, 
    y: number, 
    options: {
        maxWidth: number,
        lineHeight: number,
        fontStyle?: 'normal' | 'bold' | 'italic',
        fontSize: number
    }
): number => {
    const { maxWidth, lineHeight, fontStyle, fontSize } = options;
    doc.setFont(FONT_FAMILY, fontStyle || 'normal');
    doc.setFontSize(fontSize);

    const lines = doc.splitTextToSize(text, maxWidth);
    let cursorY = y;

    lines.forEach((line: string) => {
        // Check if there is enough space for the next line, otherwise add a new page
        if (cursorY + lineHeight > A4_HEIGHT_PT - MARGIN) {
            doc.addPage();
            cursorY = MARGIN;
        }
        doc.text(line, x, cursorY);
        cursorY += lineHeight;
    });

    return cursorY;
};

export const generateBookPdf = (story: StoryOutput) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    // We start fresh and manage all pages ourselves
    doc.deletePage(1);

    // --- Page 1: Title Page ---
    doc.addPage();
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(36);
    doc.text(story.title, A4_WIDTH_PT / 2, A4_HEIGHT_PT / 3, { align: 'center' });

    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(16);
    doc.text("by StoryCrafter AI", A4_WIDTH_PT / 2, A4_HEIGHT_PT / 3 + 40, { align: 'center' });

    if (story.dedication) {
        doc.setFont(FONT_FAMILY, 'italic');
        doc.setFontSize(12);
        const dedicationY = A4_HEIGHT_PT / 2;
        addWrappedText(doc, story.dedication, A4_WIDTH_PT / 2, dedicationY, {
            maxWidth: CONTENT_WIDTH - 100,
            lineHeight: 18,
            fontSize: 12,
            fontStyle: 'italic',
        });
    }

    // --- Page 2: Table of Contents ---
    doc.addPage();
    let currentY = MARGIN;
    currentY = addWrappedText(doc, "Contents", MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 30, fontSize: 24, fontStyle: 'bold' });
    currentY += 20;

    story.chapterOutline.forEach((title, index) => {
        const chapterLine = `Chapter ${index + 1}: ${title}`;
        currentY = addWrappedText(doc, chapterLine, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 18, fontSize: 12 });
        currentY += 5; // Add small gap between entries
    });

    // --- Page 3: Characters ---
    doc.addPage();
    currentY = MARGIN;
    currentY = addWrappedText(doc, "Characters", MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 30, fontSize: 24, fontStyle: 'bold' });
    currentY += 20;
    addWrappedText(doc, story.characters, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 16, fontSize: 12 });

    // --- Subsequent Pages: The Story Chapters ---
    story.chapters.forEach((chapter, index) => {
        doc.addPage();
        currentY = MARGIN;
        const chapterTitle = `Chapter ${index + 1}: ${chapter.title}`;
        currentY = addWrappedText(doc, chapterTitle, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 22, fontSize: 18, fontStyle: 'bold' });
        currentY += 20;
        addWrappedText(doc, chapter.content, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 16, fontSize: 12 });
    });

    // --- Save the PDF ---
    const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story'}.pdf`;
    doc.save(filename);
};