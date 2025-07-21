import JSZip from 'jszip';
import { StoryOutput, StoryArtwork } from '../types';

// Helper to convert dataURL to Blob
const dataURLToBlob = async (dataURL: string): Promise<Blob | null> => {
    try {
        const res = await fetch(dataURL);
        if (!res.ok) return null;
        return await res.blob();
    } catch (e) {
        console.error("Failed to fetch data URL:", e);
        return null;
    }
};

const escapeXml = (unsafe: string): string => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

export const generateBookEpub = async (story: StoryOutput, artwork?: StoryArtwork | null) => {
    const zip = new JSZip();
    const oebps = zip.folder("OEBPS")!;
    const imagesFolder = oebps.folder("images")!;
    const chaptersFolder = oebps.folder("chapters")!;

    // 1. Mimetype file (must be first and uncompressed)
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8" ?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+document"/>
  </rootfiles>
</container>`;
    zip.file("META-INF/container.xml", containerXml);

    // 3. Process images
    let coverImageInfo: { id: string, href: string, 'media-type': string } | null = null;
    if (artwork?.cover) {
        const blob = await dataURLToBlob(artwork.cover);
        if (blob) {
            const extension = blob.type.split('/')[1] || 'png';
            const filename = `cover.${extension}`;
            coverImageInfo = { id: 'cover-image', href: `images/${filename}`, 'media-type': blob.type };
        }
    }

    const illustrationFiles: { id: string, href: string, 'media-type': string }[] = [];
    if (artwork?.chapterIllustrations) {
        for (let i = 0; i < artwork.chapterIllustrations.length; i++) {
            const illustration = artwork.chapterIllustrations[i];
            if (illustration) {
                const blob = await dataURLToBlob(illustration);
                if(blob) {
                    const extension = blob.type.split('/')[1] || 'png';
                    const filename = `illustration-${i + 1}.${extension}`;
                    const id = `illustration-${i+1}`;
                    illustrationFiles.push({ id: id, href: `images/${filename}`, 'media-type': blob.type });
                }
            }
        }
    }

    // 4. OEBPS/style.css
    const css = `
body { font-family: serif; line-height: 1.6; margin: 1em; }
h1, h2, h3 { font-family: sans-serif; line-height: 1.2; text-align: center; }
p { text-indent: 1.5em; margin: 0; }
img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
.cover-page { text-align: center; page-break-after: always; }
.cover-image { width: 100%; height: 95vh; object-fit: contain; }
.title-page-title { font-size: 2.5em; margin-top: 1em; }
.title-page-author { font-size: 1.2em; margin-top: 0.5em; }
.dedication { font-style: italic; margin-top: 3em; }
.char-list { white-space: pre-wrap; }
.chapter-content > p { margin-bottom: 1em; }`;
    oebps.file("style.css", css);
    
    // 5. Content Files (XHTML)
    const createXHTML = (title: string, bodyContent: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="../style.css" />
</head>
<body>
  ${bodyContent}
</body>
</html>`;
    
    // Title Page
    const titlePageBody = `
<div class="cover-page">
  ${coverImageInfo ? `<img src="${coverImageInfo.href}" alt="Cover Image" class="cover-image" />` : ''}
  <h1 class="title-page-title">${escapeXml(story.title)}</h1>
  <p class="title-page-author">by StoryCrafter AI</p>
  ${story.dedication ? `<p class="dedication">${escapeXml(story.dedication)}</p>` : ''}
</div>`;
    oebps.file("title.xhtml", createXHTML(story.title, titlePageBody).replace('../style.css', 'style.css'));

    // Characters Page
    if (story.characters) {
        const charactersBody = `<h3>Characters</h3><div class="char-list">${escapeXml(story.characters).replace(/\n/g, '<br/>')}</div>`;
        oebps.file("characters.xhtml", createXHTML("Characters", charactersBody).replace('../style.css', 'style.css'));
    }

    // Chapters
    story.chapters.forEach((chapter, index) => {
        const illustration = illustrationFiles.find(f => f.id === `illustration-${index+1}`);
        const illustrationTag = illustration ? `<img src="../${illustration.href}" alt="Illustration for ${escapeXml(chapter.title)}"/>` : '';
        const chapterContent = chapter.content.split('\n').filter(p => p.trim() !== '').map(p => `<p>${escapeXml(p.trim())}</p>`).join('');
        const chapterBody = `<h2>Chapter ${index + 1}: ${escapeXml(chapter.title)}</h2>${illustrationTag}<div class="chapter-content">${chapterContent}</div>`;
        chaptersFolder.file(`chapter-${index + 1}.xhtml`, createXHTML(chapter.title, chapterBody));
    });

    // 6. Navigation (nav.xhtml)
    const navBody = `
<nav epub:type="toc" id="toc">
  <h2>Table of Contents</h2>
  <ol>
    <li><a href="title.xhtml">${escapeXml(story.title)}</a></li>
    ${story.characters ? `<li><a href="characters.xhtml">Characters</a></li>` : ''}
    ${story.chapters.map((ch, i) => `<li><a href="chapters/chapter-${i + 1}.xhtml">Chapter ${i + 1}: ${escapeXml(ch.title)}</a></li>`).join('\n    ')}
  </ol>
</nav>`;
    oebps.file("nav.xhtml", createXHTML("Table of Contents", navBody).replace('../style.css', 'style.css'));
    
    // 7. Package Document (content.opf)
    const manifestItems = ([
        { id: 'nav', href: 'nav.xhtml', 'media-type': 'application/xhtml+xml', properties: 'nav' },
        { id: 'css', href: 'style.css', 'media-type': 'text/css' },
        { id: 'title-page', href: 'title.xhtml', 'media-type': 'application/xhtml+xml' },
        ...(story.characters ? [{ id: 'characters-page', href: 'characters.xhtml', 'media-type': 'application/xhtml+xml' }] : []),
        ...story.chapters.map((ch, i) => ({ id: `chapter-${i+1}`, href: `chapters/chapter-${i+1}.xhtml`, 'media-type': 'application/xhtml+xml' })),
        ...(coverImageInfo ? [{ ...coverImageInfo, properties: 'cover-image' }] : []),
        ...illustrationFiles
    ] as { id: string, href: string, 'media-type': string, properties?: string }[]).map(item => {
        const props = item.properties ? ` properties="${item.properties}"` : '';
        return `<item id="${item.id}" href="${item.href}" media-type="${item['media-type']}"${props} />`;
    }).join('\n    ');
    
    const spineItems = [
        { idref: 'title-page' },
        ...(story.characters ? [{ idref: 'characters-page' }] : []),
        ...story.chapters.map((ch, i) => ({ idref: `chapter-${i+1}` }))
    ].map(item => `<itemref idref="${item.idref}" />`).join('\n    ');

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(story.title)}</dc:title>
    <dc:creator>StoryCrafter AI</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0] + "Z"}</meta>
    ${coverImageInfo ? `<meta name="cover" content="${coverImageInfo.id}" />` : ''}
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`;
    oebps.file("content.opf", contentOpf);

    // 8. Generate ZIP and trigger download
    const blob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/epub+zip",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story'}.epub`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};