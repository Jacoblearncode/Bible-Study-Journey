import sax from 'sax';

// Tags whose text content is an annotation (footnote / cross-reference), not
// part of the readable verse text, and must be dropped entirely.
const ANNOTATION_TAGS = new Set(['f', 'x']);

/**
 * Parses a USFX bible XML document (see https://ebible.org/usfx/) into a flat
 * list of verses plus the book display titles declared in <h> tags.
 *
 * @param {string} xml
 * @returns {{ bookTitles: Record<string, string>, verses: Array<{ book: string, chapter: number, verse: number, verseLabel: string, text: string }> }}
 */
export function parseUsfx(xml) {
  const parser = sax.parser(true, { trim: false, lowercase: false });

  const bookTitles = {};
  const verses = [];

  let currentBook = null;
  let currentChapter = null;
  let inHeading = false;
  let headingBuffer = '';

  let capturingVerse = false;
  let currentVerseLabel = null;
  let verseBuffer = '';
  let annotationDepth = 0;

  parser.onopentag = (node) => {
    switch (node.name) {
      case 'book':
        currentBook = node.attributes.id;
        currentChapter = null;
        break;
      case 'h':
        inHeading = true;
        headingBuffer = '';
        break;
      case 'c':
        currentChapter = Number.parseInt(node.attributes.id, 10);
        break;
      case 'v':
        capturingVerse = true;
        currentVerseLabel = node.attributes.id;
        verseBuffer = '';
        break;
      case 've':
        if (capturingVerse && currentBook && currentChapter != null) {
          const verseNumber = Number.parseInt(currentVerseLabel, 10);
          verses.push({
            book: currentBook,
            chapter: currentChapter,
            verse: verseNumber,
            verseLabel: currentVerseLabel,
            text: verseBuffer.replace(/\s+/g, ' ').trim(),
          });
        }
        capturingVerse = false;
        currentVerseLabel = null;
        verseBuffer = '';
        break;
      default:
        if (ANNOTATION_TAGS.has(node.name)) {
          annotationDepth += 1;
        }
        break;
    }
  };

  parser.onclosetag = (name) => {
    if (name === 'h') {
      inHeading = false;
      if (currentBook && !bookTitles[currentBook]) {
        bookTitles[currentBook] = headingBuffer.replace(/\s+/g, ' ').trim();
      }
    } else if (ANNOTATION_TAGS.has(name)) {
      annotationDepth = Math.max(0, annotationDepth - 1);
    }
  };

  parser.ontext = (text) => {
    if (inHeading) {
      headingBuffer += text;
      return;
    }
    if (capturingVerse && annotationDepth === 0) {
      verseBuffer += text;
    }
  };

  parser.write(xml).close();

  return { bookTitles, verses };
}
