#!/usr/bin/env node
import * as fs from 'fs';
import * as chalk from 'chalk';
import * as program from 'commander';
import { generatePDF } from './pdf';
import { parse } from './parser';

console.log(`
   __  _                 __  __         
  / /_(_)___ ___  ____  / /_/ /_  __  __
 / __/ / __ \`__ \\/ __ \\/ __/ __ \\/ / / /
/ /_/ / / / / / / /_/ / /_/ / / / /_/ / 
\\__/_/_/ /_/ /_/\\____/\\__/_/ /_/\\__, /  
                               /____/`);
console.log(chalk`{white.italic.bold Fountain to PDF for sketch comedy.}`);

program
  .version('0.1.0')
  .option('-o, --output [filename]', 'Output file name')
  .option('-N, --with-notes', 'Renders any notes to output')
  .option('-s, --edit-space', 'Adds ample space for edit notes')
  .option('-S, --sans-serif', 'Adds ample space for edit notes')
  .parse(process.argv);

const inputFilename = program.args[0];
const outputFilename = program.output;

const startTime = Date.now();
const scriptFile = fs.readFileSync(inputFilename, 'utf-8');

const scriptAst = parse(scriptFile);
generatePDF(fs.createWriteStream(outputFilename), scriptAst, {
  renderNotes: program.withNotes,
  editSpace: program.editSpace,
  sansSerif: program.sansSerif,
});

const endTime = Date.now();

console.log(
  chalk`Output {blue ${inputFilename}} > {green ${outputFilename}} in {white ${endTime -
    startTime}ms}`,
);
