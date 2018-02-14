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
var flatMap = (a: Array<any>, cb: (i: any) => any) => [].concat(...a.map(cb))

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

function drawUnderline(document: any, start: number, end: number) {
  document.save()
  document.strokeColor(document._fillColor);

  const lineWidthUnderline = document._fontSize < 10 ? 0.5 : Math.floor(document._fontSize / 7)
  document.lineWidth(lineWidthUnderline)

  let lineY = document.y - 2;
  
  document.moveTo(start, lineY)
  document.lineTo(end, lineY)
  document.stroke()
  document.restore()
}

export function generatePDF(
  outputStream: any,
  scriptAst: any,
  givenOptions: Partial<RenderOptions> = {},
) {
  const options: RenderOptions = { ...defaultOptions, ...givenOptions };
  const doc = new PDFDocument({
    size: 'A4',
    margin: 55,
  });

  const MARGIN = doc.page.width * 0.09;
  const CHARACTER_WIDTH = doc.page.width * 0.12;
  const DIALOGUE_WIDTH = doc.page.width * 0.4;
  const LINE_HEIGHT = options.editSpace ? 3 : 1.4;
  const TEXT_LINE_HEIGHT = 1.5;

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
      `${scriptAst.metadata.credit || 'by'} ${scriptAst.metadata.author ||
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
    switch (token.type) {
      case Token.Character: {
        
        doc.y = doc.y + (LINE_HEIGHT * 16);

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
        break;
      }
      case Token.Note: {
        if (!options.renderNotes) {
          return;
        }

        doc
          .font(typeface.italic)
          .fillColor('#aaaaaa')
          .text(token.text, MARGIN, currentCharacterStartingHeight + 10)
          .fillColor('#000000');
        break;
      }
      case Token.Action: {
        doc
          .font(typeface.regular)
          .text(token.text, MARGIN, currentCharacterStartingHeight + 10, {
            lineGap: TEXT_LINE_HEIGHT,
            align: 'center',
            width: DIALOGUE_WIDTH
          });
          
        break;
      }
      case Token.Parenthetical: {
        doc
          .font(typeface.regular)
          .text(
            token.text.toUpperCase().replace(/\n/g, ''),
            MARGIN + CHARACTER_WIDTH + MARGIN,
            currentCharacterStartingHeight,
            { width: DIALOGUE_WIDTH, continuous: true },
        );
        currentCharacterStartingHeight = doc.y;
        break;
      }
      case Token.FX: {
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

        const lines = chunkToLinesForWidth(token.text.split(' '), DIALOGUE_WIDTH, doc.widthOfString.bind(doc)).map(m => m.join(' '));

        doc
          .font(typeface.bold)
          .text(
            lines[0],
            MARGIN + CHARACTER_WIDTH + MARGIN,
            currentCharacterStartingHeight,
            { width: DIALOGUE_WIDTH },
        );

        drawUnderline(doc, MARGIN, doc.x + doc.widthOfString(lines[0]));

        doc
          .font(typeface.bold)
          .text(
            characterCount,
            doc.page.width - MARGIN,
            currentCharacterStartingHeight,
            { width: MARGIN },
        );

        characterCount = characterCount + 1;
        break;
      }
      case Token.Dialogue: {
        if (token.text === undefined) {
          return;
        }

        const lines = flatMap(token.text.split('\n'), l => chunkToLinesForWidth(l.split(' '), DIALOGUE_WIDTH, doc.widthOfString.bind(doc)))
        console.log(lines);
        lines.forEach((line: string[]) => {
          doc
            .font(typeface.regular)
            .text(
              line.join(' '),
              MARGIN + CHARACTER_WIDTH + MARGIN,
              currentCharacterStartingHeight,
          );

          currentCharacterStartingHeight = currentCharacterStartingHeight + (TEXT_LINE_HEIGHT * 12);
        });

        currentCharacterStartingHeight =
          doc.y > currentCharacterLowestHeight
            ? doc.y
            : currentCharacterLowestHeight;
        break;
      }
      case 'dialogue_begin': break;
      case 'dialogue_end': break;
      default: {
        console.warn(`[issue] Token: ${token.type} is not handled during render`);
      }
    }
 });

  doc.end();

  return doc;
}
