// Etcnome - A programmable metronome
// Copyright (C) 2020  Jacob Katz
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

/* description: Parses etcnome metronome config language 
 * (final name TBD) to an easy-to-read AST
 */

/* lexical grammar */
%lex

%%
[ \t]+             /* skip whitespace */
"//".*             return 'EOL'; /* pretend comments are end-of-lines */
[0-9]+("."[0-9]+)? return 'NUMBER';
\b[Bb][Pp][Mm]\b   return 'BPM';
"*"                return '*';
"x"                return '*';
"/"                return '/'
"("                return '(';
")"                return ')';
"//"               return 'COMMENT';
\n                 return 'EOL';
<<EOF>>            return 'EOF';

/lex

%start track
%{
        let tmp = null;
%}

%% /* language grammar */
/* require a bpm as the first instruction */
track
    : init_bpm eol instructions
        {
        tmp = $3;
        tmp.splice(1, 0, $1);
        return tmp;
        }
    | init_bpm eol
        { return ["instrs", $1]; }
    | eol
        {
        //make empty files valid, if boring.
        return ["instrs"];
        }
    ;

/* allow newlines at the top of the file before the first bpm */
init_bpm
    : eol bpm
        { $$ = $2; }
    | bpm
    ;

/* an instruction that sets the bpm for subsequent instructions in the same scope */
bpm
    : NUMBER BPM
        { $$ = ["bpm", $1]; }
    ;

/* One newline, two newlines, three newlines, end of file... all the same to me. */
eol
    : EOL
    | EOF
    | EOL eol
    ;

/* A list of instructions separated by eols */
instructions
    : instruction eol
        { $$ = [ "instrs", $1 ]; }
    | instruction eol instructions
        { 
          tmp = $3;
          tmp.splice(1, 0, $1);
          $$ = tmp;
        }
    ;

/* A single instruction either produces a section or sets the bpm for subsequent sections in the same scope */
instruction
    : bpm
    | section
    ;

section
    : NUMBER '/' NUMBER 
        { $$ = ["Measure", $1, $3]; }
    | '(' instructions ')'
        { $$ = $2; }
    | '(' eol instructions ')'
        { $$ = $3; }
    | section '*' NUMBER
        { $$ = ["RepeatingSection", $1, $3]; }
    ;
