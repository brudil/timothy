import { TokenData, Token } from './parser';
const PDFDocument = require('pdfkit');

interface RenderOptions {
  sansSerif: boolean;
  renderNotes: boolean;
  editSpace: boolean;
}

const defaultOptions = {
  sansSerif: false,
  renderNotes: false,
  editSpace: false,
};

function chunkToLinesForWidth(words: string[], width: number, measure: (text: string) => number) {
  const lines: string[][] = [[]];
  let currentLineWidth = 0;
  words.forEach((currentWord: string) => {
    const currentWordWidth = measure(currentWord);

    if (currentLineWidth + currentWordWidth > width) {
      lines.push([currentWord]);
      currentLineWidth = currentWordWidth;
    } else {
      lines[lines.length - 1].push(currentWord);
      currentLineWidth = currentLineWidth + currentWordWidth;

    }
  });

  return lines;
}

export function generatePDF(
  outputStream: any,
  scriptAst: any,
  givenOptions: Partial<RenderOptions> = {},
) {
  const options: RenderOptions = { ...defaultOptions, ...givenOptions };
  const doc = new PDFDocument({
    size: 'A4',
    margin: 44,
  });

  const MARGIN = doc.page.width * 0.075;
  const CHARACTER_WIDTH = doc.page.width * 0.2;
  const DIALOGUE_WIDTH = doc.page.width * 0.45;
  const LINE_HEIGHT = options.editSpace ? 3 : 1.4;
  const TEXT_LINE_HEIGHT = 1.6;

  const typefaceCourier = {
    regular: 'fonts/Courier Prime.ttf',
    bold: 'fonts/Courier Prime Bold.ttf',
    italic: 'fonts/Courier Prime Italic.ttf',
    boldItalic: 'fonts/Courier Prime Bold Italic.ttf',
  };

  const typefaceArial = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
    boldItalic: 'Helvetica-BoldOblique',
  };

  const typeface = options.sansSerif ? typefaceArial : typefaceCourier;

  doc.pipe(outputStream);

  doc.fontSize(12);

  if (scriptAst.metadata.series) {
    doc.font(typeface.italic).text(scriptAst.metadata.series);
  }

  doc.font(typeface.bold).text(scriptAst.metadata.title);

  doc
    .font(typeface.regular)
    .text(
      `${scriptAst.metadata.credit} ${scriptAst.metadata.author ||
        scriptAst.metadata.authors}`,
    );

  let currentCharacterStartingHeight = doc.y;
  let characterCount = 1;
  let currentCharacterLowestHeight = 0;

  doc.on('pageAdded', () => {
    currentCharacterStartingHeight = doc.y;
    currentCharacterLowestHeight = 0;
  });

  scriptAst.tokens.forEach((token: TokenData) => {
    if (token.type === Token.Character) {
      doc.moveDown(LINE_HEIGHT);

      if (doc.y > doc.page.height * 0.85) {
        doc.addPage();
      }

      currentCharacterStartingHeight = doc.y;
      doc
        .font(typeface.regular)
        .text(token.text, MARGIN, doc.y, { width: CHARACTER_WIDTH });

      currentCharacterLowestHeight = doc.y;

      doc
        .font(typeface.regular)
        .text(
          characterCount,
          doc.page.width - MARGIN,
          currentCharacterStartingHeight,
          { width: MARGIN },
        );

      characterCount = characterCount + 1;
      return;
    }

    if (token.type === Token.Note) {
      if (!options.renderNotes) {
        return;
      }

      doc
        .font(typeface.italic)
        .fillColor('#aaaaaa')
        .text(token.text, MARGIN, currentCharacterStartingHeight + 10)
        .fillColor('#000000');
    } else if (token.type === Token.Action) {
      doc
        .font(typeface.regular)
        .text(token.text, MARGIN, currentCharacterStartingHeight + 10, {
          lineGap: TEXT_LINE_HEIGHT,
        });
    } else if (token.type === Token.Parenthetical) {
      doc
        .font(typeface.regular)
        .text(
          token.text.toUpperCase(),
          MARGIN + CHARACTER_WIDTH + MARGIN,
          currentCharacterStartingHeight,
          { width: DIALOGUE_WIDTH, continuous: true },
        );
    } else if (token.type === Token.FX) {
      currentCharacterStartingHeight =
        currentCharacterStartingHeight + LINE_HEIGHT * 12;
      doc
        .font(typeface.bold)
        .text(
          `${(token as any).style}.`,
          MARGIN,
          currentCharacterStartingHeight,
          { width: doc.page.width - MARGIN * 2 },
        );

      doc
        .font(typeface.bold)
        .text(
          token.text,
          MARGIN + CHARACTER_WIDTH + MARGIN,
          currentCharacterStartingHeight,
          { width: DIALOGUE_WIDTH, underline: true },
        );

      doc
        .font(typeface.bold)
        .text(
          characterCount,
          doc.page.width - MARGIN,
          currentCharacterStartingHeight,
          { width: MARGIN },
        );

      characterCount = characterCount + 1;
    } else {
      if (token.text === undefined) {
        return;
      }

      const lines = chunkToLinesForWidth(token.text.split(' '), DIALOGUE_WIDTH, doc.widthOfString.bind(doc))

      lines.forEach((line: string[]) => {
        doc
          .font(typeface.regular)
          .text(
          line.join(' '),
          MARGIN + CHARACTER_WIDTH + MARGIN,
          currentCharacterStartingHeight,
        );

        currentCharacterStartingHeight = currentCharacterStartingHeight + (TEXT_LINE_HEIGHT * 12);
      })

    }

    currentCharacterStartingHeight =
      doc.y > currentCharacterLowestHeight
        ? doc.y
        : currentCharacterLowestHeight;
  });

  doc.end();

  return doc;
}
