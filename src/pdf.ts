import { TokenData, Token } from './parser';
const PDFDocument = require('pdfkit');

export function generatePDF(outputStream: any, scriptAst: any) {
  const doc = new PDFDocument({
    size: 'A4',
  });


  const MARGIN = doc.page.width * 0.075;
  const CHARACTER_WIDTH = doc.page.width * 0.175;
  const DIALOGUE_WIDTH = doc.page.width * 0.55;
  const LINE_HEIGHT = 2;

  const typeface = {
    regular: 'fonts/Courier Prime.ttf',
    bold: 'fonts/Courier Prime Bold.ttf',
    italic: 'fonts/Courier Prime Italic.ttf',
    boldItalic: 'fonts/Courier Prime Bold Italic.ttf',
  };

  doc.pipe(outputStream);

  doc.font(typeface.regular)
    .text(scriptAst.metadata.title);

  doc.font(typeface.regular)
    .text(`${scriptAst.metadata.credit} ${scriptAst.metadata.author || scriptAst.metadata.authors}`);

  let currentCharacterStartingHeight = doc.y;
  let characterCount = 1;
  let currentCharacterLowestHeight = 0;

  doc.on('pageAdded', () => {
    currentCharacterStartingHeight = doc.y;
    currentCharacterLowestHeight = 0;
  })

  scriptAst.tokens.forEach((token: TokenData) => {
    if (token.type === Token.Character) {
      doc.moveDown(LINE_HEIGHT);

      if (doc.y > doc.page.height * 0.85) {
        doc.addPage();
      }

      currentCharacterStartingHeight = doc.y;
      doc.font(typeface.regular)
        .text(token.text, MARGIN, doc.y, { width: CHARACTER_WIDTH })

      currentCharacterLowestHeight = doc.y;

      doc.font(typeface.regular)
        .text(characterCount, doc.page.width - MARGIN, currentCharacterStartingHeight, { width: MARGIN })

      characterCount = characterCount + 1;
      return;
    }

    if (token.type === Token.Note) {
      doc.font(typeface.italic)
        .fillColor('#aaaaaa')
        .text(token.text, MARGIN, currentCharacterStartingHeight + 10)
        .fillColor('#000000');
    } else if (token.type === Token.Action) {
      doc.font(typeface.regular)
        .text(token.text, MARGIN, currentCharacterStartingHeight + 10)
    } else if (token.type === Token.Parenthetical) {
      doc.font(typeface.regular)
        .text(token.text.toUpperCase(), MARGIN + CHARACTER_WIDTH + MARGIN, currentCharacterStartingHeight, { width: DIALOGUE_WIDTH, continuous: true });
    } else if (token.type === Token.FX) {
      doc.font(typeface.bold)
        .moveDown(LINE_HEIGHT)
        .text(`${(token as any).style}.  ${' '.repeat(64 - (token.text.length + (token as any).style.length))}${token.text.toUpperCase()} ${characterCount}`, MARGIN, currentCharacterStartingHeight, { width: doc.page.width - MARGIN * 2, underline: true });

      characterCount = characterCount + 1;

    } else {
      doc.font(typeface.regular)
        .text(token.text, MARGIN + CHARACTER_WIDTH + MARGIN, currentCharacterStartingHeight, { width: DIALOGUE_WIDTH, continuous: true });
    }

    currentCharacterStartingHeight = doc.y > currentCharacterLowestHeight ? doc.y : currentCharacterLowestHeight;
  })

  doc.end();

  return doc;
} 