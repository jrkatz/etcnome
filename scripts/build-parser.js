// Build-parser.js JISON_FILE TARGET_FILE
//
// Read JISON_FILE as jison, generate a parser based on it, then append a
// default export of the parser object to turn the thing into a usable
// es6 module. Write the result to TARGET_FILE

const process = require("process");
const fs = require("fs");
const jison = require("jison");

const jisonSource = fs.readFileSync(process.argv[2], "utf8");
const parser = new jison.Parser(jisonSource);
const parserSource = `${parser.generate()}
const constantParser = parser;
export default constantParser;`;

fs.writeFileSync(process.argv[3], parserSource, "utf8");
