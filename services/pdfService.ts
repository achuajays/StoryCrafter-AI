
import jsPDF from 'jspdf';
import { StoryOutput, StoryArtwork } from '../types';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH_PT - MARGIN * 2;
const FONT_FAMILY = 'times';

const addWrappedText = (
    doc: jsPDF, 
    text: string, 
    x: number, 
    y: number, 
    options: {
        maxWidth: number,
        lineHeight: number,
        fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic',
        fontSize: number,
        align?: 'left' | 'center' | 'right'
    }
): number => {
    const { maxWidth, lineHeight, fontStyle, fontSize, align } = options;
    doc.setFont(FONT_FAMILY, fontStyle || 'normal');
    doc.setFontSize(fontSize);

    const lines = doc.splitTextToSize(text, maxWidth);
    let cursorY = y;

    lines.forEach((line: string) => {
        if (cursorY + lineHeight > A4_HEIGHT_PT - MARGIN) {
            doc.addPage();
            cursorY = MARGIN;
        }
        let textX = x;
        if (align === 'center') {
            textX = A4_WIDTH_PT / 2;
        } else if (align === 'right') {
            textX = A4_WIDTH_PT - MARGIN;
        }

        doc.text(line, textX, cursorY, { align: align || 'left' });
        cursorY += lineHeight;
    });

    return cursorY;
};

export const generateBookPdf = (story: StoryOutput, artwork?: StoryArtwork | null) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.deletePage(1);

    // --- Page 1: Full-Page Cover (if it exists) ---
    if (artwork?.cover) {
        doc.addPage();
        try {
            doc.addImage(artwork.cover, 'PNG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT);
        } catch (e) {
            console.error("Could not add cover image to PDF:", e);
        }
    }

    // --- Title Page ---
    doc.addPage();
    let currentY;
    
    currentY = addWrappedText(doc, story.title, A4_WIDTH_PT / 2, A4_HEIGHT_PT / 3, { 
        maxWidth: CONTENT_WIDTH, 
        lineHeight: 40, 
        fontSize: 36, 
        fontStyle: 'bold',
        align: 'center'
    });
    
    currentY = addWrappedText(doc, "by StoryCrafter AI", A4_WIDTH_PT / 2, currentY + 10, { 
        maxWidth: CONTENT_WIDTH, 
        lineHeight: 20, 
        fontSize: 16,
        align: 'center'
    });

    if (story.dedication) {
        addWrappedText(doc, story.dedication, A4_WIDTH_PT / 2, A4_HEIGHT_PT - MARGIN - 50, { 
            maxWidth: CONTENT_WIDTH, 
            lineHeight: 18, 
            fontSize: 12, 
            fontStyle: 'italic',
            align: 'center'
        });
    }

    // --- Table of Contents Page ---
    doc.addPage();
    currentY = MARGIN;
    currentY = addWrappedText(doc, "Contents", MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 30, fontSize: 24, fontStyle: 'bold' });
    currentY += 20;

    story.chapters.forEach((chapter, index) => {
        const chapterLine = `Chapter ${index + 1}: ${chapter.title}`;
        currentY = addWrappedText(doc, chapterLine, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 18, fontSize: 12 });
        if (currentY > A4_HEIGHT_PT - MARGIN) { 
            doc.addPage();
            currentY = MARGIN; 
        }
        currentY += 5;
    });

    // --- Characters Page ---
    if (story.characters) {
        doc.addPage();
        currentY = MARGIN;
        currentY = addWrappedText(doc, "Characters", MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 30, fontSize: 24, fontStyle: 'bold' });
        currentY += 20;
        addWrappedText(doc, story.characters, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 16, fontSize: 12 });
    }

    // --- Story Chapters Pages ---
    story.chapters.forEach((chapter, index) => {
        doc.addPage();
        currentY = MARGIN;
        
        const illustration = artwork?.chapterIllustrations?.[index];
        if (illustration) {
            try {
                const imgProps = doc.getImageProperties(illustration);
                const aspectRatio = imgProps.width / imgProps.height;
                const imgWidth = CONTENT_WIDTH;
                const imgHeight = imgWidth / aspectRatio;
                if (currentY + imgHeight < A4_HEIGHT_PT - MARGIN) {
                    doc.addImage(illustration, 'PNG', MARGIN, currentY, imgWidth, imgHeight);
                    currentY += imgHeight + 20;
                }
            } catch(e) {
                 console.error(`Could not add illustration for chapter ${index + 1}:`, e);
            }
        }

        const chapterTitle = `Chapter ${index + 1}: ${chapter.title}`;
        currentY = addWrappedText(doc, chapterTitle, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 22, fontSize: 18, fontStyle: 'bold' });
        currentY += 20;
        addWrappedText(doc, chapter.content, MARGIN, currentY, { maxWidth: CONTENT_WIDTH, lineHeight: 16, fontSize: 12 });
    });

    const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story'}.pdf`;
    doc.save(filename);
};
